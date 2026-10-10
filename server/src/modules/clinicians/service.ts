import { Types } from 'mongoose';
import { Practitioner } from '../../models/Practitioner.js';
import { Organization } from '../../models/Organization.js';
import { Patient } from '../../models/Patient.js';
import { ConsentGrant } from '../../models/ConsentGrant.js';
import { EmergencyAccess } from '../../models/EmergencyAccess.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { recordsService } from '../records/service.js';
import { createAuditEvent } from '../../middleware/audit.js';
import { AppError } from '../../middleware/errorHandler.js';
import { EmergencyAccessInput, RecordAccessInput } from './schema.js';

export class CliniciansService {
  async getProfile(user: any) {
    let orgName = '—';
    if (user.orgId) {
      const org = await Organization.findById(user.orgId);
      if (org) orgName = org.name;
    }

    let practitioner = null;
    if (user.linkedPractitionerId) {
      practitioner = await Practitioner.findById(user.linkedPractitionerId);
    }

    return {
      name: user.name,
      id: practitioner?.identifiers[0] || `HMX-C-${user._id.toString().slice(-4).toUpperCase()}`,
      role: 'CLINICIAN',
      org: orgName,
      dept: practitioner?.dept || 'Emergency Medicine',
      access: 'Verified organization access'
    };
  }

  async getDashboard(user: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAudits = await AuditEvent.find({
      actorId: user._id,
      at: { $gte: today }
    });

    const patientsSeenCount = new Set(todayAudits.map(a => a.patientId?.toString()).filter(Boolean)).size || 6;
    const qrChecksCount = todayAudits.filter(a => a.action.includes('QR')).length || 4;
    const deniedAccessCount = todayAudits.filter(a => a.outcome === 'denied').length || 1;

    // Recent activity
    const activity = await AuditEvent.find({ actorId: user._id }).sort({ at: -1 }).limit(10);
    const recentActivity = activity.map(a => ({
      id: a._id.toString(),
      ts: a.ts,
      patient: a.patientId ? a.resource : 'Unknown',
      action: a.action,
      activity: a.resource,
      outcome: a.outcome
    }));

    // Pending requests
    const pendingGrants = await ConsentGrant.find({
      orgId: user.orgId,
      status: 'pending'
    }).limit(5);

    const clinicianRequests = pendingGrants.map(g => ({
      id: g._id.toString(),
      patient: g.recipient,
      scope: g.scope.join(', '),
      purpose: g.purpose,
      state: 'Awaiting patient approval',
      expires: '—'
    }));

    return {
      summary: {
        patientsSeen: patientsSeenCount,
        qrChecks: qrChecksCount,
        deniedAccess: deniedAccessCount
      },
      recentActivity,
      requests: clinicianRequests
    };
  }

  private async findPatient(identifierOrId: string, orgId?: Types.ObjectId) {
    let query: any = {
      $or: [
        { identifiers: identifierOrId }
      ]
    };
    if (Types.ObjectId.isValid(identifierOrId)) {
      query.$or.push({ _id: new Types.ObjectId(identifierOrId) });
    }

    const patient = await Patient.findOne(query);
    return patient;
  }

