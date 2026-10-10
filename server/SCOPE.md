# HackMatrix Backend Scope & Extensibility Guide

## 1. API Version & Compatibility Policy
- **Current Version**: `/api/v1`
- **Compatibility Contract**:
  - The API follows semantic versioning principles with strict backwards compatibility for `/api/v1`.
  - Clients (Patient Mobile App, Clinician Mobile App, Admin Console, and upcoming React Native/Expo and React+Vite clients) can depend on the standardized response envelope:
    - Success: `{ "data": <payload>, "meta"?: { "page", "pageSize", "total" } }`
    - Error: `{ "error": { "code": "SNAKE_CASE", "message": "human readable", "details"?: [...] } }`
  - Field removal, field renaming, or altering authorization semantics within `/api/v1` is strictly prohibited.
  - New additive fields may be introduced to response objects without version bumping.

---

## 2. Recipe: How to Add a New Resource / Module
Adding a new healthcare resource or feature module is a mechanical, predictable 7-step process (~10 files, never an architectural rewrite):

### Step 1: Define Mongoose Model
Create `src/models/<Entity>.ts`:
- Define TypeScript interface and Mongoose schema.
- Include required indexes (e.g. `orgId`, `patientId`, `createdAt`, or search text indexes).
- Export model and export document interface.

### Step 2: Define Validation Schemas
Create `src/modules/<feature>/schema.ts`:
- Define Zod schemas for query parameters, path params, and request bodies.
- Export inferred types using `z.infer<typeof ...>`.

### Step 3: Implement Feature Service
Create `src/modules/<feature>/service.ts`:
- Pure business logic and database interactions.
- Enforce organization and patient boundaries in queries (e.g., `{ _id: id, orgId: user.orgId }`).
- Never perform HTTP request/response handling in the service.

### Step 4: Implement Controller
Create `src/modules/<feature>/controller.ts`:
- Validate input using Zod schemas.
- Call the service method.
- Return standardized success response `{ data: ... }`.
- Forward errors to Express `next(err)`.

### Step 5: Implement Routes & Policy Guards
Create `src/modules/<feature>/routes.ts`:
- Mount routes on an `express.Router()`.
- Apply `requireAuth` middleware.
- Apply RBAC policy guard (e.g., `allow('CLINICIAN', 'ADMIN')`, `patientSelfOnly`, `sameOrgOnly`).
- Attach `auditLog(...)` middleware for any clinical reads or state-changing operations.
- Attach route handler.

### Step 6: Register Route in Central Router
In `src/routes.ts`:
- Import and register: `router.use('/<feature>', featureRouter);`.

### Step 7: Update Documentation & Tests
- Add endpoint path, parameters, and responses to `openapi.yaml`.
- Create `tests/<feature>.test.ts` verifying authentication, authorization deny paths, validation rejections, and expected payload responses.
- Update `CHANGELOG.md` under `[Added]`.

---

## 3. How to Add a New API Version (v2)
When breaking changes or significant conceptual redesigns are required:
1. Keep `/api/v1` intact and active in `src/routes.ts` or mount `v1Router` under `/api/v1`.
2. Create `src/routes.v2.ts` and mount it under `/api/v2` in `src/app.ts`.
3. Reuse shared Mongoose models (`src/models/*`) and shared domain services wherever business logic is unchanged.
4. Introduce version-specific controllers and schemas in `src/modules/<feature>/v2/` only where request or response contracts differ.
5. Provide a deprecation notice header (`Deprecation: true`, `Sunset: <date>`) on v1 endpoints if planning eventual retirement.

---

## 4. Extension Points Architecture
The platform is designed with clear modular extension points:

### A. Policy Guards Registry (`src/middleware/rbac.ts`)
- Fine-grained permission checks are composed as Express middleware:
  - `allow(...roles: UserRole[])`: Role check.
  - `patientSelfOnly`: Confirms patient user matches requested patient ID.
  - `sameOrgOnly`: Confirms clinician/admin belongs to the target resource's organization.
  - `breakGlassEmergencyAllowed`: Validates emergency break-glass preconditions.

### B. Audit Middleware (`src/middleware/audit.ts`)
- Pluggable audit logger capturing: `actorId`, `actorRole`, `orgId`, `patientId`, `action`, `resourceType`, `resourceId`, `purpose`, `result`, `ip`, and timestamp.
- Writes to append-only `AuditEvent` collection; cannot be mutated or purged by application APIs.

### C. Analytics Aggregation Registry (`src/modules/analytics/`)
- Pre-aggregated snapshots stored in `AnalyticsSnapshot`.
- K-anonymity filter middleware (`enforceKAnonymity`) automatically strips cohorts with count `< ANALYTICS_K_THRESHOLD` and flags them with `suppressed: true`.

### D. Real-Time Event Bus (`src/config/socket.ts`)
- Socket.IO gateway joined to authenticated organization rooms (`org:<orgId>`) and patient rooms (`patient:<patientId>`).
- Emits real-time notifications for:
  - `grant:created`
  - `grant:revoked`
  - `access:recorded`
  - `qr:scanned`
- Degrades gracefully if change streams are disabled or unavailable.

---

## 5. Change Scope Classification
To prevent unintended regressions or data corruption, categorize changes into three tiers:

### (a) Safe Additive Changes (No migration needed)
- Adding new optional fields to existing Mongoose models.
- Adding new query filters or sorting options to existing list endpoints.
- Introducing a new module/resource following the recipe above.
- Adding new read-only analytics views or metrics.

### (b) Changes Requiring a Migration
- Renaming fields in existing MongoDB collections.
- Introducing required fields on existing models (backfilling default values for historical records).
- Converting single-reference fields to arrays (e.g., single clinician to multiple care team members).
- Modifying audit event schema or historical analytics aggregations.
- *Execution*: Write an idempotent migration script under `server/scripts/migrations/` and run prior to deploying the server update.

### (c) Breaking Changes (Requires API versioning)
- Altering the shape of existing endpoint responses (e.g. replacing arrays with objects).
- Restricting existing permissible values or changing enum identifiers.
- Increasing authentication requirements on previously public or permissive endpoints.
- *Execution*: Stage breaking changes under `/api/v2`, deploy alongside `/api/v1`, and coordinate client upgrades with deprecation warnings.
