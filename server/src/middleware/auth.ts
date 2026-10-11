import { Request, Response, NextFunction } from 'express';
import { User, IUser, UserRole } from '../models/User.js';
import { clerkClient } from '../config/clerk.js';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

async function attachLinkedProfiles(user: IUser): Promise<void> {
  try {
    if (user.role === 'PATIENT' && !user.linkedPatientId) {
      const { Patient } = await import('../models/Patient.js');
      const patient = await Patient.findOne({
        $or: [
          { identifiers: user.email },
          { identifiers: user.email?.toLowerCase() },
          { name: user.name }
        ]
      }) || await Patient.findOne();
      if (patient) {
        user.linkedPatientId = patient._id;
        await User.findByIdAndUpdate(user._id, { linkedPatientId: patient._id });
      }
    } else if (user.role === 'CLINICIAN' && !user.linkedPractitionerId) {
      const { Practitioner } = await import('../models/Practitioner.js');
      const pract = await Practitioner.findOne({
        $or: [
          { identifiers: user.email },
          { identifiers: user.email?.toLowerCase() },
          { name: new RegExp((user.name || '').replace(/Dr\.\s*/i, ''), 'i') }
        ]
      }) || await Practitioner.findOne();
      if (pract) {
        user.linkedPractitionerId = pract._id;
        await User.findByIdAndUpdate(user._id, { linkedPractitionerId: pract._id });
      }
    }
  } catch (err) {
    console.warn('[Auth] attachLinkedProfiles non-fatal error:', err);
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const devUserId = req.headers['x-dev-user-id'] as string | undefined;

  // 1. DEV_PREVIEW mode check (Strictly disabled in production)
  if (config.DEV_PREVIEW && !config.isProduction && devUserId) {
    let user: IUser | null = null;
    // Look up by _id or email or clerkUserId
    if (devUserId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(devUserId);
    } else {
      user = await User.findOne({
        $or: [
          { clerkUserId: devUserId },
          { email: devUserId }
        ]
      });
    }

    if (user && user.status === 'Active') {
      await attachLinkedProfiles(user);
      req.user = user;
      return next();
    } else if (user && user.status === 'Suspended') {
      return next(new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended'));
    }
  }

  // 2. Bearer Token Check
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid authorization token'));
  }

  const token = authHeader.split(' ')[1];

  // Check for DEV_PREVIEW bearer token (e.g., Bearer dev:u1 or dev-token:<role>)
  if (config.DEV_PREVIEW && !config.isProduction && token.startsWith('dev:')) {
    const identifier = token.slice(4);
    let user: IUser | null = null;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(identifier);
    }
    if (!user) {
      user = await User.findOne({
        $or: [
          { clerkUserId: identifier },
          { email: identifier },
          { email: identifier.toLowerCase() }
        ]
      });
    }

    if (user && user.status === 'Active') {
      await attachLinkedProfiles(user);
      req.user = user;
      return next();
    }
    return next(new AppError(401, 'UNAUTHENTICATED', 'Dev preview identity not found'));
  }

  // 3. Clerk JWT Verification
  if (!clerkClient) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication provider not configured'));
  }

  try {
    const verified: any = await (clerkClient as any).verifyToken(token);
    if (!verified || !verified.sub) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Token verification failed or expired'));
    }

    const user = await User.findOne({ clerkUserId: verified.sub });
    if (!user) {
      return next(new AppError(401, 'USER_NOT_SYNCED', 'User not found in local directory. Please sync user first.'));
    }

    if (user.status === 'Suspended') {
      return next(new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended'));
    }

    await attachLinkedProfiles(user);
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired session token'));
  }
}
