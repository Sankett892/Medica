import mongoose, { Schema, Document, Types } from 'mongoose';

export type ClinicalCategory =
  | 'encounters'
  | 'observations'
  | 'medications'
  | 'allergies'
  | 'reports'
  | 'immunizations'
  | 'careplans';

export interface IClinicalResource extends Document {
  patientId: Types.ObjectId;
  cat: ClinicalCategory;
  type: string; // e.g. 'Active medication', 'Allergy', 'Laboratory report', 'Immunization', 'Care plan'
  date: string; // e.g. '02 Aug 2026'
  occurredAt: Date;
  facility: string;
  clinician: string;
  summary: string;
  status: 'Active' | 'Final' | 'Completed' | 'Resolved' | 'Inactive';
  fields: { k: string; v: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalResourceSchema = new Schema<IClinicalResource>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    cat: {
      type: String,
      required: true,
      enum: ['encounters', 'observations', 'medications', 'allergies', 'reports', 'immunizations', 'careplans'],
      index: true
    },
    type: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    occurredAt: { type: Date, required: true, index: true },
    facility: { type: String, required: true, trim: true },
    clinician: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'Final', 'Completed', 'Resolved', 'Inactive'],
      default: 'Active',
      index: true
    },
    fields: [{ k: { type: String, required: true }, v: { type: String, required: true } }]
  },
  { timestamps: true }
);

// Indexes
ClinicalResourceSchema.index({ patientId: 1, cat: 1, occurredAt: -1 });
ClinicalResourceSchema.index({ summary: 'text', type: 'text', clinician: 'text', facility: 'text' });

export const ClinicalResource = mongoose.model<IClinicalResource>('ClinicalResource', ClinicalResourceSchema);
