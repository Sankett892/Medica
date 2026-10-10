import { Request, Response, NextFunction } from 'express';
import { cliniciansService } from './service.js';
import { qrService } from '../qr/service.js';
import { recordsService } from '../records/service.js';
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
    const { cat, type, summary, fields } = req.body;
    if (!cat || !type || !summary) {
      throw new AppError(400, 'INVALID_INPUT', 'Fields cat, type, and summary are required');
    }
    const patientInfo = await cliniciansService.getPatientIdentification(req.user, req.params.id as string);
    const data = await recordsService.createRecord(patientInfo._id, {
      cat,
      type,
      summary,
      fields,
      clinician: req.user!.name,
      facility: (req.user as any)?.orgName || 'Sunrise Multispecialty Hospital'
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}
