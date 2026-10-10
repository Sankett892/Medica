import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later'
    }
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_AUTH_REQUESTS',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});

export const qrRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: config.RATE_LIMIT_QR_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_QR_REQUESTS',
      message: 'Too many QR requests, please wait before generating or scanning again'
    }
  }
});
