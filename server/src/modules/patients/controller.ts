import { Request, Response, NextFunction } from 'express';
import { patientsService } from './service.js';
import { recordsService } from '../records/service.js';
import { updatePatientMeSchema, listRecordsQuerySchema } from './schema.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getPatientMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const data = await patientsService.getProfile(patientId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function patchPatientMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const parsed = updatePatientMeSchema.parse(req.body);
    const data = await patientsService.updateProfile(patientId, parsed);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPatientSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const data = await patientsService.getSummary(patientId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPatientRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const query = listRecordsQuerySchema.parse(req.query);
    const records = await recordsService.getRecordsForPatient(patientId, {
      cat: query.cat,
      q: query.q
    });

    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const startIndex = (page - 1) * pageSize;
    const paginated = records.slice(startIndex, startIndex + pageSize);

    res.json({
      data: paginated,
      meta: {
        page,
        pageSize,
        total: records.length
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientRecordDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const record = await recordsService.getRecordById(patientId, req.params.id as string);
    if (!record) {
      throw new AppError(404, 'RECORD_NOT_FOUND', 'Clinical record not found');
    }
    res.json({ data: record });
  } catch (error) {
    next(error);
  }
}

export async function getPatientVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const data = await patientsService.getVitals(patientId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPatientActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const data = await patientsService.getActivity(patientId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPatientAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) {
      throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked to current user');
    }
    const data = await patientsService.getAudit(patientId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
