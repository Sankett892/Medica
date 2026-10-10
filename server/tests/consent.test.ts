import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { ConsentGrant } from '../src/models/ConsentGrant.js';

describe('Consent Management & Lifecycle Transitions', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('allows patient to create a scoped, time-limited consent grant', async () => {
    const { patientUser } = await seedTestContext();

    const payload = {
      recipient: 'Dr. Neha Kapoor',
      role: 'Primary care physician',
      org: 'Sunrise Multispecialty Hospital',
      scope: ['Encounters', 'Medications', 'Care plans'],
      purpose: 'Ongoing care management',
      validityDays: 30
    };

    const res = await request(app)
      .post('/api/v1/patients/me/grants')
      .set('x-dev-user-id', patientUser.clerkUserId)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.recipient).toBe('Dr. Neha Kapoor');
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.scope).toEqual(payload.scope);
  });

  it('allows patient to revoke an active consent grant', async () => {
    const { patientUser, patient, org } = await seedTestContext();

    const grant = await ConsentGrant.create({
      patientId: patient._id,
      recipient: 'Wellness Physio',
      role: 'Physiotherapy (organization)',
      org: 'Wellness Physio Clinic',
      orgId: org._id,
      scope: ['Encounters'],
      purpose: 'Physiotherapy assessment',
      start: '10 Jul 2026, 11:00',
      expires: '30 days',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: patientUser._id
    });

    const res = await request(app)
      .post(`/api/v1/patients/me/grants/${grant._id}/revoke`)
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('revoked');

    const updated = await ConsentGrant.findById(grant._id);
    expect(updated?.status).toBe('revoked');
    expect(updated?.revokedAt).toBeDefined();
  });
});
