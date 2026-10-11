import mongoose, { Schema, Document, Types } from 'mongoose';

export type RecoveryStatus =
  | 'Completely recovered'
  | 'Feeling better, but not fully recovered'
  | 'No significant improvement'
  | 'Symptoms have worsened'
  | 'I would prefer to discuss this with my clinician';

export interface IFollowUpSurvey extends Document {
  patientId: Types.ObjectId;
  encounterId: Types.ObjectId;
  clinicianId?: Types.ObjectId;
  clinicianName?: string;
  patientName?: string;
  encounterType?: string;
  diseaseCategory?: string;
  intervalDays?: number;
  scheduledDate: Date;
  status: 'scheduled' | 'due' | 'completed' | 'cancelled';
  recoveryStatus?: RecoveryStatus;
  comments?: string;
  submittedAt?: Date;
  completedAt?: Date;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}


const FollowUpSurveySchema = new Schema<IFollowUpSurvey>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true, index: true },
    clinicianId: { type: Schema.Types.ObjectId, ref: 'Practitioner', index: true },
    clinicianName: { type: String, trim: true },
    patientName: { type: String, trim: true },
    encounterType: { type: String, trim: true },
    diseaseCategory: { type: String, trim: true, index: true },
    intervalDays: { type: Number, default: 7 },
    scheduledDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'due', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    recoveryStatus: {
      type: String,
      enum: [
        'Completely recovered',
        'Feeling better, but not fully recovered',
        'No significant improvement',
        'Symptoms have worsened',
        'I would prefer to discuss this with my clinician'
      ]
    },
    comments: { type: String, trim: true },
    submittedAt: { type: Date },
    completedAt: { type: Date },
    notifiedAt: { type: Date }
  },

  { timestamps: true }
);

FollowUpSurveySchema.index({ patientId: 1, status: 1 });
FollowUpSurveySchema.index({ clinicianId: 1, status: 1 });
FollowUpSurveySchema.index({ scheduledDate: 1, status: 1 });

export const FollowUpSurvey = mongoose.model<IFollowUpSurvey>('FollowUpSurvey', FollowUpSurveySchema);