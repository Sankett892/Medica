import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEncounter extends Document {
  patientId: Types.ObjectId;
  clinicianId?: Types.ObjectId;
  clinicianName?: string;
  orgId: Types.ObjectId;
  facility: string;
  type: string; // e.g. 'Emergency encounter', 'Outpatient consultation'
  reason?: string;
  summary: string;
  status: 'Completed' | 'In-Progress' | 'Cancelled';
  occurredAt: Date;
  disposition?: string;
  followUp?: string;
  fields: { k: string; v: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    clinicianId: { type: Schema.Types.ObjectId, ref: 'Practitioner', index: true },
    clinicianName: { type: String, trim: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    facility: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['Completed', 'In-Progress', 'Cancelled'], default: 'Completed', index: true },
    occurredAt: { type: Date, required: true, index: true },
    disposition: { type: String, trim: true },
    followUp: { type: String, trim: true },
    fields: [{ k: { type: String, required: true }, v: { type: String, required: true } }]
  },
  { timestamps: true }
);

// Indexes
EncounterSchema.index({ patientId: 1, occurredAt: -1 });
EncounterSchema.index({ orgId: 1, occurredAt: -1 });

export const Encounter = mongoose.model<IEncounter>('Encounter', EncounterSchema);
