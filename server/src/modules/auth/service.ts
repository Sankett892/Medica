import crypto from 'crypto';
import { User, IUser } from '../../models/User.js';
import { Organization } from '../../models/Organization.js';
import { Patient } from '../../models/Patient.js';
import { Practitioner } from '../../models/Practitioner.js';
import { Observation } from '../../models/Observation.js';
import { Encounter } from '../../models/Encounter.js';
import { Facility } from '../../models/Facility.js';
import { resolvePuneTaluka } from '../../constants/regions.js';
import { getIO } from '../../config/socket.js';
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

    let linkedPatientId = user.linkedPatientId;
    if (user.role === 'PATIENT' && !linkedPatientId) {
      const patient = await Patient.findOne({
        $or: [
          { identifiers: user.email },
          { identifiers: user.email?.toLowerCase() },
          { name: user.name }
        ]
      }) || await Patient.findOne();
      if (patient) {
        linkedPatientId = patient._id;
        user.linkedPatientId = patient._id;
        await User.findByIdAndUpdate(user._id, { linkedPatientId: patient._id });
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
      linkedPatientId: linkedPatientId,
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
    if (input.role === 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN_REGISTRATION', 'Administrator accounts cannot be created via public registration. Contact system administration.');
    }

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
        name: input.organization || input.facility || input.hospitalOrClinic || 'Sunrise Multispecialty Hospital',
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

      // Resolve the exact Pune Taluka selected by the patient
      const targetTaluka = resolvePuneTaluka(input.locality, input.taluka || input.region);
      const localFacility = await Facility.findOne({ region: targetTaluka });
      const facilityName = localFacility ? localFacility.name : defaultOrg.name;
      const primaryDisease = input.diseaseCategory || input.primaryCondition || 'Viral Fever & Infection Surveillance';

      const patient = await Patient.create({
        orgId,
        identifiers: [patientIdTag],
        name: input.name,
        dob: input.dob || input.dateOfBirth || '15 May 1995',
        age: input.age || 30,
        sex: input.sex || (input.gender ? (input.gender.charAt(0).toUpperCase() + input.gender.slice(1)) : 'Female') as any,
        bloodType: input.bloodType || input.bloodGroup || 'O+',
        phone: input.phone || '+91 ••••• •1234',
        abha: abhaTag,
        allergies: input.allergies || ['None Reported'],
        facility: facilityName,
        location: {
          city: input.city || 'Pune',
          state: 'Maharashtra',
          country: 'India',
          region: targetTaluka,
          locality: input.locality || targetTaluka,
          address: input.address || `${input.locality || targetTaluka}, ${targetTaluka} Taluka, Pune District`
        }
      });
      linkedPatientId = patient._id as Types.ObjectId;

      const now = new Date();

      // Seed initial welcoming baseline observation for patient
      await Observation.create({
        patientId: patient._id,
        category: 'vital',
        code: '85354-9',
        display: 'Baseline Vital Signs Panel',
        value: '120/80',
        unit: 'mmHg',
        effectiveAt: now,
        facility: facilityName,
        clinicianName: 'Triage Nurse',
        status: 'Final',
        fields: [
          { k: 'Blood pressure', v: '120/80 mmHg' },
          { k: 'Heart rate', v: '72 bpm' },
          { k: 'SpO2', v: '99%' },
          { k: 'Temperature', v: '36.8 °C' }
        ]
      });

      // Automatically register active clinical encounter for epidemiological surveillance
      // This immediately increments the affected case count for the specific Pune taluka in the Admin portal!
      await Encounter.create({
        patientId: patient._id,
        orgId,
        facility: facilityName,
        region: targetTaluka,
        locality: input.locality || targetTaluka,
        type: 'Outpatient surveillance intake',
        diseaseCategory: primaryDisease,
        diagnosis: primaryDisease,
        summary: `Initial clinical surveillance intake registered for ${patient.name} in ${targetTaluka} Taluka.`,
        status: 'In-Progress',
        occurredAt: now,
        isRecovered: false,
        recoveryStatus: 'Active - Under Treatment',
        fields: [
          { k: 'Surveillance Taluka', v: targetTaluka },
          { k: 'Primary Condition', v: primaryDisease },
          { k: 'Clinical Status', v: 'Active affected case' }
        ]
      });

      // Broadcast real-time update to Admin map via Socket.IO
      try {
        const io = getIO();
        if (io) {
          io.emit('analytics:updated', {
            source: 'patient_registration',
            patientId: patient._id.toString(),
            taluka: targetTaluka,
            condition: primaryDisease,
            timestamp: now.toISOString()
          });
        }
      } catch (err) {
        console.warn('[Socket.IO] Notice on patient registration broadcast:', err);
      }
    } else if (input.role === 'CLINICIAN') {
      const cCount = await Practitioner.countDocuments();
      const practitioner = await Practitioner.create({
        orgId,
        identifiers: [`HMX-C-${7800 + cCount}`],
        name: input.name.startsWith('Dr.') ? input.name : `Dr. ${input.name}`,
        specialty: input.specialty || 'General Medicine',
        dept: input.dept || 'Consultation',
        licenseNo: input.licenseNo || `MED-${Math.floor(1000 + Math.random()*9000)}-REG`,
        facilities: [input.hospitalOrClinic || input.facility || defaultOrg.name],
        location: {
          city: input.city || 'Pune',
          state: 'Maharashtra',
          country: 'India',
          locality: input.locality || 'Shivajinagar',
          hospitalOrClinic: input.hospitalOrClinic || input.facility || defaultOrg.name
        }
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
    const rawTerm = input.email || input.identifier;

    if (rawTerm) {
      const term = rawTerm.trim();
      const lower = term.toLowerCase();

      // 1. Direct email or clerkUserId match
      user = await User.findOne({
        $or: [
          { email: lower },
          { email: term },
          { clerkUserId: term }
        ]
      });

      // 2. Patient identifier / ABHA / phone match
      if (!user) {
        const patient = await Patient.findOne({
          $or: [
            { identifiers: term },
            { identifiers: term.toUpperCase() },
            { abha: term },
            { phone: term }
          ]
        });
        if (patient) {
          user = await User.findOne({ linkedPatientId: patient._id });
          if (!user) {
            user = await User.findOne({ name: new RegExp(patient.name, 'i') });
          }
        }
      }

      // 3. Practitioner identifier / license match
      if (!user) {
        const pract = await Practitioner.findOne({
          $or: [
            { identifiers: term },
            { identifiers: term.toUpperCase() },
            { licenseNo: term }
          ]
        });
        if (pract) {
          user = await User.findOne({ linkedPractitionerId: pract._id });
          if (!user) {
            user = await User.findOne({ name: new RegExp(pract.name.replace(/Dr\.\s*/i, ''), 'i') });
          }
        }
      }

      // 4. Admin username match
      if (!user && (lower === 'admin' || lower === 'admin.rao' || lower === 'administrator' || lower === 'admin.rao@hackmatrix.demo')) {
        user = await User.findOne({ role: 'ADMIN' });
      }
    } else if (input.persona === 'patient' || input.persona === 'patient_ananya') {
      user = await User.findOne({ email: 'ananya.sharma@hackmatrix.demo' }) || await User.findOne({ role: 'PATIENT' });
    } else if (input.persona === 'patient_meera') {
      user = await User.findOne({ email: 'meera.nair@hackmatrix.demo' }) || await User.findOne({ role: 'PATIENT' });
    } else if (input.persona === 'patient_rohan') {
      user = await User.findOne({ email: 'rohan.deshmukh@hackmatrix.demo' }) || await User.findOne({ role: 'PATIENT' });
    } else if (input.persona === 'clinician' || input.persona === 'clinician_rohit') {
      user = await User.findOne({ email: 'rohit.verma@hackmatrix.demo' }) || await User.findOne({ role: 'CLINICIAN' });
    } else if (input.persona === 'clinician_neha') {
      user = await User.findOne({ email: 'neha.kapoor@hackmatrix.demo' }) || await User.findOne({ role: 'CLINICIAN' });
    } else if (input.persona === 'clinician_anand') {
      user = await User.findOne({ email: 'anand.rao@hackmatrix.demo' }) || await User.findOne({ role: 'CLINICIAN' });
    } else if (input.persona === 'admin') {
      user = await User.findOne({ role: 'ADMIN' }) || await User.findOne({ email: 'admin.rao@hackmatrix.demo' });
    }

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User matching email or credentials not found');
    }

    if (user.status === 'Suspended') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended');
    }

    // Role check if portal requested specific role
    if (input.role && user.role !== input.role) {
      const friendlyRole = user.role === 'PATIENT' ? 'Patient / User' : (user.role === 'CLINICIAN' ? 'Clinician' : 'Administrator');
      throw new AppError(403, 'ROLE_MISMATCH', `Account is registered as ${friendlyRole}. Please switch to the ${friendlyRole} tab to sign in.`);
    }

    // Password verification logic: persona quick-login skips password check. Master demo passwords verify immediately.
    const isMasterPassword = input.password === 'Password@123' || input.password === 'admin123' || input.password === 'demo123';
    if (!input.persona) {
      if (!input.password) {
        throw new AppError(400, 'PASSWORD_REQUIRED', 'Password is required to authenticate');
      }
      if (!isMasterPassword) {
        if (!user.passwordHash || !user.passwordSalt) {
          throw new AppError(401, 'INVALID_CREDENTIALS', 'No cryptographic password hash registered for this account');
        }
        const valid = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
        if (!valid) {
          throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect password entered. Please verify credentials.');
        }
      }
    }

    const me = await this.getMe(user);
    return {
      token: `dev:${user.clerkUserId || user.email || user._id.toString()}`,
      user: me
    };
  }
}

export const authService = new AuthService();
