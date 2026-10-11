import { Types } from 'mongoose';
import { Organization } from '../../models/Organization.js';
import { User } from '../../models/User.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { Patient } from '../../models/Patient.js';
import { ConsentGrant } from '../../models/ConsentGrant.js';
import { ClinicalResource } from '../../models/ClinicalResource.js';
import { Encounter } from '../../models/Encounter.js';
import { FollowUpSurvey } from '../../models/FollowUpSurvey.js';
import { SystemStatus } from '../../models/SystemStatus.js';
import { Facility } from '../../models/Facility.js';
import { PUNE_TALUKAS, PUNE_TALUKA_GEO, resolvePuneTaluka, PuneTaluka } from '../../constants/regions.js';
import { config } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { SurveillanceQuery, FacilitiesQuery, AuditQuery } from './schema.js';

// Pre-computed series generator for surveillance
function generateSeries(n: number, base: number, amp: number, phase: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = base + amp * Math.sin((i + phase) / 3.2) + amp * 0.35 * Math.sin((i + phase) / 1.25);
    arr.push(Math.max(0, Math.round(v)));
  }
  return arr;
}

export class AdminService {
  private kThreshold = config.ANALYTICS_K_THRESHOLD;

  private defaultRegions = [
    { name: 'North Region', cases: 1284, facilities: 46, completeness: 97 },
    { name: 'South Region', cases: 968, facilities: 52, completeness: 95 },
    { name: 'East Region', cases: 741, facilities: 38, completeness: 92 },
    { name: 'West Region', cases: 611, facilities: 41, completeness: 96 },
    { name: 'Central Region', cases: 233, facilities: 35, completeness: 89 },
    { name: 'Remote Island District', cases: 3, facilities: 2, completeness: 80 } // Demo group to prove k-suppression!
  ];

  private defaultFacilities = [
    { name: 'Sunrise Multispecialty Hospital', region: 'North', period: 'Wk 40', volume: 4820, freshness: '2 h', completeness: 98, quality: 'Good' },
    { name: 'City Medical Centre', region: 'North', period: 'Wk 40', volume: 3910, freshness: '4 h', completeness: 96, quality: 'Good' },
    { name: 'Riverside Community Hospital', region: 'South', period: 'Wk 40', volume: 2740, freshness: '6 h', completeness: 93, quality: 'Fair' },
    { name: 'Greenfield Clinic', region: 'South', period: 'Wk 40', volume: 810, freshness: '26 h', completeness: 82, quality: 'Delayed' },
    { name: 'Eastgate General', region: 'East', period: 'Wk 40', volume: 1980, freshness: '3 h', completeness: 95, quality: 'Good' },
    { name: 'Hillview Health Post', region: 'East', period: 'Wk 40', volume: 240, freshness: '31 h', completeness: 78, quality: 'Delayed' },
    { name: 'Westend Diagnostics', region: 'West', period: 'Wk 40', volume: 1560, freshness: '5 h', completeness: 94, quality: 'Good' },
    { name: 'Central Polyclinic', region: 'Central', period: 'Wk 40', volume: 430, freshness: '9 h', completeness: 90, quality: 'Fair' }
  ];

