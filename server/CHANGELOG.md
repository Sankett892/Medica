# Changelog

All notable changes to the HackMatrix Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-10

### Added
- Core backend server architecture (`server/`) with Node.js, Express, strict TypeScript, and Mongoose.
- Environment configuration with Zod validation (`src/config/env.ts`).
- Secure MongoDB Atlas connection setup with connection pooling (`src/config/db.ts`).
- Clerk authentication middleware (`src/middleware/auth.ts`) with token verification and `DEV_PREVIEW` fallback for non-production environments.
- RBAC and policy evaluation middleware (`src/middleware/rbac.ts`) for `PATIENT`, `CLINICIAN`, and `ADMIN` roles.
- Append-only audit logger (`src/middleware/audit.ts`) capturing all clinical data access and administrative operations.
- FHIR-inspired Mongoose models:
  - `User`, `Organization`, `Patient`, `Practitioner`, `Encounter`, `Observation`, `ClinicalResource`
  - `ConsentGrant`, `QRAuthorization`, `EmergencyAccess`, `AuditEvent`, `AnalyticsSnapshot`, `SystemStatus`
- Patient vertical slice (`/api/v1/patients`):
  - Self-scoped identity, vitals, summary, and clinical records
  - Category filtering matching prototype (`encounters`, `observations`, `medications`, `allergies`, `reports`, `immunizations`, `careplans`)
  - Consent grants management (`active`, `pending`, `expired`, `revoked`) and server-side revocation
  - Short-lived QR token generation (5-minute TTL) and regeneration
- Clinician vertical slice (`/api/v1/clinicians`):
  - Organization-scoped dashboard and patient search
  - Single-use QR token resolution (`/qr/resolve`)
  - Consent-gated patient clinical records
  - Break-glass emergency access (`/emergency`) requiring clinical justification >= 10 characters
- Admin vertical slice (`/api/v1/admin`):
  - Disease surveillance analytics (`ili`, `dengue`, `add`) with observed vs forecast trends
  - Regional and facility reporting
  - K-anonymity privacy enforcement (`ANALYTICS_K_THRESHOLD`, default 5)
  - Read-only system audit viewer
  - Organization, user governance, and system status endpoints
- Socket.IO gateway with authenticated rooms for real-time consent and access events.
- Idempotent seed script (`scripts/seed.ts`) creating labeled DEMO datasets.
- Test suite with Jest, Supertest, and in-memory MongoDB.
- OpenAPI 3.0 specification (`openapi.yaml`).
- Extensibility guide and change scope documentation (`SCOPE.md`).
