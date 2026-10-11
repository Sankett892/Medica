import mongoose, { Schema, Document } from 'mongoose';

export type FacilityType = 'District Hospital' | 'Sub-District Hospital' | 'Rural Hospital' | 'General Hospital' | 'Primary Health Centre' | 'Community Health Centre' | 'Multispecialty Hospital';
export type VerificationStatus = 'Verified' | 'Unverified';

export interface IFacility extends Document {
  facilityId: string;
  name: string;
  type: FacilityType;
  region: string; // Pune District Taluka (e.g. Junnar, Ambegaon, Khed, etc.)
  locality?: string;
  city: string;
  state: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  bedCapacity?: number;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FacilitySchema = new Schema<IFacility>(
  {
    facilityId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'District Hospital',
        'Sub-District Hospital',
        'Rural Hospital',
        'General Hospital',
        'Primary Health Centre',
        'Community Health Centre',
        'Multispecialty Hospital'
      ],
      default: 'Rural Hospital'
    },
    region: { type: String, required: true, trim: true, index: true }, // Pune Taluka name
    locality: { type: String, trim: true },
    city: { type: String, required: true, trim: true, default: 'Pune' },
    state: { type: String, required: true, trim: true, default: 'Maharashtra' },
    address: { type: String, trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    bedCapacity: { type: Number, default: 50 },
    verificationStatus: {
      type: String,
      required: true,
      enum: ['Verified', 'Unverified'],
      default: 'Verified',
      index: true
    }
  },
  { timestamps: true }
);

FacilitySchema.index({ region: 1, type: 1 });
FacilitySchema.index({ name: 'text', locality: 'text', address: 'text' });

export const Facility = mongoose.model<IFacility>('Facility', FacilitySchema);
