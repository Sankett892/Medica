import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IObservation extends Document {
  patientId: Types.ObjectId;
  encounterId?: Types.ObjectId;
  category: 'vital' | 'lab' | 'measurement';
  code: string;
  display: string; // e.g. 'Blood pressure', 'Heart rate', 'Complete blood count', 'BMI'
  value: string;
  unit: string;
  status: 'Final' | 'Preliminary' | 'Amended';
  facility: string;
  clinicianName?: string;
  summary?: string;
  fields: { k: string; v: string }[];
  effectiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ObservationSchema = new Schema<IObservation>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter', index: true },
    category: { type: String, required: true, enum: ['vital', 'lab', 'measurement'], index: true },
    code: { type: String, required: true, trim: true },
    display: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['Final', 'Preliminary', 'Amended'], default: 'Final', index: true },
    facility: { type: String, required: true, trim: true },
    clinicianName: { type: String, trim: true },
    summary: { type: String, trim: true },
    fields: [{ k: { type: String, required: true }, v: { type: String, required: true } }],
    effectiveAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

// Indexes
ObservationSchema.index({ patientId: 1, effectiveAt: -1 });
ObservationSchema.index({ patientId: 1, category: 1 });

export const Observation = mongoose.model<IObservation>('Observation', ObservationSchema);
