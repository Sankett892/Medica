import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';

describe('Admin Console Analytics & K-Anonymity Suppression', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('serves admin overview metrics and surveillance trends to authorized ADMIN', async () => {
    const { adminUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('x-dev-user-id', adminUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.trend.ili).toBeDefined();
  });

  it('enforces k-anonymity: cohorts below threshold are suppressed and count is null', async () => {
    const { adminUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/admin/geographic?k=5')
      .set('x-dev-user-id', adminUser.clerkUserId);

    expect(res.status).toBe(200);
    const regions = res.body.data.regions;

    // 'Remote Island District' has 3 cases (< 5)
    const suppressedRegion = regions.find((r: any) => r.name === 'Remote Island District');
    expect(suppressedRegion).toBeDefined();
    expect(suppressedRegion.suppressed).toBe(true);
    expect(suppressedRegion.cases).toBeNull(); // Never leaks actual value!

    // 'North Region' has 1284 cases (>= 5)
    const normalRegion = regions.find((r: any) => r.name === 'North Region');
    expect(normalRegion.suppressed).toBe(false);
    expect(normalRegion.cases).toBe(1284);
  });
});
