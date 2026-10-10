import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { ConsentGrant } from '../src/models/ConsentGrant.js';
import { Encounter } from '../src/models/Encounter.js';
import { ClinicalResource } from '../src/models/ClinicalResource.js';

describe('Clinician Consent-Gated Clinical Access', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('blocks clinician access to patient records when no consent grant exists (HTTP 403 NO_ACTIVE_CONSENT)', async () => {
    const { clinicianUser, patient } = await seedTestContext();

    const res = await request(app)
      .get(`/api/v1/clinicians/patients/${patient._id}/records`)
      .set('x-dev-user-id', clinicianUser.clerkUserId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_ACTIVE_CONSENT');
  });

  it('filters clinical records strictly by granted scope categories when active consent exists', async () => {
    const { clinicianUser, patientUser, patient, org } = await seedTestContext();

    // Create an encounter record
    await Encounter.create({
      patientId: patient._id,
      orgId: org._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Emergency encounter',
      summary: 'Stabilized in ED',
      status: 'Completed',
      occurredAt: new Date(),
      fields: [{ k: 'Type', v: 'Emergency' }]
    });

    // Create a medication record
    await ClinicalResource.create({
      patientId: patient._id,
      cat: 'medications',
      type: 'Active medication',
      date: '02 Aug 2026',
      occurredAt: new Date(),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Amlodipine 5 mg',
      status: 'Active',
      fields: [{ k: 'Drug', v: 'Amlodipine' }]
    });

    // Create an allergy record (NOT in granted scope!)
    await ClinicalResource.create({
      patientId: patient._id,
      cat: 'allergies',
      type: 'Allergy',
      date: '18 Jan 2019',
      occurredAt: new Date(),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. S. Iyer',
      summary: 'Penicillin allergy',
      status: 'Active',
      fields: [{ k: 'Reaction', v: 'Urticaria' }]
    });

    // Active grant with scope ONLY ['Encounters', 'Medications']
    await ConsentGrant.create({
      patientId: patient._id,
      granteeId: clinicianUser._id,
      recipient: clinicianUser.name,
      role: 'Emergency physician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: org._id,
      scope: ['Encounters', 'Medications'],
      purpose: 'Emergency treatment',
      start: '12 Sep 2026',
      expires: '30 days',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: patientUser._id
    });

    const res = await request(app)
      .get(`/api/v1/clinicians/patients/${patient._id}/records`)
      .set('x-dev-user-id', clinicianUser.clerkUserId);

    expect(res.status).toBe(200);
    const returnedCats = res.body.data.map((r: any) => r.cat);
    expect(returnedCats).toContain('encounters');
    expect(returnedCats).toContain('medications');
    // 'allergies' was not granted, so it must NOT be returned!
    expect(returnedCats).not.toContain('allergies');
  });
});
