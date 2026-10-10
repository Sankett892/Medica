import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  type: 'Hospital' | 'Clinic' | 'Diagnostic' | 'HQ';
  region: string;
  facilities: string[];
  status: 'Active' | 'Limited' | 'Suspended';
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, enum: ['Hospital', 'Clinic', 'Diagnostic', 'HQ'] },
    region: { type: String, required: true, index: true },
    facilities: [{ type: String, trim: true }],
    status: { type: String, required: true, enum: ['Active', 'Limited', 'Suspended'], default: 'Active', index: true }
  },
  { timestamps: true }
);

// Indexes
OrganizationSchema.index({ name: 'text', region: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
