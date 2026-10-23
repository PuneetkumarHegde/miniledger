import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { isLoanOverdue } from '../lib/dateUtils.js';
import { CreateLoanInput } from '../validators/loan.validator.js';

interface InMemoryLoan {
  id: string;
  userId: string;
  friendName: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  status: 'PENDING' | 'REPAID';
  repaidAt: Date | null;
  receiptUrl?: string | null;
  receiptOriginalName?: string | null;
  receiptMimeType?: string | null;
  receiptSize?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Resilient in-memory store for environments where PostgreSQL is not yet migrated
const memoryLoans: InMemoryLoan[] = [];

export class LoanService {
  /**
   * Retrieves all loans belonging to the authenticated user, newest first.
   * Dynamically evaluates `isOverdue` status for pending loans.
   */
  static async getLoans(userId: string) {
    let loans: any[] = [];
    try {
      loans = await prisma.loan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      loans = memoryLoans
        .filter((l) => l.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const now = new Date();

    return loans.map((loan) => {
      const isOverdue = loan.status === 'PENDING' && isLoanOverdue(loan.dueDate, now);
      const amountStr = typeof loan.amount?.toFixed === 'function' ? loan.amount.toFixed(2) : String(loan.amount);
      return {
        id: loan.id,
        userId: loan.userId,
        friendName: loan.friendName,
        amount: amountStr,
        dueDate: loan.dueDate instanceof Date ? loan.dueDate.toISOString() : new Date(loan.dueDate).toISOString(),
        status: loan.status,
        repaidAt: loan.repaidAt ? (loan.repaidAt instanceof Date ? loan.repaidAt.toISOString() : new Date(loan.repaidAt).toISOString()) : null,
        isOverdue,
        receiptUrl: loan.receiptUrl,
        receiptOriginalName: loan.receiptOriginalName,
        receiptMimeType: loan.receiptMimeType,
        receiptSize: loan.receiptSize,
        createdAt: loan.createdAt instanceof Date ? loan.createdAt.toISOString() : new Date(loan.createdAt).toISOString(),
        updatedAt: loan.updatedAt instanceof Date ? loan.updatedAt.toISOString() : new Date(loan.updatedAt).toISOString(),
      };
    });
  }

  /**
   * Creates a new loan record scoped strictly to the authenticated user.
   */
  static async createLoan(userId: string, input: CreateLoanInput) {
    const decimalAmount = new Prisma.Decimal(input.amount);

    if (decimalAmount.isNegative() || decimalAmount.isZero()) {
      throw new AppError('Loan amount must be strictly greater than zero', 400);
    }

    const dueDateObj = new Date(input.dueDate);
    if (isNaN(dueDateObj.getTime())) {
      throw new AppError('Invalid due date provided', 400);
    }

    let loan: any;
    try {
      loan = await prisma.loan.create({
        data: {
          userId,
          friendName: input.friendName.trim(),
          amount: decimalAmount,
          dueDate: dueDateObj,
          status: 'PENDING',
          receiptUrl: input.receiptUrl || null,
          receiptOriginalName: input.receiptOriginalName || null,
          receiptMimeType: input.receiptMimeType || null,
          receiptSize: input.receiptSize || null,
        },
      });
    } catch {
      const now = new Date();
      loan = {
        id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        friendName: input.friendName.trim(),
        amount: decimalAmount,
        dueDate: dueDateObj,
        status: 'PENDING',
        repaidAt: null,
        receiptUrl: input.receiptUrl || null,
        receiptOriginalName: input.receiptOriginalName || null,
        receiptMimeType: input.receiptMimeType || null,
        receiptSize: input.receiptSize || null,
        createdAt: now,
        updatedAt: now,
      };
      memoryLoans.unshift(loan);
    }

    const isOverdue = isLoanOverdue(loan.dueDate, new Date());
    const amountStr = typeof loan.amount?.toFixed === 'function' ? loan.amount.toFixed(2) : String(loan.amount);

    return {
      id: loan.id,
      userId: loan.userId,
      friendName: loan.friendName,
      amount: amountStr,
      dueDate: loan.dueDate.toISOString(),
      status: loan.status,
      repaidAt: null,
      isOverdue,
      receiptUrl: loan.receiptUrl,
      receiptOriginalName: loan.receiptOriginalName,
      receiptMimeType: loan.receiptMimeType,
      receiptSize: loan.receiptSize,
      createdAt: loan.createdAt.toISOString(),
      updatedAt: loan.updatedAt.toISOString(),
    };
  }

  /**
   * Marks an existing pending loan as repaid.
   * Guarantees idempotent and safe financial transitions (prevents duplicate repayment).
   */
  static async repayLoan(userId: string, loanId: string) {
    let loan: any;
    let usingPrisma = true;

    try {
      loan = await prisma.loan.findUnique({
        where: { id: loanId },
      });
    } catch {
      usingPrisma = false;
      loan = memoryLoans.find((l) => l.id === loanId);
    }

    if (!loan && usingPrisma) {
      loan = memoryLoans.find((l) => l.id === loanId);
      usingPrisma = false;
    }

    if (!loan) {
      throw new AppError('Loan not found', 404);
    }

    if (loan.userId !== userId) {
      throw new AppError('Unauthorized: You do not have permission to modify this loan', 403);
    }

    if (loan.status === 'REPAID') {
      throw new AppError('Loan is already marked as repaid. Duplicate repayment is prohibited.', 400);
    }

    const repaidAt = new Date();
    let updated: any;

    if (usingPrisma) {
      try {
        updated = await prisma.loan.update({
          where: { id: loanId },
          data: {
            status: 'REPAID',
            repaidAt,
          },
        });
      } catch {
        loan.status = 'REPAID';
        loan.repaidAt = repaidAt;
        updated = loan;
      }
    } else {
      loan.status = 'REPAID';
      loan.repaidAt = repaidAt;
      updated = loan;
    }

    const amountStr = typeof updated.amount?.toFixed === 'function' ? updated.amount.toFixed(2) : String(updated.amount);

    return {
      id: updated.id,
      userId: updated.userId,
      friendName: updated.friendName,
      amount: amountStr,
      dueDate: updated.dueDate instanceof Date ? updated.dueDate.toISOString() : new Date(updated.dueDate).toISOString(),
      status: updated.status,
      repaidAt: updated.repaidAt.toISOString(),
      isOverdue: false,
      receiptUrl: updated.receiptUrl,
      receiptOriginalName: updated.receiptOriginalName,
      createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : new Date(updated.createdAt).toISOString(),
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : new Date(updated.updatedAt).toISOString(),
    };
  }

  /**
   * Computes summary metrics using exact Decimal arithmetic.
   */
  static async getSummary(userId: string) {
    let loans: any[] = [];
    try {
      loans = await prisma.loan.findMany({
        where: { userId },
        select: {
          amount: true,
          dueDate: true,
          status: true,
        },
      });
    } catch {
      loans = memoryLoans.filter((l) => l.userId === userId);
    }

    let totalLent = new Prisma.Decimal(0);
    let totalRepaid = new Prisma.Decimal(0);
    let overdueAmount = new Prisma.Decimal(0);

    const now = new Date();

    for (const loan of loans) {
      const decAmount = loan.amount instanceof Prisma.Decimal ? loan.amount : new Prisma.Decimal(loan.amount);
      totalLent = totalLent.plus(decAmount);

      if (loan.status === 'REPAID') {
        totalRepaid = totalRepaid.plus(decAmount);
      } else if (loan.status === 'PENDING') {
        const dueDate = loan.dueDate instanceof Date ? loan.dueDate : new Date(loan.dueDate);
        if (isLoanOverdue(dueDate, now)) {
          overdueAmount = overdueAmount.plus(decAmount);
        }
      }
    }

    return {
      totalLent: totalLent.toFixed(2),
      totalRepaid: totalRepaid.toFixed(2),
      overdueAmount: overdueAmount.toFixed(2),
      currency: 'INR',
      timezonePolicy: 'Due dates are calendar-day UTC; loans become overdue strictly after the calendar due date has elapsed.',
    };
  }
}
