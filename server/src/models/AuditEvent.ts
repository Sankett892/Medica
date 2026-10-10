import mongoose, { Schema, Document, Types } from 'mongoose';

export type AuditOutcome = 'granted' | 'denied' | 'success' | 'failure' | 'revoked' | 'expired' | 'pending';

export interface IAuditEvent extends Document {
  actorId?: Types.ObjectId;
  actor: string; // display name e.g. 'Dr. Rohit Verma', 'admin.rao', 'You', 'pipeline-service'
  actorRole: string; // e.g. 'Clinician', 'Admin', 'Patient', 'System'
  org?: string;
  orgId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  action: string; // e.g. 'Viewed records', 'QR identity check', 'Emergency access'
  resource: string; // e.g. 'Allergies, Observations', 'Patient identity', 'Surveillance dataset'
  resourceType?: string;
  resourceId?: string;
  purpose?: string;
  outcome: AuditOutcome;
  ip?: string;
  ts: string; // formatted string e.g. '12 Sep 2026, 16:24'
  at: Date;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    actorId: { type: Schema.Types.ObjectId, index: true },
    actor: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true, trim: true, index: true },
    org: { type: String, trim: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    action: { type: String, required: true, trim: true, index: true },
    resource: { type: String, required: true, trim: true },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    purpose: { type: String, trim: true },
    outcome: {
      type: String,
      required: true,
      enum: ['granted', 'denied', 'success', 'failure', 'revoked', 'expired', 'pending'],
      index: true
    },
    ip: { type: String, trim: true },
    ts: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now, index: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable, no updatedAt!
  }
);

// Indexes
AuditEventSchema.index({ at: -1 });
AuditEventSchema.index({ patientId: 1, at: -1 });
AuditEventSchema.index({ orgId: 1, at: -1 });
AuditEventSchema.index({ actor: 'text', action: 'text', resource: 'text' });

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
