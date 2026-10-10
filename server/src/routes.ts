import { Router } from 'express';
import { authRouter } from './modules/auth/routes.js';
import { patientsRouter } from './modules/patients/routes.js';
import { cliniciansRouter } from './modules/clinicians/routes.js';
import { adminRouter } from './modules/admin/routes.js';

const router = Router();

// Mount all feature routers under /api/v1
router.use('/auth', authRouter);
router.use('/patients', patientsRouter);
router.use('/clinicians', cliniciansRouter);
router.use('/admin', adminRouter);

export const v1Router = router;
