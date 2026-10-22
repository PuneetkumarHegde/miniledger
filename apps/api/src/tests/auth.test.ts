import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashOtp } from '../lib/crypto.js';

describe('Authentication Flow & Security Tests', () => {
  const testPhone = '+919876500001';

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.loan.deleteMany({ where: { user: { phoneNumber: testPhone } } });
    await prisma.otp.deleteMany({ where: { phoneNumber: testPhone } });
    await prisma.user.deleteMany({ where: { phoneNumber: testPhone } });
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({ where: { user: { phoneNumber: testPhone } } });
    await prisma.otp.deleteMany({ where: { phoneNumber: testPhone } });
    await prisma.user.deleteMany({ where: { phoneNumber: testPhone } });
    await prisma.$disconnect();
  });

  it('should request an OTP and store only its SHA-256 hash', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phoneNumber: '9876500001' }); // Tests normalization

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.expiresInSeconds).toBe(300);

    const otpRecord = await prisma.otp.findFirst({
      where: { phoneNumber: testPhone, consumedAt: null },
    });
    expect(otpRecord).toBeDefined();
    expect(otpRecord?.codeHash).toHaveLength(64); // SHA-256 hex string length
  });

  it('should reject invalid phone numbers', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phoneNumber: 'abc-123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should fail verification if wrong OTP is provided and track attempt count', async () => {
    // Generate valid OTP
    await request(app)
      .post('/api/auth/request-otp')
      .send({ phoneNumber: testPhone });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: testPhone, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid OTP/);

    const record = await prisma.otp.findFirst({
      where: { phoneNumber: testPhone },
      orderBy: { createdAt: 'desc' },
    });
    expect(record?.attemptCount).toBe(1);
  });

  it('should successfully verify OTP, create user, return JWT, and enforce one-time use', async () => {
    const testCode = '654321';
    const testHash = hashOtp(testCode);

    // Pre-insert valid OTP record
    await prisma.otp.create({
      data: {
        phoneNumber: testPhone,
        codeHash: testHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: testPhone, otp: testCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.user.phoneNumber).toBe(testPhone);

    const token = verifyRes.body.token;

    // Test /api/auth/me with session token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.phoneNumber).toBe(testPhone);

    // Attempting to reuse the same OTP must fail (one-time-use)
    const reuseRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: testPhone, otp: testCode });

    expect(reuseRes.status).toBe(400);
  });

  it('should reject expired OTPs', async () => {
    const testCode = '112233';
    const testHash = hashOtp(testCode);

    // Create an expired OTP (expired 10 minutes ago)
    await prisma.otp.create({
      data: {
        phoneNumber: testPhone,
        codeHash: testHash,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: testPhone, otp: testCode });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });
});
