import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserRole = 'PATIENT' | 'CLINICIAN' | 'ADMIN';

export interface IUser extends Document {
  clerkUserId: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash?: string;
  passwordSalt?: string;
  orgId?: Types.ObjectId;
  status: 'Active' | 'Suspended';
  linkedPatientId?: Types.ObjectId;
  linkedPractitionerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    role: { type: String, required: true, enum: ['PATIENT', 'CLINICIAN', 'ADMIN'], index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String },
    passwordSalt: { type: String },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    status: { type: String, required: true, enum: ['Active', 'Suspended'], default: 'Active', index: true },
    linkedPatientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    linkedPractitionerId: { type: Schema.Types.ObjectId, ref: 'Practitioner', index: true }
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ orgId: 1, role: 1 });
UserSchema.index({ name: 'text', email: 'text' });

export const User = mongoose.model<IUser>('User', UserSchema);
