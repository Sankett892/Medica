import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemStatus extends Document {
  name: string;
  state: 'operational' | 'degraded';
  detail: string;
  updatedAt: Date;
}

const SystemStatusSchema = new Schema<ISystemStatus>(
  {
    name: { type: String, required: true, unique: true },
    state: { type: String, required: true, enum: ['operational', 'degraded'], default: 'operational' },
    detail: { type: String, required: true }
  },
  { timestamps: true }
);

export const SystemStatus = mongoose.model<ISystemStatus>('SystemStatus', SystemStatusSchema);
