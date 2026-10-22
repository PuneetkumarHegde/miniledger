import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. No session token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phoneNumber: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account not found or has been deactivated',
      });
      return;
    }

    req.user = {
      userId: user.id,
      phoneNumber: user.phoneNumber,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid or corrupted session token. Please log in again.',
    });
  }
}
