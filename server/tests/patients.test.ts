import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { Encounter } from '../src/models/Encounter.js';
import { Observation } from '../src/models/Observation.js';

describe('Patient Self-Service & Records Scoping', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('retrieves patient self profile matching prototype field vocabulary', async () => {
    const { patientUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/patients/me')
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Ananya Sharma');
    expect(res.body.data.id).toBe('HMX-P-20481');
    expect(res.body.data.bloodGroup).toBe('O+');
    expect(res.body.data.allergies).toContain('Penicillin');
  });

  it('retrieves patient records scoped strictly to own patient ID', async () => {
    const { patientUser, patient, patient2, org } = await seedTestContext();

    // Create an encounter for Patient 1
    await Encounter.create({
      patientId: patient._id,
      orgId: org._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Emergency encounter',
      summary: 'Stabilized and discharged',
      status: 'Completed',
      occurredAt: new Date(),
      fields: [{ k: 'Disposition', v: 'Discharged' }]
    });

    // Create an encounter for Patient 2
    await Encounter.create({
      patientId: patient2._id,
      orgId: org._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Private Consultation',
      summary: 'Secret diagnosis of Patient 2',
      status: 'Completed',
      occurredAt: new Date(),
      fields: [{ k: 'Disposition', v: 'Discharged' }]
    });

    const res = await request(app)
      .get('/api/v1/patients/me/records')
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('Emergency encounter');
    // Ensure Patient 2's data is never leaked to Patient 1!
    expect(JSON.stringify(res.body.data)).not.toContain('Secret diagnosis of Patient 2');
  });
});
