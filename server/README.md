# HackMatrix Healthcare Platform Backend (`server/`)

Authoritative backend service for the HackMatrix healthcare platform: patient mobile application, clinician mobile workflow, consent-controlled clinical access, QR authorization, disease surveillance, and privacy-preserving public health analytics.

> [!NOTE]
> **Data Model Notice**: The clinical resources in this platform are **FHIR-inspired** (Encounter, Observation, Condition, AllergyIntolerance, MedicationStatement, Immunization, DiagnosticReport, CarePlan). This backend does **not** claim official FHIR standard compliance.
>
> **Demo Data**: All seed and prototype data are synthetic and clearly labeled as **DEMO**.

---

## 1. Quick Start (< 5 minutes)

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB instance (local or MongoDB Atlas)

### Setup & Launch
```bash
# 1. Navigate to server directory
cd server

# 2. Copy environment configuration
cp .env.example .env

# 3. Install dependencies (if not already installed)
npm install

# 4. Seed demo data (Populates organizations, practitioners, patients, grants, audits)
npm run seed

# 5. Start development server
npm run dev
```

The API will be available at `http://localhost:4000/api/v1` and health check at `http://localhost:4000/health`.

---

## 2. Environment Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server listening port | `4000` |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `MONGODB_URI` | MongoDB connection URI (Atlas or local) | `mongodb://localhost:27017/hackmatrix` |
| `CLERK_SECRET_KEY` | Clerk Server SDK Secret Key | `sk_test_...` |
| `CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key | `pk_test_...` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000,http://localhost:5173,...` |
| `ANALYTICS_K_THRESHOLD` | K-anonymity suppression threshold | `5` |
| `DEV_PREVIEW` | Allows dev header/token authentication for non-prod | `true` (strictly disabled if `NODE_ENV=production`) |

---

## 3. Authentication & RBAC

Identity and roles are authoritative on the server:
- **Roles**: `PATIENT`, `CLINICIAN`, `ADMIN`.
- In **Production**:
  - The client provides a Clerk JWT in the `Authorization: Bearer <token>` header.
  - `@clerk/backend` verifies the token cryptographically.
  - The local `User` record in MongoDB provides the authoritative `role` and `orgId`.
- In **Development / Preview** (`DEV_PREVIEW=true`):
  - Pass the header `x-dev-user-id: <clerkUserId>` (e.g. `u1` for admin, `u2`/`u3` for clinician, `u4` for patient).
  - RBAC policies, organization boundaries, and audit logging remain 100% active and enforced.

---

## 4. Connect Front-End Applications

The backend serves all three experiences from a single unified API surface:

### Mobile Apps (React Native / Expo — Patient & Clinician)
In your Expo project (`.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Request pattern:
```typescript
import * as SecureStore from 'expo-secure-store';

async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('clerk_token');
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}
```

### Web Console (React + Vite — Admin)
In your Vite project (`.env`):
```env
VITE_API_URL=http://localhost:4000/api/v1
```

Request pattern:
```typescript
async function fetchAdminData(endpoint: string) {
  const token = await window.Clerk?.session?.getToken();
  const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
```

---

## 5. Security & Privacy Highlights

1. **Self-Scoping**: Patients can query only their own records (`/api/v1/patients/me/*`).
2. **Consent Gating**: Clinicians can only view records for which an active, unexpired `ConsentGrant` exists matching the permitted categories (`encounters`, `observations`, `medications`, etc.).
3. **Short-Lived QR Tokens**: Unguessable single-use tokens valid for 5 minutes (`300` seconds). Burned immediately upon resolution.
4. **Break-Glass Emergency Access**: Allows clinician access with mandatory justification (minimum 10 characters). Emits an immutable, loudly flagged `AuditEvent`.
5. **K-Anonymity Public Health Analytics**: Aggregate groups with count `< ANALYTICS_K_THRESHOLD` (default `5`) are automatically suppressed (`suppressed: true`, count hidden). Hidden counts are never exposed in exports, tooltips, or totals.
6. **Append-Only Auditing**: Every access to sensitive clinical data writes an immutable `AuditEvent`.

---

## 6. Testing

Run the automated test suite powered by Jest, Supertest, and an in-memory MongoDB runner:
```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```
