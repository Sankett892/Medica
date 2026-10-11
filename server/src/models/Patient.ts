import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPatient extends Document {
  orgId?: Types.ObjectId;
  identifiers: string[]; // e.g. ['HMX-P-20481']
  name: string;
  dob: string; // e.g. '14 Mar 1991'
  age: number;
  sex: 'Female' | 'Male' | 'Other';
  bloodType?: string; // e.g. 'O+', 'B+'
  phone?: string;
  abha?: string;
  allergies: string[];
  facility?: string;
  location?: {
    region?: string; // Pune district taluka
    city: string;
    state: string;
    country: string;
    locality: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  primaryClinicianId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    identifiers: [{ type: String, trim: true, index: true }],
    name: { type: String, required: true, trim: true },
    dob: { type: String, required: true },
    age: { type: Number, required: true },
    sex: { type: String, required: true, enum: ['Female', 'Male', 'Other'] },
    bloodType: { type: String, trim: true },
    phone: { type: String, trim: true },
    abha: { type: String, trim: true },
    allergies: [{ type: String, trim: true }],
    facility: { type: String, trim: true },
    location: {
      city: { type: String, trim: true, default: 'Pune' },
      state: { type: String, trim: true, default: 'Maharashtra' },
      country: { type: String, trim: true, default: 'India' },
      region: { type: String, trim: true, index: true },
      locality: { type: String, trim: true, index: true },
      address: { type: String, trim: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    primaryClinicianId: { type: Schema.Types.ObjectId, ref: 'Practitioner', index: true }
  },
  { timestamps: true }
);

// Indexes
PatientSchema.index({ name: 'text', 'identifiers': 'text' });
PatientSchema.index({ orgId: 1, createdAt: -1 });

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
