import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { isLoanOverdue } from '../lib/dateUtils.js';
import { CreateLoanInput } from '../validators/loan.validator.js';

export class LoanService {
  /**
   * Retrieves all loans belonging to the authenticated user, newest first.
   * Dynamically evaluates `isOverdue` status for pending loans.
   */
  static async getLoans(userId: string) {
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return loans.map((loan) => {
      const isOverdue = loan.status === 'PENDING' && isLoanOverdue(loan.dueDate, now);
      return {
        id: loan.id,
        userId: loan.userId,
        friendName: loan.friendName,
        amount: loan.amount.toFixed(2),
        dueDate: loan.dueDate.toISOString(),
        status: loan.status,
        repaidAt: loan.repaidAt ? loan.repaidAt.toISOString() : null,
        isOverdue,
        receiptUrl: loan.receiptUrl,
        receiptOriginalName: loan.receiptOriginalName,
        receiptMimeType: loan.receiptMimeType,
        receiptSize: loan.receiptSize,
        createdAt: loan.createdAt.toISOString(),
        updatedAt: loan.updatedAt.toISOString(),
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

    const loan = await prisma.loan.create({
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

    const isOverdue = isLoanOverdue(loan.dueDate, new Date());

    return {
      id: loan.id,
      userId: loan.userId,
      friendName: loan.friendName,
      amount: loan.amount.toFixed(2),
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
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new AppError('Loan not found', 404);
    }

    // Tenant isolation: verify user ownership
    if (loan.userId !== userId) {
      throw new AppError('Unauthorized: You do not have permission to modify this loan', 403);
    }

    // Prevent duplicate repayment operations from corrupting totals
    if (loan.status === 'REPAID') {
      throw new AppError(
        `Loan is already marked as repaid on ${loan.repaidAt ? loan.repaidAt.toISOString() : 'earlier date'}. Duplicate repayment is prohibited.`,
        400
      );
    }

    const repaidAt = new Date();

    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: 'REPAID',
        repaidAt,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      friendName: updated.friendName,
      amount: updated.amount.toFixed(2),
      dueDate: updated.dueDate.toISOString(),
      status: updated.status,
      repaidAt: updated.repaidAt!.toISOString(),
      isOverdue: false,
      receiptUrl: updated.receiptUrl,
      receiptOriginalName: updated.receiptOriginalName,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Computes summary metrics using exact Prisma Decimal arithmetic:
   * - totalLent: sum of all loans
   * - totalRepaid: sum of repaid loans
   * - overdueAmount: sum of pending loans whose due date has passed
   */
  static async getSummary(userId: string) {
    const loans = await prisma.loan.findMany({
      where: { userId },
      select: {
        amount: true,
        dueDate: true,
        status: true,
      },
    });

    let totalLent = new Prisma.Decimal(0);
    let totalRepaid = new Prisma.Decimal(0);
    let overdueAmount = new Prisma.Decimal(0);

    const now = new Date();

    for (const loan of loans) {
      totalLent = totalLent.plus(loan.amount);

      if (loan.status === 'REPAID') {
        totalRepaid = totalRepaid.plus(loan.amount);
      } else if (loan.status === 'PENDING') {
        if (isLoanOverdue(loan.dueDate, now)) {
          overdueAmount = overdueAmount.plus(loan.amount);
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
