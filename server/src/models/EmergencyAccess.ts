import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEmergencyAccess extends Document {
  clinicianId: Types.ObjectId;
  clinicianName: string;
  patientId: Types.ObjectId;
  patientIdentifier: string;
  justification: string;
  orgId: Types.ObjectId;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyAccessSchema = new Schema<IEmergencyAccess>(
  {
    clinicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clinicianName: { type: String, required: true, trim: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientIdentifier: { type: String, required: true, trim: true },
    justification: { type: String, required: true, trim: true, minlength: 10 },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    at: { type: Date, required: true, default: Date.now, index: true }
  },
  { timestamps: true }
);

// Indexes
EmergencyAccessSchema.index({ orgId: 1, at: -1 });
EmergencyAccessSchema.index({ clinicianId: 1, at: -1 });
EmergencyAccessSchema.index({ patientId: 1, at: -1 });

export const EmergencyAccess = mongoose.model<IEmergencyAccess>('EmergencyAccess', EmergencyAccessSchema);
