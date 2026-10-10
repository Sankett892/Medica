import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/models/Organization.js';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Practitioner } from '../src/models/Practitioner.js';
import { Encounter } from '../src/models/Encounter.js';
import { Observation } from '../src/models/Observation.js';
import { ClinicalResource } from '../src/models/ClinicalResource.js';
import { ConsentGrant } from '../src/models/ConsentGrant.js';
import { QRAuthorization } from '../src/models/QRAuthorization.js';
import { AuditEvent } from '../src/models/AuditEvent.js';
import { SystemStatus } from '../src/models/SystemStatus.js';
import { AnalyticsSnapshot } from '../src/models/AnalyticsSnapshot.js';

async function seed() {
  console.log('[Seed] Starting HackMatrix DEMO dataset population...');
  await connectDB();

  // Clear existing collections for idempotent seeding
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Patient.deleteMany({}),
    Practitioner.deleteMany({}),
    Encounter.deleteMany({}),
    Observation.deleteMany({}),
    ClinicalResource.deleteMany({}),
    ConsentGrant.deleteMany({}),
    QRAuthorization.deleteMany({}),
    AuditEvent.deleteMany({}),
    SystemStatus.deleteMany({}),
    AnalyticsSnapshot.deleteMany({})
  ]);

  console.log('[Seed] Cleared existing records.');

  // 1. Organizations
  const orgSunrise = await Organization.create({
    name: 'Sunrise Multispecialty Hospital',
    type: 'Hospital',
    region: 'North',
    facilities: ['Emergency Wing', 'Outpatient Dept', 'Diagnostic Imaging'],
    status: 'Active'
  });

  const orgCity = await Organization.create({
    name: 'City Medical Centre',
    type: 'Hospital',
    region: 'North',
    facilities: ['Family Care', 'Radiology Suite'],
    status: 'Active'
  });

  const orgHQ = await Organization.create({
    name: 'HQ',
    type: 'HQ',
    region: 'Central',
    facilities: ['Surveillance Centre'],
    status: 'Active'
  });

  // 2. Practitioners
  const practRohit = await Practitioner.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-C-7781'],
    name: 'Dr. Rohit Verma',
    specialty: 'Emergency Medicine',
    dept: 'Emergency Medicine',
    licenseNo: 'MED-7781-DEMO',
    facilities: ['Sunrise Multispecialty Hospital']
  });

  const practNeha = await Practitioner.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-C-4420'],
    name: 'Dr. Neha Kapoor',
    specialty: 'Internal Medicine',
    dept: 'Primary Care',
    licenseNo: 'MED-4420-DEMO',
    facilities: ['Sunrise Multispecialty Hospital']
  });

  // 3. Patients (6 demo patients)
  const patientAnanya = await Patient.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-P-20481'],
    name: 'Ananya Sharma',
    dob: '14 Mar 1991',
    age: 34,
    sex: 'Female',
    bloodType: 'O+',
    phone: '+91 ••••• •4321',
    abha: '••••-••••-4821',
    allergies: ['Penicillin'],
    facility: 'Sunrise Multispecialty Hospital',
    primaryClinicianId: practNeha._id
  });

  const patientMeera = await Patient.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-P-31877'],
    name: 'Meera Nair',
    dob: '22 Jun 1979',
    age: 47,
    sex: 'Female',
    bloodType: 'B+',
    phone: '+91 ••••• •8821',
    abha: '••••-••••-3187',
    allergies: ['Sulfa drugs'],
    facility: 'Sunrise Multispecialty Hospital'
  });

  const patientRohan = await Patient.create({
    orgId: orgCity._id,
    identifiers: ['HMX-P-28110'],
    name: 'Rohan Patel',
    dob: '05 Jan 1985',
    age: 41,
    sex: 'Male',
    bloodType: 'A+',
    allergies: ['Aspirin'],
    facility: 'City Medical Centre'
  });

  const patientPriya = await Patient.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-P-45520'],
    name: 'Priya Sen',
    dob: '18 Nov 1995',
    age: 30,
    sex: 'Female',
    bloodType: 'AB+',
    allergies: [],
    facility: 'Sunrise Multispecialty Hospital'
  });

  const patientVikram = await Patient.create({
    orgId: orgCity._id,
    identifiers: ['HMX-P-50123'],
    name: 'Vikram Joshi',
    dob: '10 Feb 1968',
    age: 58,
    sex: 'Male',
    bloodType: 'O-',
    allergies: ['Latex'],
    facility: 'City Medical Centre'
  });

  const practAnand = await Practitioner.create({
    orgId: orgCity._id,
    identifiers: ['HMX-C-9912'],
    name: 'Dr. Anand Rao',
    specialty: 'Infectious Disease',
    dept: 'Infectious Disease & Epidemiology',
    licenseNo: 'MED-9912-DEMO',
    facilities: ['City Medical Centre']
  });

  const patientSara = await Patient.create({
    orgId: orgSunrise._id,
    identifiers: ['HMX-P-61294'],
    name: 'Sara Khan',
    dob: '09 Aug 2002',
    age: 24,
    sex: 'Female',
    bloodType: 'B-',
    allergies: [],
    facility: 'Sunrise Multispecialty Hospital'
  });

  // 4. Users (linking roles)
  const userAdmin = await User.create({
    clerkUserId: 'u1',
    role: 'ADMIN',
    name: 'admin.rao',
    email: 'admin.rao@hackmatrix.demo',
    orgId: orgHQ._id,
    status: 'Active'
  });

  const userClinicianNeha = await User.create({
    clerkUserId: 'u2',
    role: 'CLINICIAN',
    name: 'Dr. Neha Kapoor',
    email: 'neha.kapoor@hackmatrix.demo',
    orgId: orgSunrise._id,
    linkedPractitionerId: practNeha._id,
    status: 'Active'
  });

  const userClinicianRohit = await User.create({
    clerkUserId: 'u3',
    role: 'CLINICIAN',
    name: 'Dr. Rohit Verma',
    email: 'rohit.verma@hackmatrix.demo',
    orgId: orgSunrise._id,
    linkedPractitionerId: practRohit._id,
    status: 'Active'
  });

  const userPatientAnanya = await User.create({
    clerkUserId: 'u4',
    role: 'PATIENT',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@hackmatrix.demo',
    linkedPatientId: patientAnanya._id,
    status: 'Active'
  });

  const userPatientMeera = await User.create({
    clerkUserId: 'u5',
    role: 'PATIENT',
    name: 'Meera Nair',
    email: 'meera.nair@hackmatrix.demo',
    linkedPatientId: patientMeera._id,
    status: 'Active'
  });

  const userPatientRohan = await User.create({
    clerkUserId: 'u6',
    role: 'PATIENT',
    name: 'Rohan Patel',
    email: 'rohan.deshmukh@hackmatrix.demo',
    linkedPatientId: patientRohan._id,
    status: 'Active'
  });

  const userClinicianAnand = await User.create({
    clerkUserId: 'u7',
    role: 'CLINICIAN',
    name: 'Dr. Anand Rao',
    email: 'anand.rao@hackmatrix.demo',
    orgId: orgCity._id,
    linkedPractitionerId: practAnand._id,
    status: 'Active'
  });

  // 5. Encounters for Ananya
  await Encounter.create([
    {
      patientId: patientAnanya._id,
      clinicianId: practRohit._id,
      clinicianName: 'Dr. Rohit Verma',
      orgId: orgSunrise._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Emergency encounter',
      summary: 'Acute allergic reaction; stabilized, observed and discharged with advice.',
      status: 'Completed',
      occurredAt: new Date('2026-09-12T18:40:00Z'),
      fields: [
        { k: 'Encounter type', v: 'Emergency (OPD)' },
        { k: 'Disposition', v: 'Discharged home' },
        { k: 'Follow-up', v: 'Review in 7 days' }
      ]
    },
    {
      patientId: patientAnanya._id,
      clinicianId: practNeha._id,
      clinicianName: 'Dr. Neha Kapoor',
      orgId: orgSunrise._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Outpatient consultation',
      summary: 'Routine hypertension review; medication continued.',
      status: 'Completed',
      occurredAt: new Date('2026-08-02T10:00:00Z'),
      fields: [
        { k: 'Encounter type', v: 'OPD follow-up' },
        { k: 'Plan', v: 'Continue current therapy' }
      ]
    }
  ]);

  // 6. Observations & Vitals for Ananya
  await Observation.create([
    {
      patientId: patientAnanya._id,
      category: 'vital',
      code: 'BP',
      display: 'Blood pressure',
      value: '118/76',
      unit: 'mmHg',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Nurse station',
      effectiveAt: new Date('2026-09-12T17:05:00Z'),
      fields: [{ k: 'Blood pressure', v: '118/76 mmHg' }]
    },
    {
      patientId: patientAnanya._id,
      category: 'vital',
      code: 'HR',
      display: 'Heart rate',
      value: '72',
      unit: 'bpm',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Nurse station',
      effectiveAt: new Date('2026-09-12T17:05:00Z'),
      fields: [{ k: 'Heart rate', v: '72 bpm' }]
    },
    {
      patientId: patientAnanya._id,
      category: 'measurement',
      code: 'BMI',
      display: 'BMI',
      value: '22.4',
      unit: 'kg/m²',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Nurse station',
      effectiveAt: new Date('2026-08-02T09:30:00Z'),
      fields: [{ k: 'BMI', v: '22.4 kg/m²' }]
    }
  ]);

  // 7. Clinical Resources (medications, allergies, reports, immunizations, careplans)
  await ClinicalResource.create([
    {
      patientId: patientAnanya._id,
      cat: 'medications',
      type: 'Active medication',
      date: '02 Aug 2026',
      occurredAt: new Date('2026-08-02T10:12:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Amlodipine 5 mg once daily for hypertension.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Amlodipine' },
        { k: 'Dose', v: '5 mg' },
        { k: 'Frequency', v: 'Once daily' },
        { k: 'Route', v: 'Oral' }
      ]
    },
    {
      patientId: patientAnanya._id,
      cat: 'allergies',
      type: 'Allergy',
      date: '18 Jan 2019',
      occurredAt: new Date('2019-01-18T12:00:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. S. Iyer',
      summary: 'Penicillin — rash and swelling. Recorded as a high-severity allergy.',
      status: 'Active',
      fields: [
        { k: 'Substance', v: 'Penicillin' },
        { k: 'Reaction', v: 'Urticaria, angioedema' },
        { k: 'Severity', v: 'High' }
      ]
    },
    {
      patientId: patientAnanya._id,
      cat: 'reports',
      type: 'Laboratory report',
      date: '12 Sep 2026',
      occurredAt: new Date('2026-09-12T20:02:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Rohit Verma',
      summary: 'Complete blood count within reference ranges; mild eosinophilia.',
      status: 'Final',
      fields: [
        { k: 'Panel', v: 'Complete blood count' },
        { k: 'Result', v: 'Within range' },
        { k: 'Note', v: 'Mild eosinophilia' }
      ]
    },
    {
      patientId: patientAnanya._id,
      cat: 'immunizations',
      type: 'Immunization',
      date: '04 Mar 2025',
      occurredAt: new Date('2025-03-04T11:00:00Z'),
      facility: 'Community Health Centre',
      clinician: 'Vaccination desk',
      summary: 'Tetanus–diphtheria booster administered.',
      status: 'Completed',
      fields: [
        { k: 'Vaccine', v: 'Td booster' },
        { k: 'Dose', v: 'Booster' },
        { k: 'Site', v: 'Left deltoid' }
      ]
    },
    {
      patientId: patientAnanya._id,
      cat: 'careplans',
      type: 'Care plan',
      date: '02 Aug 2026',
      occurredAt: new Date('2026-08-02T10:00:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Hypertension management plan: lifestyle, monitoring and review.',
      status: 'Active',
      fields: [
        { k: 'Goal', v: 'Maintain BP < 130/80' },
        { k: 'Review', v: 'Every 3 months' },
        { k: 'Owner', v: 'Primary care' }
      ]
    }
  ]);

  // 8. Consent Grants (Active, Pending, Expired, Revoked)
  await ConsentGrant.create([
    {
      patientId: patientAnanya._id,
      granteeId: practRohit._id,
      recipient: 'Dr. Rohit Verma',
      role: 'Emergency physician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      scope: ['Encounters', 'Observations', 'Allergies', 'Medications'],
      purpose: 'Emergency treatment',
      start: '12 Sep 2026, 16:20',
      expires: '19 Sep 2027, 16:20',
      status: 'active',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: userPatientAnanya._id
    },
    {
      patientId: patientAnanya._id,
      granteeId: practNeha._id,
      recipient: 'Dr. Neha Kapoor',
      role: 'Primary care physician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      scope: ['Encounters', 'Medications', 'Care plans'],
      purpose: 'Ongoing care management',
      start: '02 Aug 2026, 10:00',
      expires: '02 Feb 2027, 10:00',
      status: 'active',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 1000),
      createdBy: userPatientAnanya._id
    },
    {
      patientId: patientAnanya._id,
      recipient: 'City Diagnostics',
      role: 'Laboratory (organization)',
      org: 'City Diagnostics Lab',
      scope: ['Reports'],
      purpose: 'Laboratory testing',
      start: 'Requested 08 Oct 2026',
      expires: 'Pending approval',
      status: 'pending',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 1000),
      createdBy: userPatientAnanya._id
    },
    {
      patientId: patientAnanya._id,
      recipient: 'Dr. S. Iyer',
      role: 'Dermatologist',
      org: 'City Medical Centre',
      scope: ['Encounters', 'Allergies'],
      purpose: 'Allergy consultation',
      start: '02 Mar 2026, 09:00',
      expires: '02 Apr 2026, 09:00',
      status: 'expired',
      grantedAt: new Date('2026-03-02T09:00:00Z'),
      expiresAt: new Date('2026-04-02T09:00:00Z'),
      createdBy: userPatientAnanya._id
    },
    {
      patientId: patientAnanya._id,
      recipient: 'Wellness Physio',
      role: 'Physiotherapy (organization)',
      org: 'Wellness Physio Clinic',
      scope: ['Encounters'],
      purpose: 'Physiotherapy assessment',
      start: '10 Jul 2026, 11:00',
      expires: 'Revoked 14 Jul 2026, 15:30',
      status: 'revoked',
      grantedAt: new Date('2026-07-10T11:00:00Z'),
      expiresAt: new Date('2026-07-20T11:00:00Z'),
      revokedAt: new Date('2026-07-14T15:30:00Z'),
      createdBy: userPatientAnanya._id
    },
    // Grant for Meera Nair (clinicianPatient in prototype)
    {
      patientId: patientMeera._id,
      granteeId: practRohit._id,
      recipient: 'Dr. Rohit Verma',
      role: 'Emergency physician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      scope: ['Encounters', 'Observations', 'Allergies', 'Medications'],
      purpose: 'Emergency access grant',
      start: '12 Sep 2026, 16:20',
      expires: '13 Sep 2027, 16:20',
      status: 'active',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: userPatientAnanya._id
    }
  ]);

  // 9. QR Authorization Token
  await QRAuthorization.create({
    patientId: patientAnanya._id,
    token: 'HMX-QR-DEMO-7F3A91',
    status: 'active',
    createdBy: userPatientAnanya._id,
    expiresAt: new Date(Date.now() + 300 * 1000)
  });

  // 10. Audit Events
  await AuditEvent.create([
    {
      actorId: userAdmin._id,
      actor: 'pipeline-service',
      actorRole: 'System',
      org: '—',
      action: 'Aggregate refresh completed',
      resource: 'Analytics store',
      outcome: 'success',
      ts: '10 Oct 2026, 06:15'
    },
    {
      actorId: userClinicianNeha._id,
      actor: 'Dr. Neha Kapoor',
      actorRole: 'Clinician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      patientId: patientAnanya._id,
      action: 'Viewed patient records',
      resource: 'Encounter',
      outcome: 'success',
      ts: '10 Oct 2026, 05:40'
    },
    {
      actorId: userClinicianRohit._id,
      actor: 'Dr. Rohit Verma',
      actorRole: 'Clinician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      patientId: patientAnanya._id,
      action: 'Viewed records',
      resource: 'Allergies, Observations',
      outcome: 'granted',
      ts: '12 Sep 2026, 16:24'
    },
    {
      actorId: userClinicianRohit._id,
      actor: 'Dr. Rohit Verma',
      actorRole: 'Clinician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      patientId: patientMeera._id,
      action: 'Emergency access',
      resource: 'Patient record',
      purpose: 'Acute anaphylaxis presentation in ED',
      outcome: 'success',
      ts: '09 Oct 2026, 16:20'
    }
  ]);

  // 11. System Status
  await SystemStatus.create([
    { name: 'API gateway', state: 'operational', detail: 'Response 84 ms median' },
    { name: 'Database (MongoDB Atlas)', state: 'operational', detail: 'Primary + 2 replicas' },
    { name: 'Aggregate refresh (ETL)', state: 'operational', detail: 'Last run 10 Oct 06:15 IST' },
    { name: 'Change-stream watcher', state: 'degraded', detail: 'Consumer lag 42 s' },
    { name: 'Socket.IO gateway', state: 'operational', detail: '1,284 subscribers' }
  ]);

  // 12. Analytics Snapshots with suppressed cohort Demonstration
  await AnalyticsSnapshot.create([
    {
      snapshotType: 'region',
      region: 'North Region',
      count: 1284,
      suppressed: false,
      kThreshold: 5,
      period: 'Wk 40'
    },
    {
      snapshotType: 'region',
      region: 'Remote Island District',
      count: 3,
      suppressed: true, // Cohort < 5 is suppressed!
      kThreshold: 5,
      period: 'Wk 40'
    }
  ]);

  console.log('[Seed] Completed successfully! All demo datasets are clearly labeled and ready.');
  await disconnectDB();
}

seed().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
