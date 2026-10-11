import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEncounter extends Document {
  patientId: Types.ObjectId;
  clinicianId?: Types.ObjectId;
  clinicianName?: string;
  orgId: Types.ObjectId;
  facility: string;
  region?: string; // Pune district taluka (e.g. Junnar, Khed, Pune, Haveli, etc.)
  locality?: string;
  type: string; // e.g. 'Emergency encounter', 'Outpatient consultation'
  diseaseCategory?: string; // e.g. 'Diabetes Mellitus', 'Hypertension', 'Bronchial Asthma', 'Dermatological conditions'
  diagnosis?: string;
  reason?: string;
  summary: string;
  status: 'Completed' | 'In-Progress' | 'Cancelled';
  occurredAt: Date;
  disposition?: string;
  followUp?: string;
  followUpConfig?: {
    enabled: boolean;
    intervalDays: number;
    scheduledDate: Date;
    surveyId?: Types.ObjectId;
  };
  recoveryStatus?: string;
  isRecovered?: boolean;
  fields: { k: string; v: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    clinicianId: { type: Schema.Types.ObjectId, ref: 'Practitioner', index: true },
    clinicianName: { type: String, trim: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    facility: { type: String, required: true, trim: true },
    region: { type: String, trim: true, index: true },
    locality: { type: String, trim: true, index: true },
    type: { type: String, required: true, trim: true },
    diseaseCategory: { type: String, trim: true, index: true },
    diagnosis: { type: String, trim: true },
    reason: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['Completed', 'In-Progress', 'Cancelled'], default: 'Completed', index: true },
    occurredAt: { type: Date, required: true, index: true },
    disposition: { type: String, trim: true },
    followUp: { type: String, trim: true },
    followUpConfig: {
      enabled: { type: Boolean, default: false },
      intervalDays: { type: Number, default: 7 },
      scheduledDate: { type: Date },
      surveyId: { type: Schema.Types.ObjectId, ref: 'FollowUpSurvey' }
    },
    recoveryStatus: { type: String, trim: true, index: true },
    isRecovered: { type: Boolean, default: false, index: true },
    fields: [{ k: { type: String, required: true }, v: { type: String, required: true } }]
  },
  { timestamps: true }
);

// Indexes
EncounterSchema.index({ patientId: 1, occurredAt: -1 });
EncounterSchema.index({ orgId: 1, occurredAt: -1 });
EncounterSchema.index({ locality: 1, diseaseCategory: 1, occurredAt: -1 });

export const Encounter = mongoose.model<IEncounter>('Encounter', EncounterSchema);
