import { Types } from 'mongoose';
import crypto from 'crypto';

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Practitioner } from '../models/Practitioner.js';
import { Encounter } from '../models/Encounter.js';
import { Observation } from '../models/Observation.js';
import { ClinicalResource } from '../models/ClinicalResource.js';
import { ConsentGrant } from '../models/ConsentGrant.js';
import { QRAuthorization } from '../models/QRAuthorization.js';
import { EmergencyAccess } from '../models/EmergencyAccess.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { SystemStatus } from '../models/SystemStatus.js';
import { AnalyticsSnapshot } from '../models/AnalyticsSnapshot.js';

const memoryStore = new Map<string, any[]>();

const ALL_MODELS = [
  Organization,
  User,
  Patient,
  Practitioner,
  Encounter,
  Observation,
  ClinicalResource,
  ConsentGrant,
  QRAuthorization,
  EmergencyAccess,
  AuditEvent,
  SystemStatus,
  AnalyticsSnapshot
];

function matchesQuery(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    const val = query[key];

    if (key === '$or' && Array.isArray(val)) {
      const orMatch = val.some(subQ => matchesQuery(doc, subQ));
      if (!orMatch) return false;
      continue;
    }

    if (val && typeof val === 'object' && !(val instanceof Types.ObjectId) && !(val instanceof Date)) {
      if ('$in' in val && Array.isArray(val.$in)) {
        const docVal = doc[key];
        const inMatch = val.$in.some((item: any) =>
          item?.toString() === docVal?.toString() ||
          (Array.isArray(docVal) && docVal.includes(item))
        );
        if (!inMatch) return false;
        continue;
      }
      if ('$gt' in val) {
        if (!(doc[key] > val.$gt)) return false;
        continue;
      }
      if ('$gte' in val) {
        if (!(doc[key] >= val.$gte)) return false;
        continue;
      }
      if ('$lte' in val) {
        if (!(doc[key] <= val.$lte)) return false;
        continue;
      }
      if ('$regex' in val) {
        const regex = new RegExp(val.$regex, val.$options || '');
        if (!regex.test(doc[key] || '')) return false;
        continue;
      }
    }

    const docVal = doc[key];
    if (docVal instanceof Types.ObjectId && val instanceof Types.ObjectId) {
      if (docVal.toString() !== val.toString()) return false;
    } else if (Array.isArray(docVal)) {
      if (!docVal.map(x => x?.toString()).includes(val?.toString())) return false;
    } else if (docVal?.toString() !== val?.toString()) {
      return false;
    }
  }

  return true;
}

function makeDoc(modelName: string, data: any) {
  return {
    ...data,
    _id: data._id || new Types.ObjectId(),
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    save: async function () {
      this.updatedAt = new Date();
      const list = memoryStore.get(modelName) || [];
      const idx = list.findIndex(d => d._id.toString() === this._id.toString());
      if (idx >= 0) {
        list[idx] = this;
      } else {
        list.push(this);
      }
      return this;
    }
  };
}

function createQueryChain(modelName: string, items: any[]) {
  let result = [...items];

  const chain: any = {
    sort(sortObj?: any) {
      if (sortObj) {
        const key = Object.keys(sortObj)[0];
        const dir = sortObj[key];
        result.sort((a, b) => {
          const valA = a[key];
          const valB = b[key];
          if (valA > valB) return dir === -1 ? -1 : 1;
          if (valA < valB) return dir === -1 ? 1 : -1;
          return 0;
        });
      }
      return chain;
    },
    limit(n: number) {
      result = result.slice(0, n);
      return chain;
    },
    skip(n: number) {
      result = result.slice(n);
      return chain;
    },
    populate() {
      return chain;
    },
    then(resolve: any, reject: any) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };

  return chain;
}

