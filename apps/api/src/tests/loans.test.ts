import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

describe('Loan APIs, Validation & Summary Calculations', () => {
  const testPhoneA = '+919999900001';
  const testPhoneB = '+919999900002';
  let userA: { id: string; phoneNumber: string };
  let userB: { id: string; phoneNumber: string };
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    // Clean up only test users and their loans
    await prisma.loan.deleteMany({
      where: { user: { phoneNumber: { in: [testPhoneA, testPhoneB] } } },
    });
    await prisma.user.deleteMany({
      where: { phoneNumber: { in: [testPhoneA, testPhoneB] } },
    });

    userA = await prisma.user.create({
      data: { phoneNumber: testPhoneA },
    });
    userB = await prisma.user.create({
      data: { phoneNumber: testPhoneB },
    });

    tokenA = signToken({ userId: userA.id, phoneNumber: userA.phoneNumber });
    tokenB = signToken({ userId: userB.id, phoneNumber: userB.phoneNumber });
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

  describe('POST /api/loans - Validation & Creation', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/loans')
        .send({ friendName: 'Rahul', amount: 500, dueDate: '2026-11-01' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid amount <= 0 and blank friendName', async () => {
      const resZeroAmount = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Rahul', amount: 0, dueDate: '2026-11-01' });

      expect(resZeroAmount.status).toBe(400);

      const resBlankName = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: '   ', amount: 500, dueDate: '2026-11-01' });

      expect(resBlankName.status).toBe(400);
    });

    it('should create a loan successfully with exact decimal representation', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          friendName: 'Aarav Sharma',
          amount: 1250.50,
          dueDate: '2026-11-15T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.friendName).toBe('Aarav Sharma');
      expect(res.body.data.amount).toBe('1250.50');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.userId).toBe(userA.id);
    });
  });

  describe('GET /api/loans - User Scoping & Tenant Isolation', () => {
    it('should only return loans belonging to the authenticated user', async () => {
      // Create loan for User A
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Priya', amount: 400, dueDate: '2026-11-01' });

      // Create loan for User B
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ friendName: 'Vikram', amount: 900, dueDate: '2026-11-02' });

      // User A requests loans
      const resA = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data).toHaveLength(1);
      expect(resA.body.data[0].friendName).toBe('Priya');
      expect(resA.body.data[0].amount).toBe('400.00');

      // User B requests loans
      const resB = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data).toHaveLength(1);
      expect(resB.body.data[0].friendName).toBe('Vikram');
    });
  });

  describe('PATCH /api/loans/:id/repay - Repayment & Security', () => {
    it('should mark a pending loan as repaid and record timestamp', async () => {
      const createRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Rohan', amount: 800, dueDate: '2026-11-01' });

      const loanId = createRes.body.data.id;

      const repayRes = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(repayRes.status).toBe(200);
      expect(repayRes.body.data.status).toBe('REPAID');
      expect(repayRes.body.data.repaidAt).toBeDefined();

      // Ensure duplicate repayment is prevented to avoid corrupting financial totals
      const duplicateRes = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.error).toMatch(/already marked as repaid/i);
    });

    it('should forbid User B from repaying User A\'s loan', async () => {
      const createRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Simran', amount: 350, dueDate: '2026-11-01' });

      const loanId = createRes.body.data.id;

      const unauthorizedRes = await request(app)
        .patch(`/api/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(unauthorizedRes.status).toBe(403);
    });
  });

  describe('GET /api/loans/summary - Exact Decimal Calculations & Overdue Policy', () => {
    it('should compute exact decimal totals for totalLent, totalRepaid, and overdueAmount', async () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 days ago
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 5 days ahead

      // Loan 1: Overdue pending loan (500.25)
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Ankit', amount: 500.25, dueDate: pastDate });

      // Loan 2: Past due but already repaid loan (300.50)
      const loan2Res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Neha', amount: 300.50, dueDate: pastDate });

      await request(app)
        .patch(`/api/loans/${loan2Res.body.data.id}/repay`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Loan 3: Future pending loan (200.25)
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Karan', amount: 200.25, dueDate: futureDate });

      const summaryRes = await request(app)
        .get('/api/loans/summary')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.totalLent).toBe('1001.00'); // 500.25 + 300.50 + 200.25
      expect(summaryRes.body.data.totalRepaid).toBe('300.50'); // loan 2
      expect(summaryRes.body.data.overdueAmount).toBe('500.25'); // loan 1 only
    });
  });
});
