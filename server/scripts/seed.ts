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
import { hashPassword } from '../src/modules/auth/service.js';

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
  const defaultPw = hashPassword('Password@123');

  const userAdmin = await User.create({
    clerkUserId: 'u1',
    role: 'ADMIN',
    name: 'admin.rao',
    email: 'admin.rao@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    orgId: orgHQ._id,
    status: 'Active'
  });

  const userClinicianNeha = await User.create({
    clerkUserId: 'u2',
    role: 'CLINICIAN',
    name: 'Dr. Neha Kapoor',
    email: 'neha.kapoor@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    orgId: orgSunrise._id,
    linkedPractitionerId: practNeha._id,
    status: 'Active'
  });

  const userClinicianRohit = await User.create({
    clerkUserId: 'u3',
    role: 'CLINICIAN',
    name: 'Dr. Rohit Verma',
    email: 'rohit.verma@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    orgId: orgSunrise._id,
    linkedPractitionerId: practRohit._id,
    status: 'Active'
  });

  const userPatientAnanya = await User.create({
    clerkUserId: 'u4',
    role: 'PATIENT',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    linkedPatientId: patientAnanya._id,
    status: 'Active'
  });

  const userPatientMeera = await User.create({
    clerkUserId: 'u5',
    role: 'PATIENT',
    name: 'Meera Nair',
    email: 'meera.nair@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    linkedPatientId: patientMeera._id,
    status: 'Active'
  });

  const userPatientRohan = await User.create({
    clerkUserId: 'u6',
    role: 'PATIENT',
    name: 'Rohan Patel',
    email: 'rohan.deshmukh@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    linkedPatientId: patientRohan._id,
    status: 'Active'
  });

  const userClinicianAnand = await User.create({
    clerkUserId: 'u7',
    role: 'CLINICIAN',
    name: 'Dr. Anand Rao',
    email: 'anand.rao@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    orgId: orgCity._id,
    linkedPractitionerId: practAnand._id,
    status: 'Active'
  });

  const userPatientPriya = await User.create({
    clerkUserId: 'u8',
    role: 'PATIENT',
    name: 'Priya Sen',
    email: 'priya.sen@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    linkedPatientId: patientPriya._id,
    status: 'Active'
  });

  const userAdminKavita = await User.create({
    clerkUserId: 'u9',
    role: 'ADMIN',
    name: 'Kavita Sundaram',
    email: 'kavita.admin@hackmatrix.demo',
    passwordHash: defaultPw.hash,
    passwordSalt: defaultPw.salt,
    orgId: orgHQ._id,
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
    },

    // Vitals for Meera Nair
    {
      patientId: patientMeera._id,
      category: 'vital',
      code: 'BP',
      display: 'Blood pressure',
      value: '134/86',
      unit: 'mmHg',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Dr. Neha Kapoor',
      effectiveAt: new Date('2026-10-08T10:30:00Z'),
      fields: [{ k: 'Blood pressure', v: '134/86 mmHg' }]
    },
    {
      patientId: patientMeera._id,
      category: 'vital',
      code: 'HR',
      display: 'Heart rate',
      value: '76',
      unit: 'bpm',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Dr. Neha Kapoor',
      effectiveAt: new Date('2026-10-08T10:30:00Z'),
      fields: [{ k: 'Heart rate', v: '76 bpm' }]
    },
    {
      patientId: patientMeera._id,
      category: 'measurement',
      code: 'GLU',
      display: 'Blood Glucose (Fasting)',
      value: '108',
      unit: 'mg/dL',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Diagnostic Lab',
      effectiveAt: new Date('2026-10-08T08:00:00Z'),
      fields: [{ k: 'Glucose', v: '108 mg/dL' }]
    },

    // Vitals for Rohan Patel
    {
      patientId: patientRohan._id,
      category: 'vital',
      code: 'BP',
      display: 'Blood pressure',
      value: '122/78',
      unit: 'mmHg',
      status: 'Final',
      facility: 'City Medical Centre',
      clinicianName: 'Dr. Anand Rao',
      effectiveAt: new Date('2026-10-09T14:15:00Z'),
      fields: [{ k: 'Blood pressure', v: '122/78 mmHg' }]
    },
    {
      patientId: patientRohan._id,
      category: 'vital',
      code: 'HR',
      display: 'Heart rate',
      value: '70',
      unit: 'bpm',
      status: 'Final',
      facility: 'City Medical Centre',
      clinicianName: 'Dr. Anand Rao',
      effectiveAt: new Date('2026-10-09T14:15:00Z'),
      fields: [{ k: 'Heart rate', v: '70 bpm' }]
    },
    {
      patientId: patientRohan._id,
      category: 'vital',
      code: 'SPO2',
      display: 'SpO2 (Oxygen Saturation)',
      value: '99',
      unit: '%',
      status: 'Final',
      facility: 'City Medical Centre',
      clinicianName: 'Dr. Anand Rao',
      effectiveAt: new Date('2026-10-09T14:15:00Z'),
      fields: [{ k: 'SpO2', v: '99%' }]
    },

    // Vitals for Priya Sen
    {
      patientId: patientPriya._id,
      category: 'vital',
      code: 'BP',
      display: 'Blood pressure',
      value: '116/74',
      unit: 'mmHg',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Nurse station',
      effectiveAt: new Date('2026-10-07T11:00:00Z'),
      fields: [{ k: 'Blood pressure', v: '116/74 mmHg' }]
    },
    {
      patientId: patientPriya._id,
      category: 'vital',
      code: 'HR',
      display: 'Heart rate',
      value: '68',
      unit: 'bpm',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Nurse station',
      effectiveAt: new Date('2026-10-07T11:00:00Z'),
      fields: [{ k: 'Heart rate', v: '68 bpm' }]
    }
  ]);

  // Extra Encounters for Meera, Rohan, Priya
  await Encounter.create([
    {
      patientId: patientMeera._id,
      clinicianId: practNeha._id,
      clinicianName: 'Dr. Neha Kapoor',
      orgId: orgSunrise._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Cardiology consultation',
      summary: 'Hypertension and lipid panel follow-up; adjusted telmisartan dose.',
      status: 'Completed',
      occurredAt: new Date('2026-10-08T10:45:00Z'),
      fields: [
        { k: 'Encounter type', v: 'OPD follow-up' },
        { k: 'Disposition', v: 'Discharged with prescription' },
        { k: 'Follow-up', v: 'Review in 3 months' }
      ]
    },
    {
      patientId: patientRohan._id,
      clinicianId: practAnand._id,
      clinicianName: 'Dr. Anand Rao',
      orgId: orgCity._id,
      facility: 'City Medical Centre',
      type: 'Pulmonology follow-up',
      summary: 'Mild intermittent bronchial asthma review; peak flow satisfactory at 480 L/min.',
      status: 'Completed',
      occurredAt: new Date('2026-10-09T14:30:00Z'),
      fields: [
        { k: 'Encounter type', v: 'Outpatient consultation' },
        { k: 'Disposition', v: 'Stable on inhaled therapy' },
        { k: 'Follow-up', v: 'As needed / 6 months' }
      ]
    },
    {
      patientId: patientPriya._id,
      clinicianId: practRohit._id,
      clinicianName: 'Dr. Rohit Verma',
      orgId: orgSunrise._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Dermatology review',
      summary: 'Contact dermatitis review; skin barrier cream and oral antihistamine advised.',
      status: 'Completed',
      occurredAt: new Date('2026-10-07T11:30:00Z'),
      fields: [
        { k: 'Encounter type', v: 'OPD consultation' },
        { k: 'Disposition', v: 'Discharged home' }
      ]
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
    },

    // Resources for Meera Nair
    {
      patientId: patientMeera._id,
      cat: 'medications',
      type: 'Active medication',
      date: '08 Oct 2026',
      occurredAt: new Date('2026-10-08T10:45:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Telmisartan 40 mg once daily for essential hypertension.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Telmisartan' },
        { k: 'Dose', v: '40 mg' },
        { k: 'Frequency', v: 'Once daily (morning)' },
        { k: 'Route', v: 'Oral' }
      ]
    },
    {
      patientId: patientMeera._id,
      cat: 'medications',
      type: 'Active medication',
      date: '08 Oct 2026',
      occurredAt: new Date('2026-10-08T10:45:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Atorvastatin 10 mg at bedtime for hyperlipidemia.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Atorvastatin' },
        { k: 'Dose', v: '10 mg' },
        { k: 'Frequency', v: 'Once daily (night)' },
        { k: 'Route', v: 'Oral' }
      ]
    },
    {
      patientId: patientMeera._id,
      cat: 'allergies',
      type: 'Allergy',
      date: '14 May 2021',
      occurredAt: new Date('2021-05-14T09:00:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Rohit Verma',
      summary: 'Sulfa drugs — severe generalized urticaria and facial angioedema.',
      status: 'Active',
      fields: [
        { k: 'Substance', v: 'Sulfamethoxazole / Sulfa antibiotics' },
        { k: 'Reaction', v: 'Severe urticaria, angioedema' },
        { k: 'Severity', v: 'High' }
      ]
    },
    {
      patientId: patientMeera._id,
      cat: 'reports',
      type: 'Laboratory report',
      date: '08 Oct 2026',
      occurredAt: new Date('2026-10-08T09:30:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Lipid Profile: Total Cholesterol 210 mg/dL, LDL 132 mg/dL, HDL 48 mg/dL.',
      status: 'Final',
      fields: [
        { k: 'Total Cholesterol', v: '210 mg/dL' },
        { k: 'LDL Cholesterol', v: '132 mg/dL' },
        { k: 'HDL Cholesterol', v: '48 mg/dL' },
        { k: 'Fasting Blood Sugar', v: '108 mg/dL' }
      ]
    },
    {
      patientId: patientMeera._id,
      cat: 'careplans',
      type: 'Care plan',
      date: '08 Oct 2026',
      occurredAt: new Date('2026-10-08T10:50:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Neha Kapoor',
      summary: 'Cardiovascular Risk Reduction Plan: DASH diet, sodium restriction, 30 min daily walking.',
      status: 'Active',
      fields: [
        { k: 'Goal', v: 'Target BP < 130/80 mmHg, LDL < 100 mg/dL' },
        { k: 'Lifestyle', v: 'DASH Diet, brisk walking 150 min/wk' },
        { k: 'Review', v: '3 months' }
      ]
    },

    // Resources for Rohan Patel
    {
      patientId: patientRohan._id,
      cat: 'medications',
      type: 'Active medication',
      date: '09 Oct 2026',
      occurredAt: new Date('2026-10-09T14:30:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. Anand Rao',
      summary: 'Salbutamol Inhaler 100 mcg — 2 puffs PRN for acute shortness of breath.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Salbutamol HFA' },
        { k: 'Dose', v: '100 mcg/actuation' },
        { k: 'Frequency', v: 'As needed (PRN)' },
        { k: 'Route', v: 'Inhalation' }
      ]
    },
    {
      patientId: patientRohan._id,
      cat: 'medications',
      type: 'Active medication',
      date: '09 Oct 2026',
      occurredAt: new Date('2026-10-09T14:30:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. Anand Rao',
      summary: 'Budesonide DPI 200 mcg — 1 inhalation twice daily maintenance.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Budesonide' },
        { k: 'Dose', v: '200 mcg' },
        { k: 'Frequency', v: 'Twice daily' },
        { k: 'Route', v: 'Inhalation' }
      ]
    },
    {
      patientId: patientRohan._id,
      cat: 'allergies',
      type: 'Allergy',
      date: '10 Feb 2018',
      occurredAt: new Date('2018-02-10T12:00:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. Anand Rao',
      summary: 'Aspirin & NSAIDs — severe bronchospasm and wheezing exacerbation.',
      status: 'Active',
      fields: [
        { k: 'Substance', v: 'Aspirin (NSAIDs)' },
        { k: 'Reaction', v: 'Acute bronchospasm, wheezing' },
        { k: 'Severity', v: 'High' }
      ]
    },
    {
      patientId: patientRohan._id,
      cat: 'reports',
      type: 'Laboratory report',
      date: '09 Oct 2026',
      occurredAt: new Date('2026-10-09T14:00:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. Anand Rao',
      summary: 'Spirometry Assessment: FEV1/FVC 78%, post-bronchodilator reversibility confirmed.',
      status: 'Final',
      fields: [
        { k: 'FEV1', v: '3.2 L (84% predicted)' },
        { k: 'FVC', v: '4.1 L (91% predicted)' },
        { k: 'FEV1/FVC', v: '78%' },
        { k: 'Reversibility', v: 'Positive (+14%)' }
      ]
    },
    {
      patientId: patientRohan._id,
      cat: 'careplans',
      type: 'Care plan',
      date: '09 Oct 2026',
      occurredAt: new Date('2026-10-09T14:40:00Z'),
      facility: 'City Medical Centre',
      clinician: 'Dr. Anand Rao',
      summary: 'Asthma Self-Management Action Plan: Green/Yellow/Red zone peak flow guidance.',
      status: 'Active',
      fields: [
        { k: 'Goal', v: 'Zero nocturnal awakening, normal daytime activity' },
        { k: 'Trigger Avoidance', v: 'Smoke, cold air, aspirin' },
        { k: 'Vaccination', v: 'Annual Influenza, Pneumococcal conjugate' }
      ]
    },

    // Resources for Priya Sen
    {
      patientId: patientPriya._id,
      cat: 'medications',
      type: 'Active medication',
      date: '07 Oct 2026',
      occurredAt: new Date('2026-10-07T11:30:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Rohit Verma',
      summary: 'Cetirizine 10 mg once daily for pruritus and allergy flare-up.',
      status: 'Active',
      fields: [
        { k: 'Drug', v: 'Cetirizine' },
        { k: 'Dose', v: '10 mg' },
        { k: 'Frequency', v: 'Once daily' },
        { k: 'Route', v: 'Oral' }
      ]
    },
    {
      patientId: patientPriya._id,
      cat: 'allergies',
      type: 'Allergy',
      date: '12 Jan 2022',
      occurredAt: new Date('2022-01-12T10:00:00Z'),
      facility: 'Sunrise Multispecialty Hospital',
      clinician: 'Dr. Rohit Verma',
      summary: 'Latex — localized erythema and contact dermatitis.',
      status: 'Active',
      fields: [
        { k: 'Substance', v: 'Natural rubber latex' },
        { k: 'Reaction', v: 'Contact dermatitis, erythema' },
        { k: 'Severity', v: 'Moderate' }
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

  // 9. QR Authorization Tokens
  await QRAuthorization.create([
    {
      patientId: patientAnanya._id,
      token: 'HMX-QR-DEMO-7F3A91',
      status: 'active',
      createdBy: userPatientAnanya._id,
      expiresAt: new Date(Date.now() + 86400 * 1000)
    },
    {
      patientId: patientMeera._id,
      token: 'HMX-QR-MEERA-31877',
      status: 'active',
      createdBy: userPatientMeera._id,
      expiresAt: new Date(Date.now() + 86400 * 1000)
    },
    {
      patientId: patientRohan._id,
      token: 'HMX-QR-ROHAN-28110',
      status: 'active',
      createdBy: userPatientRohan._id,
      expiresAt: new Date(Date.now() + 86400 * 1000)
    }
  ]);

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
