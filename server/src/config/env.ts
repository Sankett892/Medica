import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/hackmatrix'),
  CLERK_SECRET_KEY: z.string().optional().default('sk_test_placeholder'),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default('pk_test_placeholder'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:8080'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(500),
  RATE_LIMIT_QR_MAX: z.coerce.number().default(500),
  ANALYTICS_K_THRESHOLD: z.coerce.number().default(5),
  DEV_PREVIEW: z.enum(['true', 'false']).transform(v => v === 'true').default('true')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment validation failed');
}

export const config = {
  ...parsed.data,
  corsOriginsList: parsed.data.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test'
};

export type AppConfig = typeof config;
