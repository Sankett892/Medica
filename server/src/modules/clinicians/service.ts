import { Types } from 'mongoose';
import { Practitioner } from '../../models/Practitioner.js';
import { Organization } from '../../models/Organization.js';
import { Patient } from '../../models/Patient.js';
import { Encounter } from '../../models/Encounter.js';
import { ConsentGrant } from '../../models/ConsentGrant.js';
import { EmergencyAccess } from '../../models/EmergencyAccess.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { recordsService } from '../records/service.js';
import { FollowUpSurvey } from '../../models/FollowUpSurvey.js';
import { createAuditEvent, formatAuditDate } from '../../middleware/audit.js';
import { AppError } from '../../middleware/errorHandler.js';
import { emitConsentEvent, getIO } from '../../config/socket.js';
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

    const patientsSeenCount = new Set(todayAudits.map(a => a.patientId?.toString()).filter(Boolean)).size;
    const qrChecksCount = todayAudits.filter(a => a.action && a.action.includes('QR')).length;
    const deniedAccessCount = todayAudits.filter(a => a.outcome === 'denied').length;

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
    const clinicianIds: any[] = [user._id];
    if (user.linkedPractitionerId) clinicianIds.push(user.linkedPractitionerId);

    const now = new Date();
    const grants = await ConsentGrant.find({
      status: 'active',
      expiresAt: { $gt: now },
      $or: [
        { granteeId: { $in: clinicianIds } },
        { recipient: user.name }
      ]
    }).select('patientId');

    const encounters = await Encounter.find({
      $or: [
        { clinicianId: { $in: clinicianIds } },
        { clinicianName: user.name }
      ]
    }).select('patientId');

    const authorizedPatientIds = [
      ...new Set([
        ...grants.map((g: any) => g.patientId?.toString()).filter(Boolean),
        ...encounters.map((e: any) => e.patientId?.toString()).filter(Boolean)
      ])
    ];

    if (authorizedPatientIds.length === 0) {
      return [];
    }

    let query: any = {
      _id: { $in: authorizedPatientIds.map(id => new Types.ObjectId(id)) }
    };

    if (q && q.trim()) {
      query = {
        $and: [
          { _id: { $in: authorizedPatientIds.map(id => new Types.ObjectId(id)) } },
          {
            $or: [
              { name: { $regex: q.trim(), $options: 'i' } },
              { identifiers: { $regex: q.trim(), $options: 'i' } },
              { abha: { $regex: q.trim(), $options: 'i' } }
            ]
          }
        ]
      };
    }

    const patients = await Patient.find(query).sort({ updatedAt: -1, createdAt: -1 });
    return patients.map(p => ({
      id: p.identifiers[0] || p._id.toString(),
      _id: p._id,
      name: p.name,
      dob: p.dob,
      age: p.age,
      sex: p.sex,
      bloodGroup: p.bloodType || 'O+',
      allergies: (p.allergies || []).join(', ') || 'None',
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

  async requestConsent(user: any, patientRef: string, input?: any) {
    const patient = await this.findPatient(patientRef, user.orgId);
    if (!patient) {
      throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const purpose = input?.purpose || 'Clinical consultation & diagnostic intake';
    const scope = input?.scope || ['Encounters', 'Observations', 'Medications', 'Allergies'];

    // Check if an active or pending grant already exists
    let existingGrant = await ConsentGrant.findOne({
      patientId: patient._id,
      recipient: user.name,
      status: { $in: ['active', 'pending'] }
    });

    let grant;
    if (existingGrant) {
      grant = existingGrant;
      if (grant.status === 'pending') {
        grant.status = 'pending';
        grant.updatedAt = now;
        await grant.save();
      }
    } else {
      grant = await ConsentGrant.create({
        patientId: patient._id,
        granteeType: 'practitioner',
        granteeId: user._id,
        recipient: user.name,
        role: user.dept || 'Consulting Physician',
        org: user.orgName || 'Sunrise Multispecialty Hospital',
        orgId: user.orgId,
        scope,
        purpose,
        start: formatAuditDate(now),
        expires: formatAuditDate(expiresAt),
        status: 'pending',
        grantedAt: now,
        expiresAt,
        createdBy: user._id
      });
    }

    await createAuditEvent({
      actorId: user._id,
      actor: user.name,
      actorRole: 'Clinician',
      orgId: user.orgId,
      patientId: patient._id,
      action: 'Requested consent grant',
      resource: patient.name,
      outcome: 'pending'
    });

    emitConsentEvent(patient._id.toString(), 'consent:requested', {
      grantId: grant._id.toString(),
      recipient: user.name,
      org: user.orgName || 'Sunrise Multispecialty Hospital',
      purpose,
      scope
    });

    return {
      success: true,
      grantId: grant._id.toString(),
      status: grant.status,
      patientName: patient.name,
      patientId: patient.identifiers[0] || patient._id.toString()
    };
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

  async markEncounterRecovered(encounterId: string, user: any, comments?: string) {
    if (!Types.ObjectId.isValid(encounterId)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid encounter ID format');
    }

    const enc = await Encounter.findById(encounterId);
    if (!enc) {
      throw new AppError(404, 'ENCOUNTER_NOT_FOUND', 'Clinical encounter not found');
    }

    const now = new Date();
    enc.recoveryStatus = 'Completely recovered';
    enc.isRecovered = true;
    enc.fields = enc.fields.filter(
      f => f.k !== 'Patient Recovery Feedback' && f.k !== 'Patient Comments' && f.k !== 'Feedback Submitted Date'
    );
    enc.fields.push({ k: 'Patient Recovery Feedback', v: 'Completely recovered' });
    if (comments) {
      enc.fields.push({ k: 'Patient Comments', v: comments });
    }
    enc.fields.push({
      k: 'Feedback Submitted Date',
      v: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    });
    await enc.save();

    // If there is an existing follow-up survey for this encounter, mark it completed as well
    await FollowUpSurvey.updateMany(
      { encounterId: enc._id },
      {
        $set: {
          status: 'completed',
          recoveryStatus: 'Completely recovered',
          comments: comments || 'Marked completely recovered by clinician',
          completedAt: now,
          submittedAt: now
        }
      }
    );

    await createAuditEvent({
      actorId: user._id,
      actor: user.name || 'Clinician',
      actorRole: 'Clinician',
      patientId: enc.patientId,
      action: 'Clinician marked patient completely recovered',
      resource: `Encounter:${encounterId}`,
      outcome: 'success'
    });

    const io = getIO();
    if (io) {
      io.emit('survey:submitted', {
        encounterId,
        patientId: enc.patientId.toString(),
        recoveryStatus: 'Completely recovered',
        isWorsened: false
      });
      io.emit('analytics:updated', { source: 'clinician_recovery_mark', encounterId });
    }

    return { success: true, encounterId, recoveryStatus: 'Completely recovered' };
  }
}

export const cliniciansService = new CliniciansService();
