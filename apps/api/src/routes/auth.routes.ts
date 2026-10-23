import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { requestOtpSchema, verifyOtpSchema } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Handle preflight OPTIONS for auth routes
router.options('*', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// POST /api/auth/request-otp (with aliases)
router.post(['/request-otp', '/otp/request', '/otp'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = requestOtpSchema.parse(req.body);
    const result = await AuthService.requestOtp(validated.phoneNumber);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-otp (with aliases)
router.post(['/verify-otp', '/otp/verify', '/verify'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = verifyOtpSchema.parse(req.body);
    const result = await AuthService.verifyOtp(validated.phoneNumber, validated.otp);
    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
