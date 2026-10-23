import path from 'node:path';
import fs from 'node:fs';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import loanRoutes from './routes/loan.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

export const app: Application = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow Expo mobile client, web, and emulators
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Respond to all preflight OPTIONS requests immediately with 204
app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// Normalizer: strip any serverless function path wrappers like /index.ts or [...slug]
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url.startsWith('/index.ts')) {
    req.url = req.url.replace(/^\/index\.ts/, '') || '/';
  } else if (req.url.startsWith('/api/index.ts')) {
    req.url = req.url.replace(/^\/api\/index\.ts/, '') || '/';
  }

  if (req.query && (req.query.slug || req.query['slug[]'])) {
    const rawSlug = req.query.slug || req.query['slug[]'];
    const slugStr = Array.isArray(rawSlug) ? rawSlug.join('/') : String(rawSlug);
    req.url = `/api/${slugStr.replace(/^\/+/, '')}`;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'MiniLedger API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (Mounted both with and without /api prefix for full compatibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/loans', loanRoutes);
app.use('/loans', loanRoutes);

app.use('/api/upload', uploadRoutes);
app.use('/upload', uploadRoutes);

// Static Web Files (Expo Web Build)
const distPath = path.resolve(process.cwd(), 'apps/mobile/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 404 Catch-All for API routes (only for unmatched API routes)
app.use(['/api', '/auth', '/loans', '/upload'], (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API route not found',
  });
});

// SPA Fallback for Web Frontend
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('MiniLedger API is running. Build web assets with npm run build.');
  }
});

// Centralized Error Handling
app.use(errorHandler);

export default app;
