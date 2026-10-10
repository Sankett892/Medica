import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.js';
import { AppError } from './errorHandler.js';

export function allow(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'POLICY_DENIED', `Access forbidden: Required role [${roles.join(', ')}], current role [${req.user.role}]`));
    }

    next();
  };
}

export function patientSelfOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }

  if (req.user.role !== 'PATIENT') {
    return next(new AppError(403, 'POLICY_DENIED', 'This resource is reserved strictly for patients'));
  }

  if (!req.user.linkedPatientId) {
    return next(new AppError(403, 'NO_LINKED_PATIENT', 'User account is not linked to any patient profile'));
  }

  // If a patient ID parameter is present in the route, verify it matches
  const targetPatientId = req.params.patientId || req.params.id;
  if (targetPatientId && targetPatientId !== req.user.linkedPatientId.toString()) {
    return next(new AppError(403, 'POLICY_DENIED', 'Patients may only access their own clinical data'));
  }

  next();
}

export function sameOrgOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }

  // Admin users can inspect cross-org aggregate or admin resources if org is HQ or unassigned
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (!req.user.orgId) {
    return next(new AppError(403, 'NO_ORGANIZATION', 'User is not assigned to any healthcare organization'));
  }

  // If a route specifies orgId in params or body, check match
  const targetOrgId = req.params.orgId || req.body?.orgId;
  if (targetOrgId && targetOrgId !== req.user.orgId.toString()) {
    return next(new AppError(403, 'POLICY_DENIED', 'Access is restricted to your assigned organization'));
  }

  next();
}
