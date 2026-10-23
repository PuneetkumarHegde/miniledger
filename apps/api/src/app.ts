import express, { Application, Request, Response } from 'express';
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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'MiniLedger API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Catch-All
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API route not found',
  });
});

// Centralized Error Handling
app.use(errorHandler);

export default app;
