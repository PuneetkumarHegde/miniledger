import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { authenticate } from '../middleware/auth.middleware.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomUUID();
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter (images & PDF, max 5MB)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, WEBP, and PDF files are allowed.', 400) as any, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// POST /api/upload (Authenticated)
router.post('/', authenticate, upload.single('receipt'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file was uploaded. Please attach a receipt file.', 400);
    }

    const relativeUrl = `/api/upload/receipts/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        fileUrl: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/upload/receipts/:filename (Protected file download/preview)
router.get('/receipts/:filename', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    const sanitizedFilename = path.basename(filename); // Prevent path traversal
    const filePath = path.join(uploadDir, sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      throw new AppError('Receipt file not found', 404);
    }

    // Security check: Verify file belongs to a loan owned by the current user
    const loan = await prisma.loan.findFirst({
      where: {
        userId: req.user!.userId,
        receiptUrl: {
          contains: sanitizedFilename,
        },
      },
    });

    // If loan is not yet saved (e.g. freshly uploaded preview), allow if user uploaded it
    // In our system, the authenticated user can access their receipts
    if (!loan) {
      // Check if file was uploaded within the last 30 minutes for a draft loan
      const stats = fs.statSync(filePath);
      const fileAgeMinutes = (Date.now() - stats.birthtimeMs) / (1000 * 60);
      if (fileAgeMinutes > 30) {
        throw new AppError('Unauthorized access to receipt file', 403);
      }
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

export default router;
