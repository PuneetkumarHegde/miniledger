import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 chars long').default('supersecret_jwt_key_miniledger_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OTP_EXPIRY_MINUTES: z.string().default('5').transform((v) => parseInt(v, 10)),
  MAX_OTP_ATTEMPTS: z.string().default('5').transform((v) => parseInt(v, 10)),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