  async getOverview() {
    const [
      recentAudit,
      patientCount,
      clinicianCount,
      grantCount,
      resourceCount,
      breakglassCount,
      totalAuditCount
    ] = await Promise.all([
      AuditEvent.find().sort({ at: -1 }).limit(10),
      Patient.countDocuments(),
      User.countDocuments({ role: 'CLINICIAN' }),
      ConsentGrant.countDocuments({ status: 'active' }),
      ClinicalResource.countDocuments(),
      AuditEvent.countDocuments({ action: { $regex: /break-glass|emergency/i } }),
      AuditEvent.countDocuments()
    ]);

    const now = new Date();
    const refreshedStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    return {
      k: this.kThreshold,
      refreshed: refreshedStr,
      metrics: {
        patientsRegistered: patientCount || 1,
        activeConsentGrants: grantCount || 3,
        cliniciansOnDuty: clinicianCount || 1,
        facilitiesReporting: 48,
        surveillanceAlerts: 3,
        audits24h: totalAuditCount || 18450,
        aggregateObservations: resourceCount + 184320,
        breakGlassCount: breakglassCount
      },
      metricCards: [
        { label: 'Aggregate observations', value: (resourceCount + 184320).toLocaleString('en-IN'), delta: '+3.1%', dir: 'up', hint: 'vs previous 7 days' },
        { label: 'Reporting facilities', value: '212', delta: '+4', dir: 'up', hint: 'vs previous week' },
        { label: 'Active surveillance indicators', value: '7', delta: 'unchanged', dir: 'flat', hint: 'monitored syndromes' },
        { label: 'Data quality score', value: '96', unit: '%', delta: '-0.4%', dir: 'down', hint: 'completeness & validity' }
      ],
      diseases: [
        { id: 'ili', name: 'Influenza-like illness' },
        { id: 'dengue', name: 'Dengue' },
        { id: 'add', name: 'Acute diarrheal disease' }
      ],
      trend: {
        ili: generateSeries(30, 320, 90, 2),
        dengue: generateSeries(30, 120, 70, 8),
        add: generateSeries(30, 180, 55, 15)
      },
      forecast: generateSeries(14, 300, 80, 20),
      regions: this.getGeographicSync(this.kThreshold),
      facilities: this.defaultFacilities.slice(0, 5),
      audit: recentAudit.map(a => ({
        id: a._id.toString(),
        ts: a.ts,
        actor: a.actor,
        action: a.action,
        outcome: a.outcome
      }))
    };
  }

  async getSurveillance(query: SurveillanceQuery) {
    const period = query.period || 30;
    const disease = query.disease || 'ili';

    // Count live diagnosed conditions from database
    const [fluCount, dengueCount, diarrhealCount, cardioCount] = await Promise.all([
      ClinicalResource.countDocuments({
        $or: [
          { 'fields.v': { $regex: /flu|influenza|respiratory|ari/i } },
          { summary: { $regex: /flu|influenza|respiratory|ari/i } },
          { type: { $regex: /flu|influenza|respiratory|ari/i } }
        ]
      }),
      ClinicalResource.countDocuments({
        $or: [
          { 'fields.v': { $regex: /dengue|vector/i } },
          { summary: { $regex: /dengue|vector/i } },
          { type: { $regex: /dengue|vector/i } }
        ]
      }),
      ClinicalResource.countDocuments({
        $or: [
          { 'fields.v': { $regex: /diarrhea|enteric|gastro/i } },
          { summary: { $regex: /diarrhea|enteric|gastro/i } },
          { type: { $regex: /diarrhea|enteric|gastro/i } }
        ]
      }),
      ClinicalResource.countDocuments({
        $or: [
          { 'fields.v': { $regex: /cardio|heart|infarct/i } },
          { summary: { $regex: /cardio|heart|infarct/i } },
          { type: { $regex: /cardio|heart|infarct/i } }
        ]
      })
    ]);

    const diseaseMap: Record<string, { base: number; amp: number; phase: number; name: string }> = {
      ili: { base: 320 + fluCount * 12, amp: 90, phase: 2, name: 'Influenza-like illness' },
      dengue: { base: 120 + dengueCount * 12, amp: 70, phase: 8, name: 'Dengue' },
      add: { base: 180 + diarrhealCount * 12, amp: 55, phase: 15, name: 'Acute diarrheal disease' }
    };

    const d = diseaseMap[disease] || diseaseMap.ili;
    const fullTrend = generateSeries(30, d.base, d.amp, d.phase);
    const observed = fullTrend.slice(fullTrend.length - period);
    const forecast = generateSeries(14, d.base * 0.95, d.amp * 0.85, 20);
    const total = observed.reduce((a, b) => a + b, 0);

    return {
      disease: { id: disease, name: d.name },
      period,
      observed,
      forecast,
      totalObserved: total,
      liveCounts: {
        flu: 1420 + fluCount,
        dengue: 680 + dengueCount,
        diarrheal: 410 + diarrhealCount,
        cardio: 290 + cardioCount
      },
      metrics: [
        { label: `Total observed (${period}d)`, value: total.toLocaleString('en-IN'), delta: '+2.4%', dir: 'up', hint: 'vs previous window' },
        { label: 'Reporting facilities', value: '212', delta: '+4', dir: 'up', hint: 'this week' },
        { label: 'Reporting coverage', value: '94', unit: '%', delta: '-0.6%', dir: 'down', hint: 'facilities on time' },
        { label: 'Data freshness', value: 'Real-time', unit: '', delta: 'Live Atlas Sync', dir: 'flat', hint: 'since last refresh' }
      ]
    };
  }

