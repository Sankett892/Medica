import { Request, Response, NextFunction } from 'express';
import { cliniciansService } from './service.js';
import { qrService } from '../qr/service.js';
import { recordsService } from '../records/service.js';
import { followUpService } from '../followups/service.js';
import { Encounter } from '../../models/Encounter.js';
import { Patient } from '../../models/Patient.js';
import { resolvePuneTaluka } from '../../constants/regions.js';
import { emitConsentEvent, emitGlobalEvent } from '../../config/socket.js';
import { AppError } from '../../middleware/errorHandler.js';

import {
  resolveQRSchema,
  emergencyAccessSchema,
  recordAccessSchema,
  clinicianPatientSearchSchema
} from './schema.js';

export async function getClinicianMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getProfile(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getClinicianDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getDashboard(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function searchClinicianPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = clinicianPatientSearchSchema.parse(req.query);
    const data = await cliniciansService.searchPatients(req.user, parsed.q);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getClinicianPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getPatientIdentification(req.user, req.params.id as string);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getClinicianPatientRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getPatientRecords(req.user, req.params.id as string);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getClinicianPatientConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getPatientConsent(req.user, req.params.id as string);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function requestClinicianPatientConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.requestConsent(req.user, req.params.id as string, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function resolveQR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = resolveQRSchema.parse(req.body);
    const data = await qrService.resolveToken(parsed.token, req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function recordPatientAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = recordAccessSchema.parse(req.body);
    const data = await cliniciansService.recordAccess(req.user, req.params.id as string, parsed);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function emergencyAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = emergencyAccessSchema.parse(req.body);
    const data = await cliniciansService.emergencyAccess(req.user, parsed);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getClinicianAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await cliniciansService.getAudit(req.user);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createClinicianPatientRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cat, type, summary, fields, diseaseCategory, locality, diagnosis, followUpConfig } = req.body;
    if (!cat || !type || !summary) {
      throw new AppError(400, 'INVALID_INPUT', 'Fields cat, type, and summary are required');
    }
    const patientInfo = await cliniciansService.getPatientIdentification(req.user, req.params.id as string);
    const patientDoc = await Patient.findById(patientInfo._id);

    const recordData = await recordsService.createRecord(patientInfo._id, {
      cat,
      type,
      summary,
      fields,
      clinician: req.user!.name,
      facility: (req.user as any)?.orgName || 'Sunrise Multispecialty Hospital'
    });

    // Also persist Encounter in MongoDB for epidemiology and analytics
    const patientLocality = patientDoc?.location?.locality || locality || 'Shivajinagar';
    const chosenDisease = diseaseCategory || (fields?.find((f: any) => f.k === 'Diagnosis / Syndrome')?.v) || 'Bronchial Asthma';
    const chosenRegion = resolvePuneTaluka(locality || patientLocality, req.body.region || patientDoc?.location?.region);

    if (patientDoc && (!patientDoc.location?.region || !patientDoc.location?.locality)) {
      patientDoc.location = {
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        locality: locality || patientLocality,
        region: chosenRegion
      };
      await patientDoc.save().catch(() => {});
    }

    const encounter = await Encounter.create({
      patientId: patientInfo._id,
      orgId: req.user?.orgId,
      type: type || 'Clinical Consultation',
      facility: (req.user as any)?.orgName || 'Sunrise Multispecialty Hospital',
      clinicianId: req.user!._id,
      clinicianName: req.user!.name,
      occurredAt: new Date(),
      summary: summary,
      status: 'Completed',
      disposition: 'Discharged',
      followUp: followUpConfig?.enabled ? `${followUpConfig.intervalDays || 7}-Day Follow-Up Scheduled` : 'As needed',
      locality: locality || patientLocality,
      region: chosenRegion,
      diseaseCategory: chosenDisease,
      diagnosis: diagnosis || type,
      followUpConfig: followUpConfig ? {
        enabled: Boolean(followUpConfig.enabled),
        intervalDays: followUpConfig.intervalDays || 7
      } : undefined,
      fields: fields || []
    });

    let scheduledSurvey = null;
    if (followUpConfig?.enabled) {
      scheduledSurvey = await followUpService.scheduleFollowUp({
        patientId: patientInfo._id,
        patientName: patientInfo.name,
        clinicianId: req.user!.linkedPractitionerId || req.user!._id,
        clinicianName: req.user!.name,
        encounterId: encounter._id,
        encounterType: encounter.type,
        diseaseCategory: chosenDisease,
        intervalDays: followUpConfig.intervalDays || 7,
        testNow: Boolean(followUpConfig.testNow)
      });
      encounter.followUpConfig = {
        enabled: true,
        intervalDays: followUpConfig.intervalDays || 7,
        scheduledDate: scheduledSurvey.scheduledDate,
        surveyId: scheduledSurvey._id
      };
      await encounter.save();
    }

    // Broadcast real-time Socket.IO events for live administrator map and patient updates
    emitGlobalEvent('analytics:updated', {
      encounterId: encounter._id.toString(),
      locality: encounter.locality,
      diseaseCategory: chosenDisease,
      timestamp: new Date().toISOString()
    });
    emitConsentEvent(patientInfo._id.toString(), 'records:updated', {
      recordId: recordData.id,
      cat,
      type
    });

    res.status(201).json({
      data: {
        record: recordData,
        encounter: {
          id: encounter._id.toString(),
          locality: encounter.locality,
          diseaseCategory: encounter.diseaseCategory
        },
        followUpSurvey: scheduledSurvey ? {
          id: scheduledSurvey._id.toString(),
          status: scheduledSurvey.status,
          scheduledDate: scheduledSurvey.scheduledDate
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function markEncounterRecovered(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { comments } = req.body;
    const result = await cliniciansService.markEncounterRecovered(id, req.user, comments);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

