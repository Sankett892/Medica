import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { v1Router } from './routes.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { globalRateLimiter } from './middleware/rateLimit.js';

export function createApp(): express.Application {
  const app = express();

  // Security Headers (relaxed CSP for local scripts/cdn/styles in prototype)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOriginsList.includes(origin) || !config.isProduction) {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-user-id']
    })
  );

  // Body parser with safe limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global rate limiter
  app.use(globalRateLimiter);

  // Health endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'hackmatrix-server',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API v1
  app.use('/api/v1', v1Router);

  // Serve Front-End Portal and PWA assets directly on Port 4000 (Same-Origin!)
  const frontendDir = path.resolve(process.cwd(), 'patient.html')
    ? (path.resolve(process.cwd(), 'server') ? process.cwd() : path.resolve(process.cwd(), '..'))
    : path.resolve(process.cwd(), '..');
  app.use(express.static(frontendDir));
  app.use(express.static(path.resolve(process.cwd(), '..')));

  // 404 handler
  app.use((req: Request, res: Response, next) => {
    next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
