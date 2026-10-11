# HackMatrix Unified Healthcare Platform — Complete Project Specification

## 1. Project Overview & Vision
HackMatrix is a decentralized, consent-driven healthcare management ecosystem architected to eliminate medical data fragmentation while strictly enforcing patient privacy, role-based access control (RBAC), and regulatory standards (NDHM/ABDM, HIPAA, and FHIR R4).

The platform connects three core stakeholders:
1. Patients / Citizens: Retain sovereign ownership of their personal health identifiers (ABHA), records, and dynamic single-use QR passes, holding granular authority to grant, approve, or revoke clinician access in real-time.
2. Clinicians / Doctors: Intake patients via camera or image optical QR scans, view scoped diagnostic charts, order tests, publish signed encounter notes, and execute break-glass emergency overrides with forensic auditing.
3. Healthcare Administrators: Monitor facility-wide aggregate disease analytics, bed occupancy, diagnostic trends, and immutable tamper-evident audit logs without ever having access to patients personal identifiable information (PII).

---

## 2. High-Level Architecture & Technology Stack

### Technology Stack
- Frontend: Native Vanilla JavaScript (ES6+), custom CSS design system, HTML5 Canvas QR Decoder (jsQR), Client-side QR generator (qrcode.js), PWA Service Worker caching.
- Backend: Node.js (v20+), TypeScript, Express.js REST API engine, Socket.IO real-time event broadcaster, Zod schema validation.
- Security: Native node:crypto scrypt password hashing with unique salts, HMAC-SHA256 signature chains on every audit log event.
- Database: MongoDB Atlas / Local MongoDB instance with Mongoose ORM, TTL expiration on ephemeral QR tokens, and role-scoped document filters.

---

## 3. Core Modules & System Workflows

### 3.1 Gateway HUB (index.html)
- Unified single access entry point for Patient, Clinician, and Administrator login.
- Strict cryptographic password verification with role mismatch prevention.
- Direct routing to role-specific dashboards (patient.html, clinician.html, admin.html).

### 3.2 Dynamic QR Pass & Real-Time Consent Flow
1. Dynamic Ephemeral QR Generation: Patient generates a single-use QR pass with a 5-minute time-to-live (TTL). Tokens burn immediately after resolution.
2. Instant Doctor Access Request on Scan: Clinician scans the QR pass. If active consent does not exist, the server automatically generates a pending Consent Grant in MongoDB and alerts the patient in real time.
3. Patient One-Click Approval UI: In the Consent tab of the Patient Portal, an Action Required card displays the clinician name, hospital department, purpose, and requested scopes with Approve and Deny buttons.
4. Live Polling & Auto-Unlocking Chart: While awaiting consent, the clinician view shows a live sync status. The clinician portal auto-checks every 3 seconds: as soon as the patient approves, the doctors screen automatically unlocks without manual refresh, displaying encounters, vitals, active prescriptions, and lab reports.

### 3.3 Clinical Scoping & Emergency Break-Glass Override
- Granular Category Scopes: Encounters, Observations (Vitals), Medications, Allergies, Diagnostic Reports, Care Plans.
- Break-Glass Emergency Protocol: Clinicians can execute an emergency override with mandatory justification (minimum 10 characters), triggering loudly flagged audit ledger records.

### 3.4 Administrative Portal & PII-Preserving Analytics
- Strict PII Protection: Administrators cannot access patient names, phone numbers, or private identities.
- Anonymized Diagnostic Metrics: Aggregate counts of chronic conditions (Bronchial Asthma, Diabetes Mellitus, Hypertension, Dermatology cases).
- Cryptographic Audit Ledger: Real-time inspection of system-wide access logs, QR verifications, and break-glass events with HMAC digital signatures.

---

## 4. User Credentials Reference Table

| Role | Name | Username / Email | Patient / Staff ID | Password | Clinical Profile / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Patient | Rohan Patel | rohan.deshmukh@hackmatrix.demo | HMX-P-28110 | Password@123 | Pulmonology / Asthma / Aspirin Allergy |
| Patient | Meera Nair | meera.nair@hackmatrix.demo | HMX-P-31877 | Password@123 | Cardiology / Hypertension / Sulfa Allergy |
| Patient | Ananya Sharma | ananya.sharma@hackmatrix.demo | HMX-P-20481 | Password@123 | Diabetes Mellitus / Penicillin Allergy |
| Patient | Priya Sen | priya.sen@hackmatrix.demo | HMX-P-45520 | Password@123 | Dermatology / Eczema |
| Clinician | Dr. Rohit Verma | rohit.verma@hackmatrix.demo | HMX-C-7781 | Password@123 | Emergency Medicine (Sunrise Multispecialty) |
| Clinician | Dr. Neha Kapoor | neha.kapoor@hackmatrix.demo | HMX-C-4420 | Password@123 | Internal Medicine (Sunrise Multispecialty) |
| Clinician | Dr. Anand Rao | anand.rao@hackmatrix.demo | HMX-C-9912 | Password@123 | Chief Medical Officer (City Medical Centre) |
| Admin | Administrator | admin.rao@hackmatrix.demo | HQ-ADM-01 | Password@123 | Master System & Compliance Administration |

---

## 5. Local Setup & Testing Instructions

### 5.1 Launch Backend Server
1. Open terminal in server/ directory.
2. Run: npm install
3. Run: npm run build
4. Run: npm start (Runs on http://localhost:4000)

### 5.2 Launch Frontend Web Client
1. Open terminal in root directory.
2. Run: npx serve -l 8080 . (Runs on http://localhost:8080/index.html)

### 5.3 Step-by-Step Flow Verification
1. Log into Patient Portal (rohan.deshmukh@hackmatrix.demo / Password@123).
2. Go to QR Pass tab and copy the dynamic token.
3. In another tab, log into Clinician Portal (rohit.verma@hackmatrix.demo / Password@123).
4. Click Scan Patient QR, select Rohan (P3) or paste the token, and click Resolve.
5. Switch back to Patient Portal Consent tab -> Click Approve & Grant Access.
6. Switch back to Clinician Portal -> Chart unlocks automatically within 3 seconds.