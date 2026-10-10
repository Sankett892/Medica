import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { QRAuthorization } from '../src/models/QRAuthorization.js';

describe('QR Authorization Token Lifecycle', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('generates a 5-minute short-lived unguessable QR token for patient', async () => {
    const { patientUser } = await seedTestContext();

    const res = await request(app)
      .post('/api/v1/patients/me/qr')
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.token).toMatch(/^HMX-QR-[A-F0-9]{6}$/);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.expiresInSeconds).toBe(300);
  });

  it('allows clinician to resolve a valid active QR token', async () => {
    const { patientUser, clinicianUser } = await seedTestContext();

    const qrRes = await request(app)
      .post('/api/v1/patients/me/qr')
      .set('x-dev-user-id', patientUser.clerkUserId);

    const token = qrRes.body.data.token;

    const resolveRes = await request(app)
      .post('/api/v1/clinicians/qr/resolve')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({ token });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.patient).toBeDefined();
    expect(resolveRes.body.data.patient.name).toBe('Ananya Sharma');
  });

  it('rejects an already used QR token with HTTP 409 QR_ALREADY_USED', async () => {
    const { patientUser, clinicianUser } = await seedTestContext();

    const qrRes = await request(app)
      .post('/api/v1/patients/me/qr')
      .set('x-dev-user-id', patientUser.clerkUserId);

    const token = qrRes.body.data.token;

    // First use succeeds
    await request(app)
      .post('/api/v1/clinicians/qr/resolve')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({ token });

    // Second use rejected
    const retryRes = await request(app)
      .post('/api/v1/clinicians/qr/resolve')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({ token });

    expect(retryRes.status).toBe(409);
    expect(retryRes.body.error.code).toBe('QR_ALREADY_USED');
  });

  it('rejects an expired QR token with HTTP 410 QR_EXPIRED', async () => {
    const { patientUser, clinicianUser, patient } = await seedTestContext();

    const expiredQR = await QRAuthorization.create({
      patientId: patient._id,
      token: 'HMX-QR-EXPIRED',
      status: 'active',
      createdBy: patientUser._id,
      expiresAt: new Date(Date.now() - 10000) // in the past
    });

    const res = await request(app)
      .post('/api/v1/clinicians/qr/resolve')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({ token: expiredQR.token });

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('QR_EXPIRED');
  });
});
