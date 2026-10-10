import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { AuditEvent } from '../src/models/AuditEvent.js';

describe('Emergency Break-Glass Access', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('rejects break-glass request if clinical justification is less than 10 characters', async () => {
    const { clinicianUser, patient } = await seedTestContext();

    const res = await request(app)
      .post('/api/v1/clinicians/emergency')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({
        patient: patient.identifiers[0],
        justification: 'urgent' // < 10 chars
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows emergency access with valid justification and writes an immutable audit event', async () => {
    const { clinicianUser, patient } = await seedTestContext();

    const justification = 'Severe acute trauma presentation requiring immediate clinical records review';

    const res = await request(app)
      .post('/api/v1/clinicians/emergency')
      .set('x-dev-user-id', clinicianUser.clerkUserId)
      .send({
        patient: patient.identifiers[0],
        justification
      });

    expect(res.status).toBe(201);
    expect(res.body.data.emergencyAccessId).toBeDefined();
    expect(res.body.data.patient.name).toBe('Ananya Sharma');

    // Verify audit event written
    const audit = await AuditEvent.findOne({
      actorId: clinicianUser._id,
      action: 'Emergency access'
    });
    expect(audit).toBeDefined();
    expect(audit?.purpose).toBe(justification);
    expect(audit?.outcome).toBe('success');
  });
});
