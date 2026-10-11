import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPractitioner extends Document {
  orgId: Types.ObjectId;
  identifiers: string[];
  name: string;
  specialty: string;
  dept?: string;
  licenseNo: string;
  facilities: string[];
  location?: {
    city: string;
    state: string;
    country: string;
    locality: string;
    hospitalOrClinic?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PractitionerSchema = new Schema<IPractitioner>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    identifiers: [{ type: String, trim: true, index: true }],
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    dept: { type: String, trim: true },
    licenseNo: { type: String, required: true, trim: true },
    facilities: [{ type: String, trim: true }],
    location: {
      city: { type: String, trim: true, default: 'Pune' },
      state: { type: String, trim: true, default: 'Maharashtra' },
      country: { type: String, trim: true, default: 'India' },
      locality: { type: String, trim: true, index: true },
      hospitalOrClinic: { type: String, trim: true }
    }
  },
  { timestamps: true }
);

// Indexes
PractitionerSchema.index({ name: 'text', specialty: 'text' });
PractitionerSchema.index({ orgId: 1, specialty: 1 });

export const Practitioner = mongoose.model<IPractitioner>('Practitioner', PractitionerSchema);
