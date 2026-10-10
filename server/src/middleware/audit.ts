import { Request, Response, NextFunction } from 'express';
import { AuditEvent, AuditOutcome } from '../models/AuditEvent.js';

export function formatAuditDate(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}

export interface AuditParams {
  actorId?: any;
  actor: string;
  actorRole: string;
  org?: string;
  orgId?: any;
  patientId?: any;
  action: string;
  resource: string;
  resourceType?: string;
  resourceId?: string;
  purpose?: string;
  outcome: AuditOutcome;
  ip?: string;
}

export async function createAuditEvent(params: AuditParams): Promise<void> {
  try {
    await AuditEvent.create({
      actorId: params.actorId,
      actor: params.actor,
      actorRole: params.actorRole,
      org: params.org || '—',
      orgId: params.orgId,
      patientId: params.patientId,
      action: params.action,
      resource: params.resource,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      purpose: params.purpose,
      outcome: params.outcome,
      ip: params.ip || '127.0.0.1',
      ts: formatAuditDate(),
      at: new Date()
    });
  } catch (error) {
    // Append-only audit logger should log to stderr but never crash user flow
    console.error('[Audit Logger Error]', error);
  }
}

/**
 * Audit middleware that logs access upon response completion
 */
export function auditLog(options: {
  action: string;
  resource: string;
  resourceType?: string;
  defaultOutcome?: AuditOutcome;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', async () => {
      // Determine outcome from HTTP status code
      let outcome: AuditOutcome = options.defaultOutcome || 'granted';
      if (res.statusCode >= 400 && res.statusCode < 500) {
        outcome = 'denied';
      } else if (res.statusCode >= 500) {
        outcome = 'failure';
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        outcome = options.defaultOutcome || 'granted';
      }

      const user = req.user;
      const actorName = user ? user.name : 'unknown';
      const actorRole = user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Anonymous';
      const patientId = req.params.patientId || req.params.id || user?.linkedPatientId;

      await createAuditEvent({
        actorId: user?._id,
        actor: actorName,
        actorRole: actorRole,
        orgId: user?.orgId,
        patientId: patientId,
        action: options.action,
        resource: options.resource,
        resourceType: options.resourceType,
        outcome: outcome,
        ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress
      });
    });

    next();
  };
}
