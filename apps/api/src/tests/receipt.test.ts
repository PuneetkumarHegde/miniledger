import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

describe('Receipt Upload Bonus & Security Tests', () => {
  const testPhoneA = '+919999900010';
  const testPhoneB = '+919999900020';
  let userA: { id: string };
  let userB: { id: string };
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    await prisma.loan.deleteMany({
      where: { user: { phoneNumber: { in: [testPhoneA, testPhoneB] } } },
    });
    await prisma.user.deleteMany({
      where: { phoneNumber: { in: [testPhoneA, testPhoneB] } },
    });

    userA = await prisma.user.create({ data: { phoneNumber: testPhoneA } });
    userB = await prisma.user.create({ data: { phoneNumber: testPhoneB } });

    tokenA = signToken({ userId: userA.id, phoneNumber: testPhoneA });
    tokenB = signToken({ userId: userB.id, phoneNumber: testPhoneB });
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({
      where: { user: { phoneNumber: { in: [testPhoneA, testPhoneB] } } },
    });
    await prisma.user.deleteMany({
      where: { phoneNumber: { in: [testPhoneA, testPhoneB] } },
    });
    await prisma.$disconnect();
  });

  it('should upload a receipt image with metadata', async () => {
    const fakeImageBuffer = Buffer.from('fake-image-content-for-testing');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('receipt', fakeImageBuffer, {
        filename: 'receipt.png',
        contentType: 'image/png',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.fileUrl).toContain('/api/upload/receipts/');
    expect(uploadRes.body.data.originalName).toBe('receipt.png');

    const filename = uploadRes.body.data.filename;

    // Attach receipt to a loan created by User A
    const loanRes = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        friendName: 'Deepak',
        amount: 1500,
        dueDate: '2026-11-20',
        receiptUrl: uploadRes.body.data.fileUrl,
        receiptOriginalName: uploadRes.body.data.originalName,
      });

    expect(loanRes.status).toBe(201);
    expect(loanRes.body.data.receiptUrl).toBe(uploadRes.body.data.fileUrl);

    // User A can access their receipt
    const getResA = await request(app)
      .get(`/api/upload/receipts/${filename}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(getResA.status).toBe(200);

    // Unauthenticated request is rejected
    const unauthRes = await request(app)
      .get(`/api/upload/receipts/${filename}`);

    expect(unauthRes.status).toBe(401);
  });
});
