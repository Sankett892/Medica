import { Types } from 'mongoose';
import { ConsentGrant, IConsentGrant, GrantStatus } from '../../models/ConsentGrant.js';
import { CreateGrantInput } from './schema.js';
import { formatAuditDate, createAuditEvent } from '../../middleware/audit.js';
import { emitConsentEvent } from '../../config/socket.js';
import { AppError } from '../../middleware/errorHandler.js';

export class ConsentService {
  async getGrantsForPatient(patientId: Types.ObjectId, tab?: string) {
    const now = new Date();

    // First auto-expire any active grants past expiration
    await ConsentGrant.updateMany(
      { patientId, status: 'active', expiresAt: { $lte: now } },
      { $set: { status: 'expired' } }
    );

    let query: any = { patientId };
    if (tab === 'active') {
      query.status = 'active';
    } else if (tab === 'pending') {
      query.status = 'pending';
    } else if (tab === 'closed') {
      query.status = { $in: ['expired', 'revoked'] };
    }

    const grants = await ConsentGrant.find(query).sort({ createdAt: -1 });

    return grants.map(g => ({
      id: g._id.toString(),
      recipient: g.recipient,
      role: g.role,
      org: g.org,
      scope: g.scope,
      purpose: g.purpose,
      start: g.start,
      expires: g.expires,
      status: g.status,
      expiresAt: g.expiresAt
    }));
  }

  async getGrantById(patientId: Types.ObjectId, grantId: string) {
    if (!Types.ObjectId.isValid(grantId)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid grant ID format');
    }

    const grant = await ConsentGrant.findOne({ _id: new Types.ObjectId(grantId), patientId });
    if (!grant) {
      throw new AppError(404, 'GRANT_NOT_FOUND', 'Consent grant not found');
    }

    // Auto-expire check
    if (grant.status === 'active' && grant.expiresAt <= new Date()) {
      grant.status = 'expired';
      await grant.save();
    }

    return {
      id: grant._id.toString(),
      recipient: grant.recipient,
      role: grant.role,
      org: grant.org,
      scope: grant.scope,
      purpose: grant.purpose,
      start: grant.start,
      expires: grant.expires,
      status: grant.status,
      expiresAt: grant.expiresAt
    };
  }

  async createGrant(patientId: Types.ObjectId, userId: Types.ObjectId, userName: string, input: CreateGrantInput) {
    const now = new Date();
    const days = input.validityDays || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const startStr = formatAuditDate(now);
    const expiresStr = formatAuditDate(expiresAt);

    let orgObjectId: Types.ObjectId | undefined;
    if (input.orgId && Types.ObjectId.isValid(input.orgId)) {
      orgObjectId = new Types.ObjectId(input.orgId);
    }

    const grant = await ConsentGrant.create({
      patientId,
      recipient: input.recipient,
      role: input.role,
      org: input.org,
      orgId: orgObjectId,
      scope: input.scope,
      purpose: input.purpose,
      start: startStr,
      expires: expiresStr,
      status: 'active',
      grantedAt: now,
      expiresAt,
      createdBy: userId
    });

    // Audit log
    await createAuditEvent({
      actorId: userId,
      actor: userName,
      actorRole: 'Patient',
      patientId,
      action: 'Created access grant',
      resource: input.recipient,
      resourceType: 'ConsentGrant',
      resourceId: grant._id.toString(),
      purpose: input.purpose,
      outcome: 'granted'
    });

    emitConsentEvent(patientId.toString(), 'grant:created', { grantId: grant._id });

    return {
      id: grant._id.toString(),
      recipient: grant.recipient,
      role: grant.role,
      org: grant.org,
      scope: grant.scope,
      purpose: grant.purpose,
      start: grant.start,
      expires: grant.expires,
      status: grant.status
    };
  }

  async revokeGrant(patientId: Types.ObjectId, grantId: string, userId: Types.ObjectId, userName: string) {
    if (!Types.ObjectId.isValid(grantId)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid grant ID format');
    }

    const grant = await ConsentGrant.findOne({ _id: new Types.ObjectId(grantId), patientId });
    if (!grant) {
      throw new AppError(404, 'GRANT_NOT_FOUND', 'Consent grant not found');
    }

    grant.status = 'revoked';
    grant.revokedAt = new Date();
    grant.expires = 'Revoked just now';
    await grant.save();

    // Audit log
    await createAuditEvent({
      actorId: userId,
      actor: userName,
      actorRole: 'Patient',
      patientId,
      action: 'Revoked access grant',
      resource: grant.recipient,
      resourceType: 'ConsentGrant',
      resourceId: grant._id.toString(),
      outcome: 'revoked'
    });

    emitConsentEvent(patientId.toString(), 'grant:revoked', { grantId: grant._id });

    return {
      id: grant._id.toString(),
      recipient: grant.recipient,
      status: grant.status,
      expires: grant.expires
    };
  }
}

export const consentService = new ConsentService();
