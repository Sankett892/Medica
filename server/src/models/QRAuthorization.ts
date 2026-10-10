import mongoose, { Schema, Document, Types } from 'mongoose';

export type QRStatus = 'active' | 'expired' | 'used';

export interface IQRAuthorization extends Document {
  patientId: Types.ObjectId;
  token: string;
  status: QRStatus;
  createdBy: Types.ObjectId;
  expiresAt: Date;
  usedBy?: Types.ObjectId;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QRAuthorizationSchema = new Schema<IQRAuthorization>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'expired', 'used'],
      default: 'active',
      index: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes
QRAuthorizationSchema.index({ token: 1, status: 1 });
QRAuthorizationSchema.index({ patientId: 1, createdAt: -1 });

export const QRAuthorization = mongoose.model<IQRAuthorization>('QRAuthorization', QRAuthorizationSchema);
