import { Types } from 'mongoose';
import { Organization } from '../../src/models/Organization.js';
import { User } from '../../src/models/User.js';
import { Patient } from '../../src/models/Patient.js';
import { Practitioner } from '../../src/models/Practitioner.js';
import { Encounter } from '../../src/models/Encounter.js';
import { Observation } from '../../src/models/Observation.js';
import { ClinicalResource } from '../../src/models/ClinicalResource.js';
import { ConsentGrant } from '../../src/models/ConsentGrant.js';
import { QRAuthorization } from '../../src/models/QRAuthorization.js';
import { EmergencyAccess } from '../../src/models/EmergencyAccess.js';
import { AuditEvent } from '../../src/models/AuditEvent.js';
import { SystemStatus } from '../../src/models/SystemStatus.js';
import { AnalyticsSnapshot } from '../../src/models/AnalyticsSnapshot.js';

// Global In-Memory Store
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

    // Direct comparison
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
  const doc = {
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
  return doc;
}

function createQueryChain(modelName: string, items: any[]) {
  let result = [...items];

  const chain: any = {
    sort(sortObj?: any) {
      // sort by field descending if -1
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

export async function setupTestDB() {
  for (const model of ALL_MODELS) {
    const name = model.modelName;
    memoryStore.set(name, []);

    // Mock create
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

    // Mock find
    (model as any).find = (query: any = {}) => {
      const list = memoryStore.get(name)!;
      const matched = list.filter(d => matchesQuery(d, query));
      return createQueryChain(name, matched);
    };

    // Mock findOne
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

    // Mock findById
    (model as any).findById = (id: any) => {
      const list = memoryStore.get(name)!;
      const idStr = id?.toString();
      const doc = list.find(d => d._id?.toString() === idStr) || null;
      return {
        ...createQueryChain(name, doc ? [doc] : []),
        then(resolve: any, reject: any) {
          return Promise.resolve(doc).then(resolve, reject);
        }
      };
    };

    // Mock countDocuments
    (model as any).countDocuments = async (query: any = {}) => {
      const list = memoryStore.get(name)!;
      return list.filter(d => matchesQuery(d, query)).length;
    };

    // Mock deleteMany
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

    // Mock updateMany
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
}

export async function teardownTestDB() {
  memoryStore.clear();
}

export async function clearTestDB() {
  for (const model of ALL_MODELS) {
    memoryStore.set(model.modelName, []);
  }
}

export async function seedTestContext() {
  const org = await Organization.create({
    name: 'Sunrise Multispecialty Hospital',
    type: 'Hospital',
    region: 'North',
    facilities: ['Emergency Wing'],
    status: 'Active'
  });

  const patient = await Patient.create({
    orgId: org._id,
    identifiers: ['HMX-P-20481'],
    name: 'Ananya Sharma',
    dob: '14 Mar 1991',
    age: 34,
    sex: 'Female',
    bloodType: 'O+',
    allergies: ['Penicillin'],
    facility: 'Sunrise Multispecialty Hospital'
  });

  const patient2 = await Patient.create({
    orgId: org._id,
    identifiers: ['HMX-P-31877'],
    name: 'Meera Nair',
    dob: '22 Jun 1979',
    age: 47,
    sex: 'Female',
    bloodType: 'B+',
    allergies: ['Sulfa drugs'],
    facility: 'Sunrise Multispecialty Hospital'
  });

  const clinicianUser = await User.create({
    clerkUserId: 'test-clinician-1',
    role: 'CLINICIAN',
    name: 'Dr. Rohit Verma',
    email: 'rohit@test.demo',
    orgId: org._id,
    status: 'Active'
  });

  const patientUser = await User.create({
    clerkUserId: 'test-patient-1',
    role: 'PATIENT',
    name: 'Ananya Sharma',
    email: 'ananya@test.demo',
    linkedPatientId: patient._id,
    status: 'Active'
  });

  const adminUser = await User.create({
    clerkUserId: 'test-admin-1',
    role: 'ADMIN',
    name: 'admin.rao',
    email: 'admin@test.demo',
    status: 'Active'
  });

  return { org, patient, patient2, clinicianUser, patientUser, adminUser };
}
