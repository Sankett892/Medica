import { Types } from 'mongoose';
import { FollowUpSurvey, IFollowUpSurvey, RecoveryStatus } from '../../models/FollowUpSurvey.js';
import { Encounter } from '../../models/Encounter.js';
import { createAuditEvent } from '../../middleware/audit.js';
import { emitConsentEvent, getIO } from '../../config/socket.js';
import { AppError } from '../../middleware/errorHandler.js';
export class FollowUpService {
  async scheduleFollowUp(params: {

    patientId: Types.ObjectId;
    encounterId: Types.ObjectId;
    clinicianId?: Types.ObjectId;
    clinicianName?: string;
    patientName?: string;
    encounterType?: string;
    diseaseCategory?: string;
    intervalDays?: number;
    scheduledDate?: Date;
    testNow?: boolean;
  }) {
    const now = new Date();
    const interval = params.intervalDays || 7;
    const scheduled = params.testNow ? now : (params.scheduledDate || new Date(now.getTime() + interval * 24 * 60 * 60 * 1000));

    const existing = await FollowUpSurvey.findOne({
      encounterId: params.encounterId,
      status: { $in: ['scheduled', 'due'] }
    });
    if (existing) {
      if (params.testNow) {
        existing.status = 'due';
        existing.scheduledDate = now;
        await existing.save();
      }
      return existing;
    }

    const survey = await FollowUpSurvey.create({
      patientId: params.patientId,
      encounterId: params.encounterId,
      clinicianId: params.clinicianId,
      clinicianName: params.clinicianName,
      patientName: params.patientName,
      encounterType: params.encounterType,
      diseaseCategory: params.diseaseCategory,
      intervalDays: interval,
      scheduledDate: scheduled,
      status: (params.testNow || scheduled <= now) ? 'due' : 'scheduled'
    });

    await Encounter.findByIdAndUpdate(params.encounterId, {
      $set: {
        'followUpConfig.surveyId': survey._id,
        'followUpConfig.scheduledDate': scheduled,
        'followUpConfig.enabled': true
      }
    });

    return survey;
  }


  async getPatientSurveys(patientId: Types.ObjectId) {
    await this.processDueSurveys();

    const surveys = await FollowUpSurvey.find({ patientId }).sort({ scheduledDate: -1 });
    return surveys.map(s => ({
      id: s._id.toString(),
      encounterId: s.encounterId.toString(),
      clinicianName: s.clinicianName || 'Attending Physician',
      encounterType: s.encounterType || 'Clinical Consultation',
      diseaseCategory: s.diseaseCategory || 'General',
      scheduledDate: s.scheduledDate,
      status: s.status,
      recoveryStatus: s.recoveryStatus,
      comments: s.comments,
      submittedAt: s.submittedAt
    }));
  }

  async getClinicianSurveys(clinicianId?: Types.ObjectId, clinicianName?: string) {
    await this.processDueSurveys();

    let query: any = {};
    const conditions: any[] = [];
    if (clinicianId) {
      conditions.push({ clinicianId });
    }
    if (clinicianName) {
      conditions.push({ clinicianName });
    }
    if (conditions.length > 0) {
      query.$or = conditions;
    }

    const surveys = await FollowUpSurvey.find(query).sort({ updatedAt: -1 }).limit(100);
    return surveys.map(s => ({
      id: s._id.toString(),
      patientId: s.patientId.toString(),
      patientName: s.patientName || 'Patient',
      encounterId: s.encounterId.toString(),
      clinicianName: s.clinicianName || 'Physician',
      diseaseCategory: s.diseaseCategory || 'General',
      scheduledDate: s.scheduledDate,
      status: s.status,
      recoveryStatus: s.recoveryStatus,
      comments: s.comments,
      submittedAt: s.submittedAt,
      isWorsened: s.recoveryStatus === 'Symptoms have worsened'
    }));
  }

  async submitPatientSurvey(patientId: Types.ObjectId, surveyId: string, input: { recoveryStatus: RecoveryStatus; comments?: string }) {
    if (!Types.ObjectId.isValid(surveyId)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid survey ID format');
    }

    const survey = await FollowUpSurvey.findOne({ _id: new Types.ObjectId(surveyId), patientId });
    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Follow-up survey record not found');
    }

    if (survey.status === 'completed') {
      throw new AppError(409, 'ALREADY_COMPLETED', 'This follow-up survey has already been completed.');
    }

    const now = new Date();
    survey.recoveryStatus = input.recoveryStatus;
    survey.comments = input.comments || '';
    survey.submittedAt = now;
    survey.completedAt = now;
    survey.status = 'completed';
    await survey.save();

    // Also persist feedback into the Encounter document in MongoDB
    if (survey.encounterId) {
      try {
        const enc = await Encounter.findById(survey.encounterId);
        if (enc) {
          enc.recoveryStatus = input.recoveryStatus;
          enc.isRecovered = input.recoveryStatus === 'Completely recovered';
          enc.fields = enc.fields.filter(
            f => f.k !== 'Patient Recovery Feedback' && f.k !== 'Patient Comments' && f.k !== 'Feedback Submitted Date'
          );
          enc.fields.push({ k: 'Patient Recovery Feedback', v: input.recoveryStatus });
          if (input.comments) {
            enc.fields.push({ k: 'Patient Comments', v: input.comments });
          }
          enc.fields.push({
            k: 'Feedback Submitted Date',
            v: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          });
          await enc.save();
        }
      } catch (encErr) {
        console.warn('[FollowUp] Encounter feedback sync notice:', encErr);
      }
    }

    await createAuditEvent({
      actorId: patientId,
      actor: survey.patientName || 'Patient',
      actorRole: 'Patient',
      patientId,
      action: 'Submitted follow-up survey',
      resource: input.recoveryStatus,
      outcome: 'success'
    });

    const io = getIO();
    if (io) {
      io.emit('survey:submitted', {
        surveyId: survey._id.toString(),
        patientId: patientId.toString(),
        recoveryStatus: input.recoveryStatus,
        isWorsened: input.recoveryStatus === 'Symptoms have worsened'
      });
      io.emit('analytics:updated', { source: 'survey' });
    }

    return {
      success: true,
      id: survey._id.toString(),
      status: survey.status,
      recoveryStatus: survey.recoveryStatus,
      submittedAt: survey.submittedAt
    };
  }

  async processDueSurveys() {
    const now = new Date();
    const dueSurveys = await FollowUpSurvey.find({
      status: 'scheduled',
      scheduledDate: { $lte: now }
    });

    for (const survey of dueSurveys) {
      survey.status = 'due';
      survey.notifiedAt = now;
      await survey.save();

      emitConsentEvent(survey.patientId.toString(), 'survey:due', {
        surveyId: survey._id.toString(),
        diseaseCategory: survey.diseaseCategory
      });
    }
  }

  async simulateDueNow(surveyId: string) {
    if (!Types.ObjectId.isValid(surveyId)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid survey ID');
    }
    const survey = await FollowUpSurvey.findById(surveyId);
    if (!survey) {
      throw new AppError(404, 'NOT_FOUND', 'Survey not found');
    }
    survey.scheduledDate = new Date(Date.now() - 1000);
    survey.status = 'due';
    await survey.save();
    return survey;
  }
}

export const followUpService = new FollowUpService();