export async function setupInMemoryDB() {
  for (const model of ALL_MODELS) {
    const name = model.modelName;
    if (!memoryStore.has(name)) {
      memoryStore.set(name, []);
    }

    (model as any).create = async (docOrDocs: any) => {
      const list = memoryStore.get(name)!;
      if (Array.isArray(docOrDocs)) {
        const docs = docOrDocs.map(d => makeDoc(name, d));
        list.push(...docs);
        return docs;
      } else {
        const doc = makeDoc(name, docOrDocs);
        list.push(doc);
        return doc;
      }
    };

    (model as any).find = (query: any = {}) => {
      const list = memoryStore.get(name)!;
      const matched = list.filter(d => matchesQuery(d, query));
      return createQueryChain(name, matched);
    };

    (model as any).findOne = (query: any = {}) => {
      const list = memoryStore.get(name)!;
      const matched = list.filter(d => matchesQuery(d, query));
      let current = [...matched];

      const chain: any = {
        sort(sortObj?: any) {
          if (sortObj) {
            const key = Object.keys(sortObj)[0];
            const dir = sortObj[key];
            current.sort((a, b) => {
              const valA = a[key];
              const valB = b[key];
              if (valA > valB) return dir === -1 ? -1 : 1;
              if (valA < valB) return dir === -1 ? 1 : -1;
              return 0;
            });
          }
          return chain;
        },
        populate() {
          return chain;
        },
        then(resolve: any, reject: any) {
          return Promise.resolve(current[0] || null).then(resolve, reject);
        }
      };
      return chain;
    };

    (model as any).findById = (id: any) => {
      const list = memoryStore.get(name)!;
      const idStr = id?.toString();
      const doc = list.find(d => d._id?.toString() === idStr) || null;
      const chain: any = {
        populate() {
          return chain;
        },
        then(resolve: any, reject: any) {
          return Promise.resolve(doc).then(resolve, reject);
        }
      };
      return chain;
    };

    (model as any).countDocuments = async (query: any = {}) => {
      const list = memoryStore.get(name)!;
      return list.filter(d => matchesQuery(d, query)).length;
    };

    (model as any).deleteMany = async (query: any = {}) => {
      if (!query || Object.keys(query).length === 0) {
        memoryStore.set(name, []);
        return { deletedCount: 0 };
      }
      const list = memoryStore.get(name)!;
      const remaining = list.filter(d => !matchesQuery(d, query));
      const deletedCount = list.length - remaining.length;
      memoryStore.set(name, remaining);
      return { deletedCount };
    };

    (model as any).updateMany = async (query: any, update: any) => {
      const list = memoryStore.get(name)!;
      let count = 0;
      for (const doc of list) {
        if (matchesQuery(doc, query)) {
          if (update.$set) {
            Object.assign(doc, update.$set);
          }
          count++;
        }
      }
      return { modifiedCount: count };
    };
  }

  // Pre-seed demo datasets if memory store is empty
  if ((memoryStore.get('User') || []).length === 0) {
    await seedSyntheticData();
  }
}

