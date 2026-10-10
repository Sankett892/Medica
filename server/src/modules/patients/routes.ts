import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { allow } from '../../middleware/rbac.js';
import { auditLog } from '../../middleware/audit.js';
import { qrRateLimiter } from '../../middleware/rateLimit.js';
import {
  getPatientMe,
  patchPatientMe,
  getPatientSummary,
  getPatientRecords,
  getPatientRecordDetail,
  getPatientVitals,
  getPatientActivity,
  getPatientAudit
} from './controller.js';
import { consentService } from '../consent/service.js';
import { qrService } from '../qr/service.js';
import { recordsService } from '../records/service.js';
import { createGrantSchema } from '../consent/schema.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// All patient endpoints require PATIENT role
router.use(requireAuth, allow('PATIENT'));

// Profile & Summary
router.get('/me', getPatientMe);
router.patch('/me', patchPatientMe);
router.get('/me/summary', auditLog({ action: 'Viewed health summary', resource: 'Patient profile' }), getPatientSummary);

// Clinical Records
router.get('/me/records', auditLog({ action: 'Viewed records list', resource: 'Clinical records' }), getPatientRecords);
router.post('/me/records', auditLog({ action: 'Created health record', resource: 'Clinical record' }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const { cat, type, summary, fields } = req.body;
    if (!cat || !type || !summary) {
      throw new AppError(400, 'INVALID_INPUT', 'Fields cat, type, and summary are required');
    }
    const data = await recordsService.createRecord(patientId, {
      cat,
      type,
      summary,
      fields,
      clinician: `${req.user!.name} (Patient)`
    });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});
router.get('/me/records/:id', auditLog({ action: 'Viewed single record', resource: 'Clinical record' }), getPatientRecordDetail);
router.get('/me/vitals', auditLog({ action: 'Viewed vitals', resource: 'Vital signs' }), getPatientVitals);
router.get('/me/activity', getPatientActivity);
router.get('/me/audit', getPatientAudit);

// Consent Grants
router.get('/me/grants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const tab = (req.query.tab as string) || 'active';
    const data = await consentService.getGrantsForPatient(patientId, tab);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/grants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const parsed = createGrantSchema.parse(req.body);
    const data = await consentService.createGrant(patientId, req.user!._id, req.user!.name, parsed);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/me/grants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const data = await consentService.getGrantById(patientId, req.params.id as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/grants/:id/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const data = await consentService.revokeGrant(patientId, req.params.id as string, req.user!._id, req.user!.name);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// QR Authorization
router.post('/me/qr', qrRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const data = await qrService.generateToken(patientId, req.user!._id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/me/qr/refresh', qrRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user!.linkedPatientId!;
    const data = await qrService.generateToken(patientId, req.user!._id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const patientsRouter = router;
