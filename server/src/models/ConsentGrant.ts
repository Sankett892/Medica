import mongoose, { Schema, Document, Types } from 'mongoose';

export type GrantStatus = 'active' | 'pending' | 'expired' | 'revoked';

export interface IConsentGrant extends Document {
  patientId: Types.ObjectId;
  granteeType: 'practitioner' | 'organization';
  granteeId?: Types.ObjectId;
  recipient: string; // e.g. 'Dr. Rohit Verma', 'City Diagnostics'
  role: string; // e.g. 'Emergency physician', 'Laboratory (organization)'
  org: string; // e.g. 'Sunrise Multispecialty Hospital'
  orgId?: Types.ObjectId;
  scope: string[]; // e.g. ['Encounters', 'Observations', 'Allergies', 'Medications']
  purpose: string; // e.g. 'Emergency treatment', 'Ongoing care management'
  start: string; // e.g. '12 Sep 2026, 16:20'
  expires: string; // e.g. '19 Sep 2026, 16:20'
  status: GrantStatus;
  grantedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentGrantSchema = new Schema<IConsentGrant>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    granteeType: { type: String, enum: ['practitioner', 'organization'], default: 'practitioner' },
    granteeId: { type: Schema.Types.ObjectId, index: true },
    recipient: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    org: { type: String, required: true, trim: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    scope: [{ type: String, required: true, trim: true }],
    purpose: { type: String, required: true, trim: true },
    start: { type: String, required: true, trim: true },
    expires: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'pending', 'expired', 'revoked'],
      default: 'active',
      index: true
    },
    grantedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Indexes
ConsentGrantSchema.index({ patientId: 1, status: 1 });
ConsentGrantSchema.index({ granteeId: 1, status: 1 });
ConsentGrantSchema.index({ orgId: 1, status: 1 });

export const ConsentGrant = mongoose.model<IConsentGrant>('ConsentGrant', ConsentGrantSchema);
