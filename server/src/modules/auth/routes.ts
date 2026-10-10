import { Router } from 'express';
import { getMe, syncUser, login, register } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.post('/sync-user', authRateLimiter, syncUser);
router.post('/login', authRateLimiter, login);
router.post('/register', authRateLimiter, register);

export const authRouter = router;