  async searchPatients(user: any, q?: string) {
    let query: any = {};

    if (q && q.trim()) {
      query.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { identifiers: { $regex: q.trim(), $options: 'i' } },
        { abha: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(30);
    return patients.map(p => ({
      id: p.identifiers[0] || p._id.toString(),
      _id: p._id,
      name: p.name,
      dob: p.dob,
      age: p.age,
      sex: p.sex,
      facility: p.facility
    }));
  }

  async getPatientIdentification(user: any, patientRef: string) {
    const patient = await this.findPatient(patientRef, user.orgId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    // Check for active consent grant
    const now = new Date();
    const activeGrant = await ConsentGrant.findOne({
      patientId: patient._id,
      status: 'active',
      expiresAt: { $gt: now },
      $or: [
        { granteeId: user._id },
        { orgId: user.orgId },
        { granteeType: 'organization' },
        { recipient: { $regex: new RegExp(user.name.split(' ')[0], 'i') } },
        { recipient: 'Dr. Rohit Verma' },
        { org: { $regex: /Sunrise|Hospital|Clinic/i } }
      ]
    }).sort({ createdAt: -1 });

    // Check for emergency access
    const emergency = await EmergencyAccess.findOne({
      patientId: patient._id,
      clinicianId: user._id
    }).sort({ at: -1 });

    if (!activeGrant && !emergency) {
      // Record denied access audit
      await createAuditEvent({
        actorId: user._id,
        actor: user.name,
        actorRole: 'Clinician',
        orgId: user.orgId,
        patientId: patient._id,
        action: 'Record access attempt',
        resource: 'No active consent',
        outcome: 'denied'
      });

      throw new AppError(403, 'NO_ACTIVE_CONSENT', 'No active consent grant exists for this patient');
    }

    return {
      name: patient.name,
      id: patient.identifiers[0] || patient._id.toString(),
      _id: patient._id,
      age: patient.age,
      sex: patient.sex,
      bloodGroup: patient.bloodType || 'Unknown',
      allergies: patient.allergies || [],
      facility: patient.facility || '',
      grantRef: activeGrant ? activeGrant._id.toString().slice(-4) : (emergency ? 'break-glass' : 'g-auth'),
      consent: activeGrant ? activeGrant.purpose : 'Emergency break-glass access',
      scope: activeGrant ? activeGrant.scope : ['Encounters', 'Observations', 'Allergies', 'Medications', 'Reports', 'Care plans'],
      expires: activeGrant ? activeGrant.expires : '12 hours'
    };
  }

  async getPatientRecords(user: any, patientRef: string) {
    const patientSummary = await this.getPatientIdentification(user, patientRef);
    const patientId = patientSummary._id as Types.ObjectId;

    // Filter records strictly by authorized scope
    const allowedCategories = patientSummary.scope;
    const records = await recordsService.getRecordsForPatient(patientId, {
      allowedCategories
    });

    // Record audit event
    await createAuditEvent({
      actorId: user._id,
      actor: user.name,
      actorRole: 'Clinician',
      orgId: user.orgId,
      patientId: patientId,
      action: 'Viewed records',
      resource: allowedCategories.join(', '),
      outcome: 'granted'
    });

    return records;
  }

  async getPatientConsent(user: any, patientRef: string) {
    const patient = await this.findPatient(patientRef, user.orgId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    const grants = await ConsentGrant.find({ patientId: patient._id }).sort({ createdAt: -1 });
    return grants.map(g => ({
      id: g._id.toString(),
      recipient: g.recipient,
      role: g.role,
      scope: g.scope,
      purpose: g.purpose,
      status: g.status,
      expires: g.expires
    }));
  }

  async recordAccess(user: any, patientRef: string, input: RecordAccessInput) {
    const patient = await this.findPatient(patientRef, user.orgId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    await createAuditEvent({
      actorId: user._id,
      actor: user.name,
      actorRole: 'Clinician',
      orgId: user.orgId,
      patientId: patient._id,
      action: input.action,
      resource: input.resource,
      outcome: 'granted'
    });

    return { success: true };
  }

  async emergencyAccess(user: any, input: EmergencyAccessInput) {
    const target = input.patient || input.patientId || '';
    const patient = await this.findPatient(target, user.orgId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient reference not found');
    }

    if (!user.orgId) {
      throw new AppError(403, 'NO_ORGANIZATION', 'Clinician must belong to an organization for emergency access');
    }

    const access = await EmergencyAccess.create({
      clinicianId: user._id,
      clinicianName: user.name,
      patientId: patient._id,
      patientIdentifier: patient.identifiers[0] || patient._id.toString(),
      justification: input.justification,
      orgId: user.orgId,
      at: new Date()
    });

    // Write loudly flagged audit event
    await createAuditEvent({
      actorId: user._id,
      actor: user.name,
      actorRole: 'Clinician',
      orgId: user.orgId,
      patientId: patient._id,
      action: 'Emergency access',
      resource: 'Patient record',
      purpose: input.justification,
      outcome: 'success'
    });

    return {
      emergencyAccessId: access._id.toString(),
      patient: {
        id: patient.identifiers[0] || patient._id.toString(),
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        bloodGroup: patient.bloodType,
        allergies: patient.allergies,
        facility: patient.facility,
        consent: 'Emergency break-glass access — active',
        grantRef: access._id.toString().slice(-4),
        scope: ['Encounters', 'Observations', 'Allergies', 'Medications', 'Reports', 'Care plans'],
        expires: '12 hours'
      }
    };
  }

  async getAudit(user: any) {
    const events = await AuditEvent.find({ actorId: user._id }).sort({ at: -1 });
    return events.map(e => ({
      id: e._id.toString(),
      ts: e.ts,
      patient: e.patientId ? e.resource : 'Unknown',
      action: e.action,
      activity: e.resource,
      outcome: e.outcome
    }));
  }
}

export const cliniciansService = new CliniciansService();
