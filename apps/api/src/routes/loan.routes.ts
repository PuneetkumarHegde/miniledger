import { Router, Request, Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service.js';
import { createLoanSchema, loanIdParamSchema } from '../validators/loan.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication to all loan endpoints
router.use(authenticate);

// GET /api/loans/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await LoanService.getSummary(req.user!.userId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/loans
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loans = await LoanService.getLoans(req.user!.userId);
    res.status(200).json({
      success: true,
      data: loans,
      count: loans.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/loans
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createLoanSchema.parse(req.body);
    const loan = await LoanService.createLoan(req.user!.userId, validated);
    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/loans/:id/repay
router.patch('/:id/repay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = loanIdParamSchema.parse(req.params);
    const updatedLoan = await LoanService.repayLoan(req.user!.userId, id);
    res.status(200).json({
      success: true,
      message: 'Loan successfully marked as repaid',
      data: updatedLoan,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
