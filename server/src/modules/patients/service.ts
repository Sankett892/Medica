import { Types } from 'mongoose';
import { Patient, IPatient } from '../../models/Patient.js';
import { Observation } from '../../models/Observation.js';
import { ConsentGrant } from '../../models/ConsentGrant.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { UpdatePatientMeInput } from './schema.js';
import { AppError } from '../../middleware/errorHandler.js';

export class PatientsService {
  async getProfile(patientId: Types.ObjectId) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    return {
      id: patient.identifiers[0] || patient._id.toString(),
      _id: patient._id,
      name: patient.name,
      dob: patient.dob,
      age: patient.age,
      bloodGroup: patient.bloodType || 'Unknown',
      sex: patient.sex,
      phone: patient.phone || '',
      abha: patient.abha || '',
      allergies: patient.allergies || [],
      facility: patient.facility || ''
    };
  }

  async updateProfile(patientId: Types.ObjectId, input: UpdatePatientMeInput) {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    if (input.phone !== undefined) {
      patient.phone = input.phone;
    }
    if (input.emergencyContact !== undefined) {
      patient.emergencyContact = input.emergencyContact;
    }

    await patient.save();
    return this.getProfile(patientId);
  }

  async getVitals(patientId: Types.ObjectId) {
    const vitals = await Observation.find({
      patientId,
      category: { $in: ['vital', 'measurement'] }
    }).sort({ effectiveAt: -1 }).limit(10);

    return vitals.map(v => ({
      label: v.display,
      value: v.value,
      unit: v.unit,
      time: v.effectiveAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }));
  }

  async getActivity(patientId: Types.ObjectId) {
    const events = await AuditEvent.find({ patientId }).sort({ at: -1 }).limit(10);
    return events.map(e => ({
      id: e._id.toString(),
      ts: e.ts,
      actor: e.actor,
      org: e.org || '—',
      action: e.action,
      resource: e.resource,
      outcome: e.outcome
    }));
  }

  async getSummary(patientId: Types.ObjectId) {
    const profile = await this.getProfile(patientId);
    const vitals = await this.getVitals(patientId);
    const activity = await this.getActivity(patientId);
    const activeGrantsCount = await ConsentGrant.countDocuments({
      patientId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    return {
      patient: profile,
      vitals,
      recentActivity: activity,
      activeGrantsCount
    };
  }

  async getAudit(patientId: Types.ObjectId) {
    const events = await AuditEvent.find({ patientId }).sort({ at: -1 });
    return events.map(e => ({
      id: e._id.toString(),
      ts: e.ts,
      actor: e.actor,
      role: e.actorRole,
      org: e.org || '—',
      action: e.action,
      resource: e.resource,
      outcome: e.outcome
    }));
  }
}

export const patientsService = new PatientsService();
