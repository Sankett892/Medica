import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { allow } from '../../middleware/rbac.js';
import {
  getOverview,
  getSurveillance,
  getGeographic,
  getFacilities,
  getPrivacy,
  getAudit,
  getOrganizations,
  getOrganizationById,
  getUsers,
  getStatus,
  getSettings,
  getPuneMap,
  getFollowUpAnalytics
} from './controller.js';

const router = Router();

// Gated strictly to ADMIN role
router.use(requireAuth, allow('ADMIN'));

router.get('/overview', getOverview);
router.get('/surveillance', getSurveillance);
router.get('/geographic', getGeographic);
router.get('/pune-map', getPuneMap);
router.get('/followup-analytics', getFollowUpAnalytics);
router.get('/facilities', getFacilities);
router.get('/privacy', getPrivacy);
router.get('/audit', getAudit);
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationById);
router.get('/users', getUsers);
router.get('/status', getStatus);
router.get('/settings', getSettings);

export const adminRouter = router;

