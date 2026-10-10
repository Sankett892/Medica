import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';
import { AuditEvent } from '../src/models/AuditEvent.js';

describe('Audit Trail & Logging On Sensitive Clinical Reads', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('automatically writes an append-only AuditEvent when patient reads sensitive summary data', async () => {
    const { patientUser } = await seedTestContext();

    const beforeCount = await AuditEvent.countDocuments();

    await request(app)
      .get('/api/v1/patients/me/summary')
      .set('x-dev-user-id', patientUser.clerkUserId);

    // Wait a brief tick for finish listener
    await new Promise(r => setTimeout(r, 100));

    const afterCount = await AuditEvent.countDocuments();
    expect(afterCount).toBeGreaterThan(beforeCount);

    const latest = await AuditEvent.findOne({ actorId: patientUser._id }).sort({ at: -1 });
    expect(latest).toBeDefined();
    expect(latest?.action).toBe('Viewed health summary');
    expect(latest?.outcome).toBe('granted');
  });

  it('serves read-only audit log in admin console with search filtering', async () => {
    const { adminUser } = await seedTestContext();

    // Create demo audit entries
    await AuditEvent.create({
      actor: 'admin.rao',
      actorRole: 'Admin',
      action: 'Exported aggregate report',
      resource: 'Surveillance dataset',
      outcome: 'success',
      ts: '10 Oct 2026, 04:12'
    });

    const res = await request(app)
      .get('/api/v1/admin/audit?q=Surveillance')
      .set('x-dev-user-id', adminUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].resource).toBe('Surveillance dataset');
  });
});
