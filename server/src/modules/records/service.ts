import { Types } from 'mongoose';
import { Encounter } from '../../models/Encounter.js';
import { Observation } from '../../models/Observation.js';
import { ClinicalResource, ClinicalCategory } from '../../models/ClinicalResource.js';
import { formatAuditDate } from '../../middleware/audit.js';

export interface FormattedRecord {
  id: string;
  cat: ClinicalCategory;
  type: string;
  date: string;
  facility: string;
  clinician: string;
  summary: string;
  status: string;
  updated: string;
  fields: { k: string; v: string }[];
}

export class RecordsService {
  async getRecordsForPatient(
    patientId: Types.ObjectId,
    filter?: { cat?: string; q?: string; allowedCategories?: string[] }
  ): Promise<FormattedRecord[]> {
    const records: FormattedRecord[] = [];

    const shouldIncludeCat = (catName: string) => {
      if (filter?.allowedCategories && Array.isArray(filter.allowedCategories) && filter.allowedCategories.length > 0) {
        // match case-insensitively or normalized
        const normalized = filter.allowedCategories.map(c => c.toLowerCase());
        if (!normalized.includes(catName.toLowerCase())) {
          return false;
        }
      }
      if (filter?.cat && filter.cat !== 'all') {
        return filter.cat.toLowerCase() === catName.toLowerCase();
      }
      return true;
    };

    // 1. Encounters
    if (shouldIncludeCat('encounters')) {
      const encounters = await Encounter.find({ patientId }).sort({ occurredAt: -1 });
      for (const enc of encounters) {
        records.push({
          id: enc._id.toString(),
          cat: 'encounters',
          type: enc.type,
          date: enc.occurredAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          facility: enc.facility,
          clinician: enc.clinicianName || 'Attending Physician',
          summary: enc.summary,
          status: enc.status,
          updated: formatAuditDate(enc.updatedAt || enc.occurredAt),
          fields: enc.fields && enc.fields.length > 0 ? enc.fields : [
            { k: 'Encounter type', v: enc.type },
            { k: 'Disposition', v: enc.disposition || 'Discharged' },
            { k: 'Follow-up', v: enc.followUp || 'As needed' }
          ]
        });
      }
    }

    // 2. Observations
    if (shouldIncludeCat('observations')) {
      const observations = await Observation.find({ patientId }).sort({ effectiveAt: -1 });
      for (const obs of observations) {
        records.push({
          id: obs._id.toString(),
          cat: 'observations',
          type: obs.display,
          date: obs.effectiveAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          facility: obs.facility,
          clinician: obs.clinicianName || 'Nurse station',
          summary: obs.summary || `${obs.display}: ${obs.value} ${obs.unit}`,
          status: obs.status,
          updated: formatAuditDate(obs.updatedAt || obs.effectiveAt),
          fields: obs.fields && obs.fields.length > 0 ? obs.fields : [
            { k: obs.display, v: `${obs.value} ${obs.unit}` }
          ]
        });
      }
    }

    // 3. Clinical Resources (medications, allergies, reports, immunizations, careplans, encounters, observations)
    const resourceCategories = ['medications', 'allergies', 'reports', 'immunizations', 'careplans', 'encounters', 'observations'];
    const matchingResourceCats = resourceCategories.filter(shouldIncludeCat);

    if (matchingResourceCats.length > 0) {
      const resources = await ClinicalResource.find({
        patientId,
        cat: { $in: matchingResourceCats }
      }).sort({ occurredAt: -1 });

      for (const res of resources) {
        records.push({
          id: res._id.toString(),
          cat: res.cat,
          type: res.type,
          date: res.date,
          facility: res.facility,
          clinician: res.clinician,
          summary: res.summary,
          status: res.status,
          updated: formatAuditDate(res.updatedAt || res.occurredAt),
          fields: res.fields
        });
      }
    }

    // Filter by query if provided
    let result = records;
    if (filter?.q && filter.q.trim().length > 0) {
      const q = filter.q.trim().toLowerCase();
      result = records.filter(r =>
        r.type.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.facility.toLowerCase().includes(q) ||
        r.clinician.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async getRecordById(patientId: Types.ObjectId, recordId: string): Promise<FormattedRecord | null> {
    if (!Types.ObjectId.isValid(recordId)) {
      return null;
    }
    const id = new Types.ObjectId(recordId);

    // Try Encounter
    const enc = await Encounter.findOne({ _id: id, patientId });
    if (enc) {
      return {
        id: enc._id.toString(),
        cat: 'encounters',
        type: enc.type,
        date: enc.occurredAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        facility: enc.facility,
        clinician: enc.clinicianName || 'Attending Physician',
        summary: enc.summary,
        status: enc.status,
        updated: formatAuditDate(enc.updatedAt || enc.occurredAt),
        fields: enc.fields && enc.fields.length > 0 ? enc.fields : [
          { k: 'Encounter type', v: enc.type },
          { k: 'Disposition', v: enc.disposition || 'Discharged' }
        ]
      };
    }

    // Try Observation
    const obs = await Observation.findOne({ _id: id, patientId });
    if (obs) {
      return {
        id: obs._id.toString(),
        cat: 'observations',
        type: obs.display,
        date: obs.effectiveAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        facility: obs.facility,
        clinician: obs.clinicianName || 'Nurse station',
        summary: obs.summary || `${obs.display}: ${obs.value} ${obs.unit}`,
        status: obs.status,
        updated: formatAuditDate(obs.updatedAt || obs.effectiveAt),
        fields: obs.fields
      };
    }

    // Try ClinicalResource
    const res = await ClinicalResource.findOne({ _id: id, patientId });
    if (res) {
      return {
        id: res._id.toString(),
        cat: res.cat,
        type: res.type,
        date: res.date,
        facility: res.facility,
        clinician: res.clinician,
        summary: res.summary,
        status: res.status,
        updated: formatAuditDate(res.updatedAt || res.occurredAt),
        fields: res.fields
      };
    }

    return null;
  }

  async createRecord(
    patientId: Types.ObjectId,
    data: {
      cat: ClinicalCategory;
      type: string;
      summary: string;
      facility?: string;
      clinician?: string;
      fields?: { k: string; v: string }[];
      status?: 'Active' | 'Final' | 'Completed' | 'Resolved' | 'Inactive';
    }
  ): Promise<FormattedRecord> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const resource = await ClinicalResource.create({
      patientId,
      cat: data.cat,
      type: data.type,
      date: dateStr,
      occurredAt: now,
      facility: data.facility || 'Sunrise Multispecialty Hospital',
      clinician: data.clinician || 'Patient (Self-reported)',
      summary: data.summary,
      status: data.status || 'Active',
      fields: data.fields || [{ k: 'Entry Date', v: dateStr }, { k: 'Source', v: data.clinician || 'Patient Self-Entry' }]
    });

    return {
      id: resource._id.toString(),
      cat: resource.cat,
      type: resource.type,
      date: resource.date,
      facility: resource.facility,
      clinician: resource.clinician,
      summary: resource.summary,
      status: resource.status,
      updated: formatAuditDate(resource.updatedAt || now),
      fields: resource.fields
    };
  }
}

export const recordsService = new RecordsService();
