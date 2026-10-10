import crypto from 'crypto';
import { User, IUser } from '../../models/User.js';
import { Organization } from '../../models/Organization.js';
import { Patient } from '../../models/Patient.js';
import { Practitioner } from '../../models/Practitioner.js';
import { Observation } from '../../models/Observation.js';
import { createAuditEvent } from '../../middleware/audit.js';
import { SyncUserInput, RegisterInput, LoginInput } from './schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { Types } from 'mongoose';

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch (e) {
    return false;
  }
}

export class AuthService {
  async getMe(user: IUser) {
    let orgName = '—';
    if (user.orgId) {
      const org = await Organization.findById(user.orgId);
      if (org) {
        orgName = org.name;
      }
    }

    return {
      id: user._id,
      clerkUserId: user.clerkUserId,
      role: user.role,
      name: user.name,
      email: user.email,
      orgId: user.orgId,
      orgName: orgName,
      status: user.status,
      linkedPatientId: user.linkedPatientId,
      linkedPractitionerId: user.linkedPractitionerId
    };
  }

  async syncUser(input: SyncUserInput) {
    let orgObjectId: Types.ObjectId | undefined;
    if (input.orgId) {
      if (Types.ObjectId.isValid(input.orgId)) {
        orgObjectId = new Types.ObjectId(input.orgId);
      } else {
        const foundOrg = await Organization.findOne({ name: input.orgId });
        if (foundOrg) {
          orgObjectId = foundOrg._id as Types.ObjectId;
        }
      }
    }

    const existingUser = await User.findOne({ clerkUserId: input.clerkUserId });
    if (existingUser) {
      existingUser.name = input.name;
      existingUser.email = input.email;
      if (input.orgId && orgObjectId) {
        existingUser.orgId = orgObjectId;
      }
      await existingUser.save();
      return this.getMe(existingUser);
    }

    const newUser = await User.create({
      clerkUserId: input.clerkUserId,
      role: input.role || 'PATIENT',
      name: input.name,
      email: input.email,
      orgId: orgObjectId,
      status: 'Active'
    });

    return this.getMe(newUser);
  }

  async register(input: RegisterInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email address already exists');
    }

    const { hash, salt } = hashPassword(input.password);
    const userId = `u_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    let orgId: Types.ObjectId | undefined;
    let defaultOrg = await Organization.findOne();
    if (!defaultOrg) {
      defaultOrg = await Organization.create({
        name: input.organization || input.facility || 'Sunrise Multispecialty Hospital',
        type: 'Hospital',
        region: 'North',
        status: 'Active'
      });
    }
    orgId = defaultOrg._id as Types.ObjectId;

    let linkedPatientId: Types.ObjectId | undefined;
    let linkedPractitionerId: Types.ObjectId | undefined;

    if (input.role === 'PATIENT') {
      const pCount = await Patient.countDocuments();
      const patientIdTag = `HMX-P-${20500 + pCount}`;
      const abhaTag = `91-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}`;

      const patient = await Patient.create({
        orgId,
        identifiers: [patientIdTag],
        name: input.name,
        dob: input.dob || '15 May 1995',
        age: input.age || 30,
        sex: input.sex || 'Female',
        bloodType: input.bloodType || 'O+',
        phone: input.phone || '+91 ••••• •1234',
        abha: abhaTag,
        allergies: input.allergies || ['None Reported'],
        facility: defaultOrg.name
      });
      linkedPatientId = patient._id as Types.ObjectId;

      // Seed initial welcoming baseline observation for patient
      const now = new Date();
      await Observation.create({
        patientId: patient._id,
        category: 'vital',
        code: '85354-9',
        display: 'Baseline Vital Signs Panel',
        value: '120/80',
        unit: 'mmHg',
        effectiveAt: now,
        facility: defaultOrg.name,
        clinicianName: 'Triage Nurse',
        status: 'Final',
        fields: [
          { k: 'Blood pressure', v: '120/80 mmHg' },
          { k: 'Heart rate', v: '72 bpm' },
          { k: 'SpO2', v: '99%' },
          { k: 'Temperature', v: '36.8 °C' }
        ]
      });
    } else if (input.role === 'CLINICIAN') {
      const cCount = await Practitioner.countDocuments();
      const practitioner = await Practitioner.create({
        orgId,
        identifiers: [`HMX-C-${7800 + cCount}`],
        name: input.name,
        specialty: input.specialty || 'General Medicine',
        dept: input.dept || 'Emergency Medicine',
        licenseNo: input.licenseNo || `MED-${Math.floor(1000 + Math.random()*9000)}-REG`,
        facilities: [defaultOrg.name]
      });
      linkedPractitionerId = practitioner._id as Types.ObjectId;
    }

    const newUser = await User.create({
      clerkUserId: userId,
      role: input.role,
      name: input.name,
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      orgId,
      status: 'Active',
      linkedPatientId,
      linkedPractitionerId
    });

    await createAuditEvent({
      actorId: newUser._id as Types.ObjectId,
      actor: newUser.name,
      actorRole: newUser.role,
      action: 'Account Registration',
      resource: `${newUser.role} Account (${newUser.email})`,
      outcome: 'success'
    });

    const me = await this.getMe(newUser);
    return {
      token: `dev:${newUser.clerkUserId}`,
      user: me
    };
  }

  async login(input: LoginInput) {
    let user: IUser | null = null;

    if (input.email) {
      user = await User.findOne({ email: input.email.toLowerCase().trim() });
    } else if (input.persona === 'patient' || input.persona === 'patient_ananya') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u4' }, { email: 'ananya.sharma@hackmatrix.demo' }, { role: 'PATIENT' }] });
    } else if (input.persona === 'patient_meera') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u5' }, { email: 'meera.nair@hackmatrix.demo' }] });
    } else if (input.persona === 'patient_rohan') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u6' }, { email: 'rohan.deshmukh@hackmatrix.demo' }] });
    } else if (input.persona === 'clinician' || input.persona === 'clinician_rohit') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u3' }, { email: 'rohit.verma@hackmatrix.demo' }, { role: 'CLINICIAN' }] });
    } else if (input.persona === 'clinician_neha') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u2' }, { email: 'neha.kapoor@hackmatrix.demo' }] });
    } else if (input.persona === 'clinician_anand') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u7' }, { email: 'anand.rao@hackmatrix.demo' }] });
    } else if (input.persona === 'admin') {
      user = await User.findOne({ $or: [{ clerkUserId: 'u1' }, { email: 'admin.rao@hackmatrix.demo' }, { role: 'ADMIN' }] });
    } else if (input.role) {
      user = await User.findOne({ role: input.role as any });
    }

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User matching email or credentials not found');
    }

    if (user.status === 'Suspended') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended');
    }

    // Strict Password Verification
    if (input.password && user.passwordHash && user.passwordSalt) {
      const valid = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
      if (!valid) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect password entered');
      }
    } else if (input.password && !user.passwordHash) {
      // Lazy migration for pre-seeded users
      const { hash, salt } = hashPassword(input.password);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      await user.save();
    }

    // Role check if portal requested specific role
    if (input.role && user.role !== input.role) {
      throw new AppError(403, 'ROLE_MISMATCH', `Account is registered as ${user.role}, not ${input.role}`);
    }

    const me = await this.getMe(user);
    return {
      token: `dev:${user.clerkUserId}`,
      user: me
    };
  }
}

export const authService = new AuthService();
