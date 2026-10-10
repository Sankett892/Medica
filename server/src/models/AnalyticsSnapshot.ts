import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  snapshotType: 'region' | 'facility' | 'disease_trend';
  region?: string;
  facilityName?: string;
  disease?: 'ili' | 'dengue' | 'add';
  period: string; // e.g. 'Wk 40', 'last 30 days'
  count: number;
  suppressed: boolean;
  kThreshold: number;
  metadata?: Record<string, any>;
  generatedAt: Date;
  createdAt: Date;
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    snapshotType: { type: String, required: true, enum: ['region', 'facility', 'disease_trend'], index: true },
    region: { type: String, trim: true, index: true },
    facilityName: { type: String, trim: true, index: true },
    disease: { type: String, enum: ['ili', 'dengue', 'add'], index: true },
    period: { type: String, required: true },
    count: { type: Number, required: true },
    suppressed: { type: Boolean, required: true, default: false, index: true },
    kThreshold: { type: Number, required: true, default: 5 },
    metadata: { type: Schema.Types.Mixed },
    generatedAt: { type: Date, required: true, default: Date.now, index: true }
  },
  { timestamps: true }
);

// Indexes
AnalyticsSnapshotSchema.index({ snapshotType: 1, generatedAt: -1 });
AnalyticsSnapshotSchema.index({ disease: 1, generatedAt: -1 });

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', AnalyticsSnapshotSchema);
