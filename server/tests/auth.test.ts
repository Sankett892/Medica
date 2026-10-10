import request from 'supertest';
import { app } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB, seedTestContext } from './helpers/db.js';

describe('Auth Middleware & Endpoints', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('rejects unauthenticated requests with HTTP 401 and standard error envelope', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('resolves authenticated user via DEV_PREVIEW mode header', async () => {
    const { patientUser } = await seedTestContext();

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-dev-user-id', patientUser.clerkUserId);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.role).toBe('PATIENT');
    expect(res.body.data.name).toBe('Ananya Sharma');
  });

  it('allows idempotent user synchronization via /api/v1/auth/sync-user', async () => {
    const payload = {
      clerkUserId: 'new-clerk-user-123',
      name: 'Dr. Test Specialist',
      email: 'specialist@test.demo',
      role: 'CLINICIAN'
    };

    const res = await request(app)
      .post('/api/v1/auth/sync-user')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.clerkUserId).toBe('new-clerk-user-123');
    expect(res.body.data.role).toBe('CLINICIAN');

    // Sync again (idempotent update)
    const res2 = await request(app)
      .post('/api/v1/auth/sync-user')
      .send({ ...payload, name: 'Dr. Test Specialist Updated' });

    expect(res2.status).toBe(201);
    expect(res2.body.data.name).toBe('Dr. Test Specialist Updated');
  });
});
