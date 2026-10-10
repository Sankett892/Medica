import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { allow } from '../../middleware/rbac.js';
import { qrRateLimiter } from '../../middleware/rateLimit.js';
import {
  getClinicianMe,
  getClinicianDashboard,
  searchClinicianPatients,
  getClinicianPatient,
  getClinicianPatientRecords,
  getClinicianPatientConsent,
  resolveQR,
  recordPatientAccess,
  emergencyAccess,
  getClinicianAudit,
  createClinicianPatientRecord
} from './controller.js';

const router = Router();

// Gated to CLINICIAN role
router.use(requireAuth, allow('CLINICIAN'));

router.get('/me', getClinicianMe);
router.get('/dashboard', getClinicianDashboard);
router.get('/patients', searchClinicianPatients);
router.get('/patients/:id', getClinicianPatient);
router.get('/patients/:id/records', getClinicianPatientRecords);
router.post('/patients/:id/records', createClinicianPatientRecord);
router.get('/patients/:id/consent', getClinicianPatientConsent);
router.post('/patients/:id/access', recordPatientAccess);

router.post('/qr/resolve', qrRateLimiter, resolveQR);
router.post('/emergency', emergencyAccess);
router.get('/audit', getClinicianAudit);

export const cliniciansRouter = router;
