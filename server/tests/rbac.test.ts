import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';

describe('RBAC & Policy Guard Deny Paths', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('denies patient from accessing clinician endpoints with HTTP 403 POLICY_DENIED', async () => {
    const { patientUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/clinicians/dashboard')
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('POLICY_DENIED');
  });

  it('denies clinician from accessing admin endpoints with HTTP 403 POLICY_DENIED', async () => {
    const { clinicianUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('x-dev-user-id', clinicianUser.clerkUserId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('POLICY_DENIED');
  });

  it('denies admin from accessing patient self endpoints directly with HTTP 403', async () => {
    const { adminUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/patients/me/records')
      .set('x-dev-user-id', adminUser.clerkUserId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('POLICY_DENIED');
  });
});
