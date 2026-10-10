import { Request, Response, NextFunction } from 'express';
import { authService } from './service.js';
import { syncUserSchema, registerSchema } from './schema.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User identity required');
    }
    const data = await authService.getMe(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = syncUserSchema.parse(req.body);
    const data = await authService.syncUser(parsed);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.parse(req.body);
    const data = await authService.register(parsed);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.login(req.body || {});
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