async function seedSyntheticData() {
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

  const practAnand = await Practitioner.create({
    orgId: orgCity._id,
    identifiers: ['HMX-C-9912'],
    name: 'Dr. Anand Rao',
    specialty: 'Infectious Disease',
    dept: 'Infectious Disease & Epidemiology',
    licenseNo: 'MED-9912-DEMO',
    facilities: ['City Medical Centre']
  });

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
    facility: 'Sunrise Multispecialty Hospital',
    primaryClinicianId: practRohit._id
  });

  const patientRohan = await Patient.create({
    orgId: orgCity._id,
    identifiers: ['HMX-P-45520'],
    name: 'Rohan Deshmukh',
    dob: '10 Nov 1998',
    age: 27,
    sex: 'Male',
    bloodType: 'A+',
    phone: '+91 ••••• •9933',
    abha: '••••-••••-4552',
    allergies: ['Aspirin', 'NSAIDs'],
    facility: 'City Medical Centre',
    primaryClinicianId: practAnand._id
  });

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
    name: 'Rohan Deshmukh',
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

  // Ananya Encounters
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

  // Observations
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

  // Clinical Resources
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
        { k: 'Result', v: 'Within range' }
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
      fields: [{ k: 'Vaccine', v: 'Td booster' }]
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
      fields: [{ k: 'Goal', v: 'Maintain BP < 130/80' }]
    }
  ]);

  // Meera & Rohan Observations, Encounters & Resources
  await Observation.create([
    {
      patientId: patientMeera._id,
      category: 'vital',
      code: 'BP',
      display: 'Blood pressure',
      value: '138/88',
      unit: 'mmHg',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Dr. Rohit Verma',
      effectiveAt: new Date(),
      fields: [{ k: 'Blood pressure', v: '138/88 mmHg' }]
    },
    {
      patientId: patientMeera._id,
      category: 'vital',
      code: 'GLU',
      display: 'Fasting Blood Glucose',
      value: '142',
      unit: 'mg/dL',
      status: 'Final',
      facility: 'Sunrise Multispecialty Hospital',
      clinicianName: 'Dr. Rohit Verma',
      effectiveAt: new Date(),
      fields: [{ k: 'Glucose', v: '142 mg/dL' }]
    },
    {
      patientId: patientRohan._id,
      category: 'vital',
      code: 'PLT',
      display: 'Platelet Count',
      value: '84000',
      unit: '/µL',
      status: 'Final',
      facility: 'City Medical Centre',
      clinicianName: 'Dr. Anand Rao',
      effectiveAt: new Date(),
      fields: [{ k: 'Platelets', v: '84,000 /µL (Thrombocytopenia)' }]
    },
    {
      patientId: patientRohan._id,
      category: 'vital',
      code: 'TEMP',
      display: 'Body Temperature',
      value: '39.4',
      unit: '°C',
      status: 'Final',
      facility: 'City Medical Centre',
      clinicianName: 'Dr. Anand Rao',
      effectiveAt: new Date(),
      fields: [{ k: 'Temperature', v: '39.4 °C (High Grade Fever)' }]
    }
  ]);

  await Encounter.create([
    {
      patientId: patientMeera._id,
      clinicianId: practRohit._id,
      clinicianName: 'Dr. Rohit Verma',
      orgId: orgSunrise._id,
      facility: 'Sunrise Multispecialty Hospital',
      type: 'Hypertension Consultation',
      summary: 'Essential hypertension with mild headache. Adjusting ACE inhibitor dosage.',
      status: 'Completed',
      occurredAt: new Date('2026-09-20T10:30:00Z'),
      fields: [{ k: 'Assessment', v: 'Hypertension Stage 1' }, { k: 'Disposition', v: 'Review in 14 days' }]
    },
    {
      patientId: patientRohan._id,
      clinicianId: practAnand._id,
      clinicianName: 'Dr. Anand Rao',
      orgId: orgCity._id,
      facility: 'City Medical Centre',
      type: 'Infectious Disease Triage',
      summary: 'Acute febrile illness with retro-orbital pain and petechiae. Diagnosed with Dengue Fever.',
      status: 'Active',
      occurredAt: new Date(),
      fields: [
        { k: 'Diagnosis / Syndrome', v: 'Dengue Fever / Vector-Borne' },
        { k: 'NS1 Antigen', v: 'Positive' },
        { k: 'Disposition', v: 'Admitted to Day Observation Bay' }
      ]
    }
  ]);

  // Consent Grants
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
      patientId: patientMeera._id,
      granteeId: practRohit._id,
      recipient: 'Dr. Rohit Verma',
      role: 'Emergency physician',
      org: 'Sunrise Multispecialty Hospital',
      orgId: orgSunrise._id,
      scope: ['Encounters', 'Observations', 'Allergies', 'Medications'],
      purpose: 'Emergency treatment and stabilization',
      start: '12 Sep 2026, 16:20',
      expires: '13 Sep 2027, 16:20',
      status: 'active',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: userPatientMeera._id
    },
    {
      patientId: patientRohan._id,
      granteeId: practAnand._id,
      recipient: 'Dr. Anand Rao',
      role: 'Infectious Disease Specialist',
      org: 'City Medical Centre',
      orgId: orgCity._id,
      scope: ['Encounters', 'Observations', 'Allergies', 'Medications', 'Reports'],
      purpose: 'Dengue inpatient care and monitoring',
      start: '10 Oct 2026, 09:00',
      expires: '24 Oct 2026, 09:00',
      status: 'active',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdBy: userPatientRohan._id
    }
  ]);

  // Unique QR Tokens for Each Patient
  await QRAuthorization.create([
    {
      patientId: patientAnanya._id,
      token: 'HMX-QR-ANANYA-20481',
      status: 'active',
      createdBy: userPatientAnanya._id,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    },
    {
      patientId: patientMeera._id,
      token: 'HMX-QR-MEERA-31877',
      status: 'active',
      createdBy: userPatientMeera._id,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    },
    {
      patientId: patientRohan._id,
      token: 'HMX-QR-ROHAN-45520',
      status: 'active',
      createdBy: userPatientRohan._id,
      expiresAt: new Date(Date.now() + 3600 * 1000)
    }
  ]);

  // Audit Events
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
    }
  ]);
}
