import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { allow } from '../../middleware/rbac.js';
import { followUpService } from './service.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// 1. Patient endpoints
router.get('/patient/me', requireAuth, allow('PATIENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked');
    const data = await followUpService.getPatientSurveys(patientId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/patient/me/:id/submit', requireAuth, allow('PATIENT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.user?.linkedPatientId;
    if (!patientId) throw new AppError(403, 'NO_LINKED_PATIENT', 'No patient record linked');
    const { recoveryStatus, comments } = req.body;
    if (!recoveryStatus) throw new AppError(400, 'INVALID_INPUT', 'Recovery status is required');
    const data = await followUpService.submitPatientSurvey(patientId, req.params.id as string, { recoveryStatus, comments });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// 2. Clinician endpoints
router.get('/clinician', requireAuth, allow('CLINICIAN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await followUpService.getClinicianSurveys(req.user?.linkedPractitionerId || req.user?._id, req.user?.name);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// 3. Testing / Simulation trigger
router.post('/:id/simulate-due', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await followUpService.simulateDueNow(req.params.id as string);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export const followUpRouter = router;