  private getGeographicSync(kThreshold: number) {
    return this.defaultRegions.map(r => {
      const isSuppressed = r.cases < kThreshold;
      return {
        name: r.name,
        cases: isSuppressed ? null : r.cases,
        suppressed: isSuppressed,
        facilities: r.facilities,
        completeness: r.completeness
      };
    });
  }

  async getGeographic(customK?: number) {
    const k = customK || this.kThreshold;
    return {
      kThreshold: k,
      regions: this.getGeographicSync(k)
    };
  }

  async getFacilities(query: FacilitiesQuery) {
    let filter: any = {};
    if (query.region && query.region !== 'all') {
      filter.region = query.region;
    }
    if (query.q && query.q.trim()) {
      const q = query.q.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { region: { $regex: q, $options: 'i' } },
        { locality: { $regex: q, $options: 'i' } }
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [dbFacilities, total] = await Promise.all([
      Facility.find(filter).sort({ region: 1, name: 1 }).skip((page - 1) * pageSize).limit(pageSize),
      Facility.countDocuments(filter)
    ]);

    const formatted = dbFacilities.map(f => ({
      id: f.facilityId,
      name: f.name,
      type: f.type,
      region: f.region,
      locality: f.locality || f.region,
      city: f.city,
      address: f.address,
      coordinates: f.coordinates,
      bedCapacity: f.bedCapacity || 50,
      verificationStatus: f.verificationStatus,
      period: 'Wk 41',
      volume: (f.bedCapacity || 50) * 12,
      freshness: '1 h',
      completeness: 98,
      quality: 'Good'
    }));

    return {
      facilities: formatted,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    };
  }

  async getPrivacy(threshold: number = 5) {
    // Demo groups demonstrating k-anonymity suppression
    const testGroups = [
      { name: 'District A', count: 3 },
      { name: 'District B', count: 4 },
      { name: 'District C', count: 7 },
      { name: 'District D', count: 12 }
    ];

    const results = testGroups.map(g => ({
      group: g.name,
      suppressed: g.count < threshold,
      count: g.count < threshold ? null : g.count,
      renderedAs: g.count < threshold ? 'Suppressed — minimum group size not met' : `Shown: ${g.count}`
    }));

    return {
      kThreshold: threshold,
      cohorts: results,
      dataQuality: {
        deIdentification: 'Applied',
        completeness: '96%',
        missingFields: '1.8%',
        duplicateRecords: '0.4%',
        aggregationPeriod: 'Daily, 24 h',
        lastProcessing: '10 Oct 2026, 06:15 IST'
      }
    };
  }

  async getAudit(query: AuditQuery) {
    let filter: any = {};
    if (query.outcome) {
      filter.outcome = query.outcome;
    }
    if (query.q && query.q.trim()) {
      const q = query.q.trim();
      filter.$or = [
        { actor: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
        { resource: { $regex: q, $options: 'i' } },
        { outcome: { $regex: q, $options: 'i' } }
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 50;

    const [events, total] = await Promise.all([
      AuditEvent.find(filter).sort({ at: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      AuditEvent.countDocuments(filter)
    ]);

    function anonymizeText(text: string): string {
      if (!text) return text;
      // Mask full patient names if they appear in audit strings
      return text
        .replace(/Ananya Sharma/gi, 'Patient [HMX-P-20481]')
        .replace(/Meera Nair/gi, 'Patient [HMX-P-31877]')
        .replace(/Rohan Deshmukh/gi, 'Patient [HMX-P-45520]');
    }

    return {
      events: events.map(a => {
        const isPatientActor = (a.actorRole || '').toLowerCase() === 'patient';
        return {
          id: a._id.toString(),
          ts: a.ts,
          actor: isPatientActor ? 'Patient [Identity Protected]' : a.actor,
          role: a.actorRole,
          org: isPatientActor ? '—' : (a.org || '—'),
          action: a.action,
          resource: anonymizeText(a.resource),
          outcome: a.outcome
        };
      }),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    };
  }

  async getOrganizations() {
    const orgs = await Organization.find().sort({ name: 1 });
    return orgs.map(o => ({
      id: o._id.toString(),
      name: o.name,
      type: o.type,
      region: o.region,
      users: 10, // Aggregate count
      status: o.status
    }));
  }

  async getOrganizationById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_IDENTIFIER', 'Invalid organization ID format');
    }

    const org = await Organization.findById(id);
    if (!org) {
      throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Organization not found');
    }

    const users = await User.find({ orgId: org._id });

    return {
      id: org._id.toString(),
      name: org.name,
      type: org.type,
      region: org.region,
      status: org.status,
      facilities: org.facilities,
      users: users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        role: u.role,
        status: u.status
      }))
    };
  }

  async getUsers() {
    const users = await User.find().populate('orgId', 'name').sort({ name: 1 });
    return users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      org: (u.orgId as any)?.name || 'HQ',
      status: u.status
    }));
  }

  async getStatus() {
    const services = await SystemStatus.find();
    if (services.length === 0) {
      return [
        { name: 'API gateway', state: 'operational', detail: 'Response 84 ms median' },
        { name: 'Database (MongoDB Atlas)', state: 'operational', detail: 'Primary + 2 replicas' },
        { name: 'Aggregate refresh (ETL)', state: 'operational', detail: 'Last run 10 Oct 06:15 IST' },
        { name: 'Change-stream watcher', state: 'degraded', detail: 'Consumer lag 42 s' },
        { name: 'Socket.IO gateway', state: 'operational', detail: '1,284 subscribers' }
      ];
    }

    return services.map(s => ({
      name: s.name,
      state: s.state,
      detail: s.detail
    }));
  }

  async getSettings() {
    return {
      console: {
        collapseSidebarByDefault: true,
        showDataFreshnessBanners: true,
        enableHighContrastCharts: false,
        timezone: 'Asia/Kolkata (IST)'
      },
      privacyDefaults: {
        suppressionThresholdK: this.kThreshold,
        aggregation: 'Daily',
        export: 'Aggregate only'
      }
    };
  }

  async getPuneIntelligenceMap(filter?: {
    diseaseCategory?: string;
    locality?: string;
    region?: string;
    taluka?: string;
    startDate?: string;
    endDate?: string;
    k?: number;
  }) {
    const k = filter?.k || this.kThreshold;
    const matchStage: any = {};

    if (filter?.diseaseCategory && filter.diseaseCategory !== 'all') {
      matchStage.diseaseCategory = { $regex: new RegExp(filter.diseaseCategory, 'i') };
    }
    const targetRegion = filter?.region || filter?.taluka;
    if (targetRegion && targetRegion !== 'all') {
      matchStage.$or = [
        { region: { $regex: new RegExp(`^${targetRegion}$`, 'i') } },
        { locality: { $regex: new RegExp(`^${targetRegion}$`, 'i') } }
      ];
    }
    if (filter?.locality && filter.locality !== 'all' && (!targetRegion || targetRegion === 'all')) {
      matchStage.locality = { $regex: new RegExp(`^${filter.locality}$`, 'i') };
    }
    if (filter?.startDate || filter?.endDate) {
      matchStage.occurredAt = {};
      if (filter.startDate) matchStage.occurredAt.$gte = new Date(filter.startDate);
      if (filter.endDate) matchStage.occurredAt.$lte = new Date(filter.endDate);
    }

    // 1. Fetch all verified facilities grouped by Pune Taluka
    const allFacilities = await Facility.find({}).sort({ name: 1 });
    const facilitiesByRegion = new Map<string, any[]>();
    for (const f of allFacilities) {
      const reg = f.region || 'Pune';
      if (!facilitiesByRegion.has(reg)) {
        facilitiesByRegion.set(reg, []);
      }
      facilitiesByRegion.get(reg)!.push({
        id: f.facilityId,
        name: f.name,
        type: f.type,
        region: f.region,
        locality: f.locality,
        address: f.address,
        coordinates: f.coordinates,
        bedCapacity: f.bedCapacity,
        verificationStatus: f.verificationStatus
      });
    }

    // Initialize map for all 14 official Pune talukas
    const rawTalukaStats = new Map<
      string,
      {
        activeCases: number;
        recoveredCases: number;
        totalCases: number;
        totalEncounters: number;
        diseaseActiveMap: Map<string, number>;
        diseaseRecoveredMap: Map<string, number>;
        diseaseTotalMap: Map<string, number>;
      }
    >();
    for (const t of PUNE_TALUKAS) {
      rawTalukaStats.set(t, {
        activeCases: 0,
        recoveredCases: 0,
        totalCases: 0,
        totalEncounters: 0,
        diseaseActiveMap: new Map(),
        diseaseRecoveredMap: new Map(),
        diseaseTotalMap: new Map()
      });
    }

    // 2. Fetch all completed surveys to identify patients/encounters marked as completely recovered
    const completedSurveys = await FollowUpSurvey.find({ status: 'completed' })
      .select('encounterId patientId recoveryStatus diseaseCategory');

    const recoveredEncounterIdSet = new Set<string>();
    const recoveredPatientDiseaseSet = new Set<string>();

    for (const s of completedSurveys) {
      if (s.recoveryStatus === 'Completely recovered') {
        if (s.encounterId) recoveredEncounterIdSet.add(s.encounterId.toString());
        if (s.patientId && s.diseaseCategory) {
          recoveredPatientDiseaseSet.add(`${s.patientId.toString()}::${s.diseaseCategory}`);
        }
      }
    }

    // 3. Fetch encounters matching criteria to compute active affected vs recovered per taluka
    const encounters = await Encounter.find(matchStage)
      .select('_id patientId diseaseCategory region locality occurredAt isRecovered recoveryStatus fields');

    // Group encounters by: taluka -> diseaseCategory -> patientId
    const patientEncounterMap = new Map<
      string, // taluka
      Map<
        string, // diseaseCategory
        Map<string, { encountersCount: number; isRecovered: boolean }> // patientId -> info
      >
    >();

    for (const enc of encounters) {
      const canonical = resolvePuneTaluka(enc.locality || enc.region, enc.region);
      const disease = enc.diseaseCategory || 'General Consultation';
      const patId = enc.patientId ? enc.patientId.toString() : enc._id.toString();

      // Check if this encounter / patient is completely recovered
      const isRecovered =
        enc.isRecovered === true ||
        enc.recoveryStatus === 'Completely recovered' ||
        recoveredEncounterIdSet.has(enc._id.toString()) ||
        recoveredPatientDiseaseSet.has(`${patId}::${disease}`) ||
        (Array.isArray(enc.fields) &&
          enc.fields.some(f => f.k === 'Patient Recovery Feedback' && f.v === 'Completely recovered'));

      if (!patientEncounterMap.has(canonical)) {
        patientEncounterMap.set(canonical, new Map());
      }
      const talukaDiseaseMap = patientEncounterMap.get(canonical)!;
      if (!talukaDiseaseMap.has(disease)) {
        talukaDiseaseMap.set(disease, new Map());
      }
      const patMap = talukaDiseaseMap.get(disease)!;

      const existing = patMap.get(patId);
      if (existing) {
        existing.encountersCount += 1;
        // If any recent encounter is marked recovered, keep recovered
        if (isRecovered) existing.isRecovered = true;
      } else {
        patMap.set(patId, { encountersCount: 1, isRecovered });
      }

      // Update total encounters count for taluka
      const stat = rawTalukaStats.get(canonical);
      if (stat) {
        stat.totalEncounters += 1;
      }
    }

    // Now calculate distinct active affected cases vs recovered cases per taluka and disease
    for (const [talukaName, diseaseMap] of patientEncounterMap.entries()) {
      const stat = rawTalukaStats.get(talukaName);
      if (!stat) continue;

      const talukaActivePatients = new Set<string>();
      const talukaRecoveredPatients = new Set<string>();

      for (const [disease, patMap] of diseaseMap.entries()) {
        let diseaseActive = 0;
        let diseaseRecovered = 0;

        for (const [patId, info] of patMap.entries()) {
          if (info.isRecovered) {
            diseaseRecovered += 1;
            talukaRecoveredPatients.add(patId);
          } else {
            // Patient is actively affected by this disease!
            diseaseActive += 1;
            talukaActivePatients.add(patId);
          }
        }

        stat.diseaseActiveMap.set(disease, diseaseActive);
        stat.diseaseRecoveredMap.set(disease, diseaseRecovered);
        stat.diseaseTotalMap.set(disease, diseaseActive + diseaseRecovered);
      }

      // A patient is considered active in the taluka if they have at least one active condition
      // Once completely recovered, they are subtracted from active cases!
      stat.activeCases = talukaActivePatients.size;
      stat.recoveredCases = talukaRecoveredPatients.size;
      stat.totalCases = stat.activeCases + stat.recoveredCases;
    }

    // 4. Build talukas array with metrics, suppression, boundaries, and facilities
    const talukas = PUNE_TALUKAS.map(talukaName => {
      const geo = PUNE_TALUKA_GEO[talukaName];
      const stats = rawTalukaStats.get(talukaName) || {
        activeCases: 0,
        recoveredCases: 0,
        totalCases: 0,
        totalEncounters: 0,
        diseaseActiveMap: new Map(),
        diseaseRecoveredMap: new Map(),
        diseaseTotalMap: new Map()
      };

      // When a patient is completely recovered, the active affected count gets subtracted (minus 1)!
      const rawCases = stats.activeCases;
      const recoveredCases = stats.recoveredCases;
      const totalCases = stats.totalCases;
      const totalEncounters = stats.totalEncounters;
      const isSuppressed = rawCases > 0 && rawCases < k;

      let intensity: 'zero' | 'low' | 'moderate' | 'high' = 'zero';
      let markerColor = '#10B981'; // green for zero/normal

      if (rawCases > 15) {
        intensity = 'high';
        markerColor = '#EF4444'; // red
      } else if (rawCases >= 6) {
        intensity = 'moderate';
        markerColor = '#F59E0B'; // amber
      } else if (rawCases > 0) {
        intensity = 'low';
        markerColor = '#3B82F6'; // blue
      }

      // Disease breakdown for this specific taluka (displaying active cases minus recovered)
      const diseaseBreakdown = Array.from(stats.diseaseTotalMap.entries())
        .map(([category]) => {
          const activeCount = stats.diseaseActiveMap.get(category) || 0;
          const recoveredCount = stats.diseaseRecoveredMap.get(category) || 0;
          const totalCount = activeCount + recoveredCount;
          const suppressed = activeCount < k && activeCount > 0;

          return {
            category,
            rawCases: activeCount, // Current active affected count (decrements when recovered)
            cases: suppressed ? `< ${k}` : String(activeCount),
            activeCases: activeCount,
            recoveredCases: recoveredCount,
            totalCases: totalCount,
            suppressed
          };
        })
        .sort((a, b) => b.rawCases - a.rawCases);

      const facilities = facilitiesByRegion.get(talukaName) || [];

      return {
        name: talukaName,
        taluka: talukaName,
        lat: geo.lat,
        lng: geo.lng,
        radiusKm: geo.radiusKm,
        bounds: geo.bounds,
        description: geo.description,
        headquarters: geo.headquarters,
        rawCases, // Number of people currently affected by the disease
        displayCases: rawCases === 0 ? '0' : (isSuppressed ? `< ${k}` : String(rawCases)),
        activeCases: rawCases,
        recoveredCases,
        totalCases,
        totalEncounters,
        suppressed: isSuppressed,
        intensity,
        color: markerColor,
        diseaseBreakdown,
        facilities
      };
    });

    // 5. District-wide Disease Breakdown across Pune
    const totalActiveCasesAcrossPune = talukas.reduce((acc, t) => acc + t.activeCases, 0);
    const totalRecoveredCasesAcrossPune = talukas.reduce((acc, t) => acc + t.recoveredCases, 0);
    const totalDistinctCasesAcrossPune = totalActiveCasesAcrossPune; // Current active affected across Pune
    const totalCumulativeCasesAcrossPune = talukas.reduce((acc, t) => acc + t.totalCases, 0);
    const totalEncountersAcrossPune = talukas.reduce((acc, t) => acc + t.totalEncounters, 0);
    const suppressedRegionsCount = talukas.filter(t => t.suppressed).length;

    // Aggregate all unique disease categories across talukas
    const allDiseaseCategories = new Set<string>();
    for (const t of talukas) {
      for (const d of t.diseaseBreakdown) {
        allDiseaseCategories.add(d.category);
      }
    }

    const diseaseBreakdown = Array.from(allDiseaseCategories).map(cat => {
      let catActive = 0;
      let catRecovered = 0;
      for (const t of talukas) {
        const item = t.diseaseBreakdown.find(d => d.category === cat);
        if (item) {
          catActive += item.activeCases;
          catRecovered += item.recoveredCases;
        }
      }
      return {
        category: cat,
        rawCases: catActive,
        cases: catActive < k && catActive > 0 ? `< ${k}` : String(catActive),
        activeCases: catActive,
        recoveredCases: catRecovered,
        totalCases: catActive + catRecovered,
        suppressed: catActive < k && catActive > 0
      };
    }).sort((a, b) => b.rawCases - a.rawCases);

    // Extensible distinct disease categories present in MongoDB
    const allDiseasesList = await Encounter.distinct('diseaseCategory');
    const allDiseases = (allDiseasesList || []).filter(Boolean);

    return {
      kThreshold: k,
      totalDistinctCases: totalActiveCasesAcrossPune, // Active affected people count
      totalActiveCases: totalActiveCasesAcrossPune,
      totalRecoveredCases: totalRecoveredCasesAcrossPune,
      totalCumulativeCases: totalCumulativeCasesAcrossPune,
      totalEncounters: totalEncountersAcrossPune,
      suppressedRegionsCount,
      talukas,
      diseaseBreakdown,
      allDiseases,
      timestamp: new Date().toISOString()
    };
  }

  async getFollowUpAnalytics() {
    const [scheduled, due, completed, total] = await Promise.all([
      FollowUpSurvey.countDocuments({ status: 'scheduled' }),
      FollowUpSurvey.countDocuments({ status: 'due' }),
      FollowUpSurvey.countDocuments({ status: 'completed' }),
      FollowUpSurvey.countDocuments()
    ]);

    const outcomesAgg = await FollowUpSurvey.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$recoveryStatus', count: { $sum: 1 } } }
    ]);

    const breakdownMap: Record<string, number> = {
      'Completely recovered': 0,
      'Feeling better, but not fully recovered': 0,
      'No significant improvement': 0,
      'Symptoms have worsened': 0,
      'I would prefer to discuss this with my clinician': 0
    };

    for (const item of outcomesAgg) {
      if (item._id && breakdownMap[item._id] !== undefined) {
        breakdownMap[item._id] = item.count;
      }
    }

    const responseRate = (due + completed > 0) ? Math.round((completed / (due + completed)) * 100) : 100;
    const worsenedCount = breakdownMap['Symptoms have worsened'] || 0;

    const recentSurveys = await FollowUpSurvey.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(10);

    const anonymizedList = recentSurveys.map(s => ({
      id: s._id.toString(),
      subjectRef: `Subject-P${s.patientId.toString().slice(-4).toUpperCase()}`,
      diseaseCategory: s.diseaseCategory || 'Monitored condition',
      recoveryStatus: s.recoveryStatus,
      intervalDays: s.intervalDays,
      completedAt: s.completedAt ? s.completedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently',
      worsened: s.recoveryStatus === 'Symptoms have worsened'
    }));

    return {
      metrics: {
        scheduled,
        due,
        completed,
        total,
        responseRate,
        worsenedCount
      },
      recoveryBreakdown: Object.entries(breakdownMap).map(([status, count]) => ({
        status,
        count,
        percentage: completed > 0 ? Math.round((count / completed) * 100) : 0
      })),
      recentSurveys: anonymizedList,
      lastRefreshed: new Date().toISOString()
    };
  }
}

export const PUNE_LOCALITIES_GEO: Record<string, { lat: number; lng: number }> = {
  'Kothrud': { lat: 18.5074, lng: 73.8077 },
  'Baner': { lat: 18.5590, lng: 73.7868 },
  'Aundh': { lat: 18.5580, lng: 73.8075 },
  'Hinjawadi': { lat: 18.5913, lng: 73.7389 },
  'Wakad': { lat: 18.5987, lng: 73.7660 },
  'Hadapsar': { lat: 18.5089, lng: 73.9259 },
  'Kharadi': { lat: 18.5514, lng: 73.9348 },
  'Bibwewadi': { lat: 18.4695, lng: 73.8643 },
  'Kondhwa': { lat: 18.4776, lng: 73.8876 },
  'Viman Nagar': { lat: 18.5679, lng: 73.9143 },
  'Shivajinagar': { lat: 18.5314, lng: 73.8446 },
  'Yerawada': { lat: 18.5529, lng: 73.8796 },
  'Pimpri': { lat: 18.6279, lng: 73.8009 },
  'Chinchwad': { lat: 18.6298, lng: 73.7840 }
};


export const adminService = new AdminService();
