/* ============================================================
   HackMatrix — Healthcare Platform Application Logic
   Patient, Clinician, and Public Health Administration System.
   Connected to authoritative REST backend and live database.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- tiny DOM + string helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function byId(id) { return document.getElementById(id); }

  /* ---------------- icon set (single outlined family) ---------------- */
  var PATHS = {
    home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.6V21h14V9.6"/>',
    records: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/>',
    shieldCheck: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.2 8-6.2s8 2.2 8 6.2"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.3-3.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M3 12h18"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.5 3-5.6 6.2-5.6s6.2 2.1 6.2 5.6"/><path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.8"/><path d="M18 20c0-2.4-.9-3.9-2.4-4.7"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="M9 11h6M9 15h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4.4 4.4L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2.6 20h18.8z"/><path d="M12 9v5M12 17.4h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M16 12H9"/><path d="m13 8 4 4-4 4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    download: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-1.6 5.5"/><path d="M20 5v6h-6"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    pin: '<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h7M17 18h3"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    branch: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="9" r="2.4"/><path d="M6 8.4v7.2"/><path d="M18 11.4c0 3.6-3.2 6.6-9 6.6"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    trendUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
    trendDown: '<path d="m3 7 6 6 4-4 8 8"/><path d="M17 17h4v-4"/>',
    minus: '<path d="M5 12h14"/>',
    heart: '<path d="M12 20s-7-4.4-9.4-8.8A5 5 0 0 1 12 6.4a5 5 0 0 1 9.4 4.8C19 15.6 12 20 12 20z"/>',
    pill: '<rect x="3.2" y="8.4" width="17.6" height="7.2" rx="3.6" transform="rotate(-45 12 12)"/><path d="M8.6 8.6l6.8 6.8"/>',
    flask: '<path d="M9 3h6M10 3v6l-4.6 8.4A1.6 1.6 0 0 0 6.8 20h10.4a1.6 1.6 0 0 0 1.4-2.6L14 9V3"/><path d="M7.4 14h9.2"/>',
    therm: '<path d="M14 14.6V5a2 2 0 1 0-4 0v9.6a4 4 0 1 0 4 0z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    key: '<circle cx="8" cy="8" r="4"/><path d="m11 11 9 9"/><path d="m16 16-2 2M19 19l-2 2"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 12 12"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
    phone: '<path d="M5 4h4l2 5-3 1.8a12 12 0 0 0 5.2 5.2L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    droplet: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>'
  };
  function icon(name, size, cls) {
    size = size || 18;
    return '<svg class="' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (PATHS[name] || '') + '</svg>';
  }

  /* ---------------- demo data ---------------- */
  function series(n, base, amp, phase) {
    var a = [], i, v;
    for (i = 0; i < n; i++) {
      v = base + amp * Math.sin((i + phase) / 3.2) + amp * 0.35 * Math.sin((i + phase) / 1.25);
      a.push(Math.max(0, Math.round(v)));
    }
    return a;
  }
  function dayLabels(n) {
    var out = [], d = new Date(2026, 9, 10), i, dd;
    for (i = n - 1; i >= 0; i--) { dd = new Date(d); dd.setDate(d.getDate() - i); out.push((dd.getMonth() + 1) + '/' + dd.getDate()); }
    return out;
  }

  var DATA = {
    patient: {
      name: 'Ananya Sharma', id: 'HMX-P-20481', dob: '14 Mar 1991', age: 34,
      bloodGroup: 'O+', sex: 'Female', phone: '+91 ••••• •4321', abha: '••••-••••-4821',
      allergies: ['Penicillin'], facility: 'Sunrise Multispecialty Hospital'
    },
    vitals: [
      { label: 'Blood pressure', value: '118/76', unit: 'mmHg', time: '12 Sep' },
      { label: 'Heart rate', value: '72', unit: 'bpm', time: '12 Sep' },
      { label: 'BMI', value: '22.4', unit: 'kg/m²', time: '12 Sep' }
    ],
    categories: [
      { id: 'encounters', label: 'Encounters', icon: 'activity' },
      { id: 'observations', label: 'Observations', icon: 'therm' },
      { id: 'medications', label: 'Medications', icon: 'pill' },
      { id: 'allergies', label: 'Allergies', icon: 'alertCircle' },
      { id: 'reports', label: 'Reports', icon: 'file' },
      { id: 'immunizations', label: 'Immunizations', icon: 'shieldCheck' },
      { id: 'careplans', label: 'Care plans', icon: 'clipboard' }
    ],
    records: [
      { id: 'r1', cat: 'encounters', type: 'Emergency encounter', date: '12 Sep 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Dr. Rohit Verma', summary: 'Acute allergic reaction; stabilized, observed and discharged with advice.', status: 'Completed', updated: '12 Sep 2026, 18:40', fields: [ { k: 'Encounter type', v: 'Emergency (OPD)' }, { k: 'Disposition', v: 'Discharged home' }, { k: 'Follow-up', v: 'Review in 7 days' } ] },
      { id: 'r2', cat: 'observations', type: 'Vital signs panel', date: '12 Sep 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Nurse station', summary: 'BP 118/76 mmHg, HR 72 bpm, SpO₂ 98%, Temp 36.9 °C.', status: 'Final', updated: '12 Sep 2026, 17:05', fields: [ { k: 'Blood pressure', v: '118/76 mmHg' }, { k: 'Heart rate', v: '72 bpm' }, { k: 'SpO₂', v: '98%' }, { k: 'Temperature', v: '36.9 °C' } ] },
      { id: 'r3', cat: 'medications', type: 'Active medication', date: '02 Aug 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Dr. Neha Kapoor', summary: 'Amlodipine 5 mg once daily for hypertension.', status: 'Active', updated: '02 Aug 2026, 10:12', fields: [ { k: 'Drug', v: 'Amlodipine' }, { k: 'Dose', v: '5 mg' }, { k: 'Frequency', v: 'Once daily' }, { k: 'Route', v: 'Oral' } ] },
      { id: 'r4', cat: 'allergies', type: 'Allergy', date: '18 Jan 2019', facility: 'City Medical Centre', clinician: 'Dr. S. Iyer', summary: 'Penicillin — rash and swelling. Recorded as a high-severity allergy.', status: 'Active', updated: '18 Jan 2019', fields: [ { k: 'Substance', v: 'Penicillin' }, { k: 'Reaction', v: 'Urticaria, angioedema' }, { k: 'Severity', v: 'High' } ] },
      { id: 'r5', cat: 'reports', type: 'Laboratory report', date: '12 Sep 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Dr. Rohit Verma', summary: 'Complete blood count within reference ranges; mild eosinophilia.', status: 'Final', updated: '12 Sep 2026, 20:02', fields: [ { k: 'Panel', v: 'Complete blood count' }, { k: 'Result', v: 'Within range' }, { k: 'Note', v: 'Mild eosinophilia' } ] },
      { id: 'r6', cat: 'immunizations', type: 'Immunization', date: '04 Mar 2025', facility: 'Community Health Centre', clinician: 'Vaccination desk', summary: 'Tetanus–diphtheria booster administered.', status: 'Completed', updated: '04 Mar 2025', fields: [ { k: 'Vaccine', v: 'Td booster' }, { k: 'Dose', v: 'Booster' }, { k: 'Site', v: 'Left deltoid' } ] },
      { id: 'r7', cat: 'careplans', type: 'Care plan', date: '02 Aug 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Dr. Neha Kapoor', summary: 'Hypertension management plan: lifestyle, monitoring and review.', status: 'Active', updated: '02 Aug 2026', fields: [ { k: 'Goal', v: 'Maintain BP < 130/80' }, { k: 'Review', v: 'Every 3 months' }, { k: 'Owner', v: 'Primary care' } ] },
      { id: 'r8', cat: 'observations', type: 'Body measurement', date: '02 Aug 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Nurse station', summary: 'Weight 61 kg, height 165 cm, BMI 22.4 kg/m².', status: 'Final', updated: '02 Aug 2026', fields: [ { k: 'Weight', v: '61 kg' }, { k: 'Height', v: '165 cm' }, { k: 'BMI', v: '22.4 kg/m²' } ] },
      { id: 'r9', cat: 'reports', type: 'Imaging report', date: '20 Jun 2026', facility: 'City Medical Centre', clinician: 'Dr. A. Rao', summary: 'Chest radiograph — no acute abnormality.', status: 'Final', updated: '20 Jun 2026', fields: [ { k: 'Modality', v: 'X-ray, chest' }, { k: 'Impression', v: 'No acute abnormality' } ] },
      { id: 'r10', cat: 'encounters', type: 'Outpatient consultation', date: '02 Aug 2026', facility: 'Sunrise Multispecialty Hospital', clinician: 'Dr. Neha Kapoor', summary: 'Routine hypertension review; medication continued.', status: 'Completed', updated: '02 Aug 2026', fields: [ { k: 'Encounter type', v: 'OPD follow-up' }, { k: 'Plan', v: 'Continue current therapy' } ] }
    ],
    grants: [
      { id: 'g1', recipient: 'Dr. Rohit Verma', role: 'Emergency physician', org: 'Sunrise Multispecialty Hospital', scope: ['Encounters', 'Observations', 'Allergies', 'Medications'], purpose: 'Emergency treatment', start: '12 Sep 2026, 16:20', expires: '19 Sep 2026, 16:20', status: 'active' },
      { id: 'g2', recipient: 'Dr. Neha Kapoor', role: 'Primary care physician', org: 'Sunrise Multispecialty Hospital', scope: ['Encounters', 'Medications', 'Care plans'], purpose: 'Ongoing care management', start: '02 Aug 2026, 10:00', expires: '02 Feb 2027, 10:00', status: 'active' },
      { id: 'g3', recipient: 'City Diagnostics', role: 'Laboratory (organization)', org: 'City Diagnostics Lab', scope: ['Reports'], purpose: 'Laboratory testing', start: 'Requested 08 Oct 2026', expires: 'Pending approval', status: 'pending' },
      { id: 'g4', recipient: 'Dr. S. Iyer', role: 'Dermatologist', org: 'City Medical Centre', scope: ['Encounters', 'Allergies'], purpose: 'Allergy consultation', start: '02 Mar 2026, 09:00', expires: '02 Apr 2026, 09:00', status: 'expired' },
      { id: 'g5', recipient: 'Wellness Physio', role: 'Physiotherapy (organization)', org: 'Wellness Physio Clinic', scope: ['Encounters'], purpose: 'Physiotherapy assessment', start: '10 Jul 2026, 11:00', expires: 'Revoked 14 Jul 2026, 15:30', status: 'revoked' }
    ],
    accessEvents: [
      { id: 'a1', ts: '12 Sep 2026, 16:24', actor: 'Dr. Rohit Verma', org: 'Sunrise Multispecialty Hospital', action: 'Viewed records', resource: 'Allergies, Observations', outcome: 'granted' },
      { id: 'a2', ts: '12 Sep 2026, 16:22', actor: 'Emergency desk', org: 'Sunrise Multispecialty Hospital', action: 'QR identity check', resource: 'Patient identity', outcome: 'granted' },
      { id: 'a3', ts: '08 Oct 2026, 09:10', actor: 'City Diagnostics', org: 'City Diagnostics Lab', action: 'Requested access', resource: 'Reports', outcome: 'pending' },
      { id: 'a4', ts: '14 Jul 2026, 15:30', actor: 'You', org: '—', action: 'Revoked access grant', resource: 'Wellness Physio', outcome: 'revoked' },
      { id: 'a5', ts: '14 Jul 2026, 15:06', actor: 'Wellness Physio', org: 'Wellness Physio Clinic', action: 'Attempted record access', resource: 'Encounters', outcome: 'denied' },
      { id: 'a6', ts: '02 Apr 2026, 09:00', actor: 'System', org: '—', action: 'Access grant expired', resource: 'Dr. S. Iyer', outcome: 'expired' },
      { id: 'a7', ts: '20 Jun 2026, 12:41', actor: 'Dr. A. Rao', org: 'City Medical Centre', action: 'Viewed report', resource: 'Imaging report', outcome: 'granted' }
    ],
    clinician: { name: 'Dr. Rohit Verma', id: 'HMX-C-7781', role: 'CLINICIAN', org: 'Sunrise Multispecialty Hospital', dept: 'Emergency Medicine', access: 'Verified organization access' },
    clinicianPatient: {
      name: 'Meera Nair', id: 'HMX-P-31877', age: 47, sex: 'Female', bloodGroup: 'B+',
      allergies: ['Sulfa drugs'], facility: 'Sunrise Multispecialty Hospital',
      grantRef: 'g-2f9c', consent: 'Emergency access grant — active', scope: ['Encounters', 'Observations', 'Allergies', 'Medications'],
      expires: '13 Sep 2026, 16:20'
    },
    clinicianActivity: [
      { id: 'ca1', ts: '12 Sep 2026, 16:24', patient: 'HMX-P-20481', action: 'Viewed records', activity: 'grant', outcome: 'granted' },
      { id: 'ca2', ts: '12 Sep 2026, 15:58', patient: 'HMX-P-28110', action: 'QR identification', activity: 'QR access', outcome: 'granted' },
      { id: 'ca3', ts: '12 Sep 2026, 14:31', patient: 'HMX-P-45520', action: 'Record access attempt', activity: 'No active consent', outcome: 'denied' },
      { id: 'ca4', ts: '11 Sep 2026, 21:12', patient: 'HMX-P-20481', action: 'View grant expired', activity: 'grant', outcome: 'expired' }
    ],
    clinicianRequests: [
      { id: 'cr1', patient: 'HMX-P-31877', scope: 'Encounters, Allergies', purpose: 'Emergency treatment', state: 'Approved by patient', expires: '13 Sep 2026, 16:20' },
      { id: 'cr2', patient: 'HMX-P-45520', scope: 'Reports', purpose: 'Second opinion', state: 'Awaiting patient approval', expires: '—' }
    ],
    admin: {
      k: 5,
      refreshed: '10 Oct 2026, 06:15 IST',
      metrics: [
        { label: 'Aggregate observations', value: '184,320', delta: '+3.1%', dir: 'up', hint: 'vs previous 7 days' },
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
        ili: series(30, 320, 90, 2),
        dengue: series(30, 120, 70, 8),
        add: series(30, 180, 55, 15)
      },
      forecast: series(14, 300, 80, 20),
      regions: [
        { name: 'North Region', cases: 1284, facilities: 46, completeness: 97 },
        { name: 'South Region', cases: 968, facilities: 52, completeness: 95 },
        { name: 'East Region', cases: 741, facilities: 38, completeness: 92 },
        { name: 'West Region', cases: 611, facilities: 41, completeness: 96 },
        { name: 'Central Region', cases: 233, facilities: 35, completeness: 89 }
      ],
      facilities: [
        { name: 'Sunrise Multispecialty Hospital', region: 'North', period: 'Wk 40', volume: 4820, freshness: '2 h', completeness: 98, quality: 'Good' },
        { name: 'City Medical Centre', region: 'North', period: 'Wk 40', volume: 3910, freshness: '4 h', completeness: 96, quality: 'Good' },
        { name: 'Riverside Community Hospital', region: 'South', period: 'Wk 40', volume: 2740, freshness: '6 h', completeness: 93, quality: 'Fair' },
        { name: 'Greenfield Clinic', region: 'South', period: 'Wk 40', volume: 810, freshness: '26 h', completeness: 82, quality: 'Delayed' },
        { name: 'Eastgate General', region: 'East', period: 'Wk 40', volume: 1980, freshness: '3 h', completeness: 95, quality: 'Good' },
        { name: 'Hillview Health Post', region: 'East', period: 'Wk 40', volume: 240, freshness: '31 h', completeness: 78, quality: 'Delayed' },
        { name: 'Westend Diagnostics', region: 'West', period: 'Wk 40', volume: 1560, freshness: '5 h', completeness: 94, quality: 'Good' },
        { name: 'Central Polyclinic', region: 'Central', period: 'Wk 40', volume: 430, freshness: '9 h', completeness: 90, quality: 'Fair' }
      ],
      audit: [
        { id: 'au1', ts: '10 Oct 2026, 06:15', actor: 'pipeline-service', role: 'System', org: '—', action: 'Aggregate refresh completed', resource: 'Analytics store', outcome: 'success' },
        { id: 'au2', ts: '10 Oct 2026, 05:40', actor: 'Dr. Neha Kapoor', role: 'Clinician', org: 'Sunrise Multispecialty Hospital', action: 'Viewed patient records', resource: 'Encounter', outcome: 'success' },
        { id: 'au3', ts: '10 Oct 2026, 04:12', actor: 'admin.rao', role: 'Admin', org: 'HQ', action: 'Exported aggregate report', resource: 'Surveillance dataset', outcome: 'success' },
        { id: 'au4', ts: '09 Oct 2026, 22:03', actor: 'unknown', role: '—', org: '—', action: 'Record access attempt', resource: 'Patient record', outcome: 'denied' },
        { id: 'au5', ts: '09 Oct 2026, 19:47', actor: 'admin.rao', role: 'Admin', org: 'HQ', action: 'Changed suppression threshold', resource: 'Privacy config', outcome: 'success' },
        { id: 'au6', ts: '09 Oct 2026, 16:20', actor: 'Dr. Rohit Verma', role: 'Clinician', org: 'Sunrise Multispecialty Hospital', action: 'Emergency access', resource: 'Patient record', outcome: 'success' },
        { id: 'au7', ts: '09 Oct 2026, 11:02', actor: 'facility.bot', role: 'System', org: 'Eastgate General', action: 'Data submission rejected', resource: 'Ingest', outcome: 'failure' }
      ],
      orgs: [
        { id: 'o1', name: 'Sunrise Multispecialty Hospital', type: 'Hospital', region: 'North', users: 48, status: 'Active' },
        { id: 'o2', name: 'City Medical Centre', type: 'Hospital', region: 'North', users: 31, status: 'Active' },
        { id: 'o3', name: 'Riverside Community Hospital', type: 'Clinic', region: 'South', users: 19, status: 'Active' },
        { id: 'o4', name: 'Greenfield Clinic', type: 'Clinic', region: 'South', users: 7, status: 'Limited' },
        { id: 'o5', name: 'Eastgate General', type: 'Hospital', region: 'East', users: 26, status: 'Active' }
      ],
      users: [
        { id: 'u1', name: 'admin.rao', role: 'ADMIN', org: 'HQ', status: 'Active' },
        { id: 'u2', name: 'Dr. Neha Kapoor', role: 'CLINICIAN', org: 'Sunrise Multispecialty Hospital', status: 'Active' },
        { id: 'u3', name: 'Dr. Rohit Verma', role: 'CLINICIAN', org: 'Sunrise Multispecialty Hospital', status: 'Active' },
        { id: 'u4', name: 'Ananya Sharma', role: 'PATIENT', org: '—', status: 'Active' },
        { id: 'u5', name: 'ops.eastgate', role: 'CLINICIAN', org: 'Eastgate General', status: 'Suspended' }
      ],
      status: [
        { name: 'API gateway', state: 'operational', detail: 'Response 84 ms median' },
        { name: 'Database (MongoDB Atlas)', state: 'operational', detail: 'Primary + 2 replicas' },
        { name: 'Aggregate refresh (ETL)', state: 'operational', detail: 'Last run 10 Oct 06:15 IST' },
        { name: 'Change-stream watcher', state: 'degraded', detail: 'Consumer lag 42 s' },
        { name: 'Socket.IO gateway', state: 'operational', detail: '1,284 subscribers' }
      ]
    }
  };

  /* ---------------- small UI builders ---------------- */
  var STATUS_LABEL = {
    active: ['is-success', 'Active'], pending: ['is-warning', 'Pending'], expired: ['is-neutral', 'Expired'],
    revoked: ['is-error', 'Revoked'], granted: ['is-success', 'Granted'], denied: ['is-error', 'Denied'],
    success: ['is-success', 'Success'], failure: ['is-error', 'Failure'], Completed: ['is-success', 'Completed'],
    Final: ['is-success', 'Final'], Approved: ['is-success', 'Approved'], Active: ['is-success', 'Active'],
    Suspended: ['is-error', 'Suspended'], Limited: ['is-warning', 'Limited'], Good: ['is-success', 'Good'],
    Fair: ['is-warning', 'Fair'], Delayed: ['is-warning', 'Delayed'],
    operational: ['is-success', 'Operational'], degraded: ['is-warning', 'Degraded']
  };
  function badge(status) {
    var m = STATUS_LABEL[status] || ['is-neutral', status];
    return '<span class="hm-badge ' + m[0] + '"><span class="hm-badge__dot"></span>' + esc(m[1]) + '</span>';
  }
  function demo(txt) { return '<span class="hm-badge is-success" title="Live Database Active">' + icon('shieldCheck', 12) + (txt || 'Verified Records') + '</span>'; }

  function overviewOf(procedure, patient) {
    return '<div class="hm-notice is-info" role="note">' + icon('shieldCheck', 18) +
      '<div><p class="hm-notice__title">Secure Clinical Session</p><p>' + esc(procedure) +
      ' Connected to live healthcare database for ' + esc(patient) + '.</p></div></div>';
  }

  /* ---------------- charts ---------------- */
  function lineChart(o) {
    var w = 680, h = 240, pad = { l: 46, r: 14, t: 14, b: 36 };
    var labels = o.labels, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, max = 0, i;
    o.series.forEach(function (s) { s.data.forEach(function (v) { if (v != null && v > max) max = v; }); });
    max = max || 10; max = Math.ceil(max / 50) * 50;
    function X(n) { return pad.l + (labels.length <= 1 ? 0 : n * (iw / (labels.length - 1))); }
    function Y(v) { return pad.t + ih - (v / max) * ih; }
    var grid = '', g, y, val, stepLbl = Math.ceil(labels.length / 7), xlab = '', path = '';
    for (g = 0; g <= 4; g++) {
      y = pad.t + (ih / 4) * g; val = Math.round(max * (1 - g / 4));
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="#E2E8F0" stroke-width="1"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#94A3B8">' + val + '</text>';
    }
    labels.forEach(function (lb, n) {
      if (n % stepLbl === 0 || n === labels.length - 1) xlab += '<text x="' + X(n).toFixed(1) + '" y="' + (h - 12) + '" text-anchor="middle" font-size="11" fill="#94A3B8">' + esc(lb) + '</text>';
    });
    o.series.forEach(function (s) {
      var d = '', pen = false;
      s.data.forEach(function (v, n) {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + X(n).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
        pen = true;
      });
      path += '<path d="' + d.trim() + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' + (s.dashed ? ' stroke-dasharray="6 5"' : '') + '/>';
      s.data.forEach(function (v, n) {
        if (v == null) return;
        path += '<circle cx="' + X(n).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.6" fill="' + s.color + '"><title>' + esc(s.name) + ' — ' + esc(labels[n]) + ': ' + v + ' ' + esc(o.unit || '') + '</title></circle>';
      });
    });
    var legend = o.series.map(function (s) {
      return '<span>' + (s.dashed ? '<i class="hm-legend-dash"></i>' : '<i style="background:' + s.color + '"></i>') + esc(s.name) + '</span>';
    }).join('');
    var rows = labels.map(function (lb, n) {
      var cells = o.series.map(function (s) { return '<td class="num">' + (s.data[n] == null ? '—' : s.data[n]) + '</td>'; }).join('');
      return '<tr><td>' + esc(lb) + '</td>' + cells + '</tr>';
    }).join('');
    var head = o.series.map(function (s) { return '<th class="num">' + esc(s.name) + '</th>'; }).join('');
    return '<figure class="hm-chart__fig">' +
      '<div class="hm-chart" role="img" aria-label="' + esc(o.aria || o.title || 'Trend chart') + '">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + xlab + path + '</svg></div>' +
      '<div class="hm-chart__legend">' + legend + '</div>' +
      '<figcaption>' + esc(o.caption || ('Unit: ' + (o.unit || 'count') + ' · Period: ' + (o.period || 'last 30 days'))) + '</figcaption>' +
      '<details class="hm-collapse" style="margin-top:10px"><summary>View data as a table' + icon('chevD', 16) + '</summary>' +
      '<div class="hm-collapse__body"><div class="hm-table-wrap"><table class="hm-table"><thead><tr><th>Date</th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div></div></details>' +
      '</figure>';
  }

  function barChart(o) {
    var w = 680, h = 240, pad = { l: 46, r: 14, t: 14, b: 48 };
    var labels = o.labels, data = o.data, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, max = 0, i;
    data.forEach(function (v) { if (v > max) max = v; }); max = max || 10;
    var bw = iw / data.length * 0.6, gap = iw / data.length;
    var bars = '', xlab = '', grid = '', g, y, val;
    for (g = 0; g <= 4; g++) {
      y = pad.t + (ih / 4) * g; val = Math.round(max * (1 - g / 4));
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="#E2E8F0" stroke-width="1"/>' +
        '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#94A3B8">' + val + '</text>';
    }
    data.forEach(function (v, n) {
      var bh = (v / max) * ih, x = pad.l + gap * n + (gap - bw) / 2, yb = pad.t + ih - bh;
      bars += '<rect x="' + x.toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="4" fill="' + (o.color || '#0F766E') + '"><title>' + esc(labels[n]) + ': ' + v + ' ' + esc(o.unit || '') + '</title></rect>';
      xlab += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 26) + '" text-anchor="middle" font-size="11" fill="#64748B">' + esc(labels[n]) + '</text>';
    });
    var rows = labels.map(function (lb, n) { return '<tr><td>' + esc(lb) + '</td><td class="num">' + data[n] + '</td></tr>'; }).join('');
    return '<figure class="hm-chart__fig"><div class="hm-chart" role="img" aria-label="' + esc(o.aria || o.title || 'Bar chart') + '">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + grid + bars + xlab + '</svg></div>' +
      '<figcaption>' + esc(o.caption || ('Unit: ' + (o.unit || 'count'))) + '</figcaption>' +
      '<details class="hm-collapse" style="margin-top:10px"><summary>View data as a table' + icon('chevD', 16) + '</summary>' +
      '<div class="hm-collapse__body"><div class="hm-table-wrap"><table class="hm-table"><thead><tr><th>Category</th><th class="num">Value</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></details></figure>';
  }

  function sparkline(data, color) {
    var w = 120, h = 34, max = Math.max.apply(null, data), min = Math.min.apply(null, data), span = (max - min) || 1, d = '';
    data.forEach(function (v, n) { d += (n ? 'L' : 'M') + (n * (w / (data.length - 1))).toFixed(1) + ' ' + (h - ((v - min) / span) * (h - 6) - 3).toFixed(1) + ' '; });
    return '<svg class="hm-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  /* ---------------- QR (labeled demo pattern) ---------------- */
  function demoQR(seed) {
    var n = 29, g = 8, s = 7, cells = '', r, c;
    var h = 0, i; for (i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    function finder(ox, oy) {
      var out = '';
      out += '<rect x="' + (ox * s) + '" y="' + (oy * s) + '" width="' + (7 * s) + '" height="' + (7 * s) + '" rx="3" fill="#172B3A"/>';
      out += '<rect x="' + ((ox + 1) * s) + '" y="' + ((oy + 1) * s) + '" width="' + (5 * s) + '" height="' + (5 * s) + '" fill="#fff"/>';
      out += '<rect x="' + ((ox + 2) * s) + '" y="' + ((oy + 2) * s) + '" width="' + (3 * s) + '" height="' + (3 * s) + '" fill="#172B3A"/>';
      return out;
    }
    for (r = 0; r < n; r++) {
      for (c = 0; c < n; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9)) continue;
        h = (h * 1103515245 + 12345) >>> 0;
        if ((h >>> 16) & 1) cells += '<rect x="' + (c * s + g) + '" y="' + (r * s + g) + '" width="' + s + '" height="' + s + '" fill="#172B3A"/>';
      }
    }
    var total = n * s + g * 2;
    return '<svg viewBox="0 0 ' + total + ' ' + total + '" role="img" aria-label="Demo QR code placeholder">' +
      finder(0, 0).replace(/(\d+)/g, function (m) { return m; }) + finder(n - 7, 0) + finder(0, n - 7) +
      cells + '</svg>';
  }

  /* ---------------- router + state ---------------- */
  var state = {
    ws: 'welcome',
    accessTab: 'active',
    recordsCat: 'all',
    recordsQuery: '',
    grantStep: 1,
    qrToken: 'HMX-QR-DEMO-7F3A91',
    qrCreated: Date.now(),
    scanState: 'idle',
    period: 30,
    disease: 'ili',
    adminQuery: '',
    adminSort: { key: 'name', dir: 1 },
    adminPage: 1,
    adminRegion: 'all',
    threshold: 5,
    collapsed: false,
    theme: 'teal'
  };

  var THEMES = ['teal', 'indigo', 'berry', 'forest', 'graphite'];

  function applyTheme(name) {
    if (THEMES.indexOf(name) < 0) name = 'teal';
    state.theme = name;
    document.documentElement.setAttribute('data-theme', name);
    Array.prototype.forEach.call(document.querySelectorAll('.theme-dot'), function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-value') === name));
    });
    try { localStorage.setItem('hmx-theme', name); } catch (e) {}
  }

  function savedTheme() {
    try { var t = localStorage.getItem('hmx-theme'); if (t && THEMES.indexOf(t) >= 0) return t; } catch (e) {}
    return 'teal';
  }

  function parseRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    return { ws: parts[0] || 'welcome', view: parts[1] || '', arg: parts[2] || '' };
  }

  function go(hash) {
    if (location.hash === hash) {
      render();
    } else {
      location.hash = hash;
    }
  }

  /* ---------------- phone views ---------------- */
  function phoneHeader(opts) {
    return '<header class="hm-app-header' + (opts.flat ? ' is-flat' : '') + '">' +
      '<div class="hm-app-header__top">' +
      (opts.back ? '<button class="hm-icon-btn" data-nav="' + esc(opts.back) + '" aria-label="Go back">' + icon('back', 20) + '</button>' :
        '<span class="hm-app-header__brand">' + '<span class="hm-logo__mark" style="width:26px;height:26px;border-radius:8px;background:' + (opts.flat ? 'linear-gradient(150deg,#0F766E,#115E59)' : 'rgba(255,255,255,.2)') + '">' + icon('shieldCheck', 15) + '</span>' + esc(opts.brand || 'HackMatrix') + '</span>') +
      '<span class="hm-app-header__actions">' +
      (opts.bell ? '<button class="hm-icon-btn" data-action="notify" aria-label="Notifications">' + icon('bell', 20) + '</button>' : '') +
      (opts.profile ? '<button class="hm-icon-btn" data-nav="' + esc(opts.profile) + '" aria-label="Profile">' + icon('user', 20) + '</button>' : '') +
      '</span></div>' +
      (opts.title ? '<h1 class="hm-app-header__greet">' + esc(opts.title) + '</h1>' : '') +
      (opts.sub ? '<p class="hm-app-header__sub">' + esc(opts.sub) + '</p>' : '') +
      '</header>';
  }

  function patientHome() {
    var p = DATA.patient;
    var quick = [
      { label: 'My records', hint: '10 records', icon: 'records', to: '#/patient/records' },
      { label: 'Manage consent', hint: '2 active grants', icon: 'shield', to: '#/patient/new-grant' },
      { label: 'Show my QR', hint: 'Valid 4:59', icon: 'qr', to: '#/patient/qr' },
      { label: 'Access history', hint: 'Recent activity', icon: 'clock', to: '#/patient/access' }
    ];
    var acts = DATA.accessEvents.slice(0, 4).map(function (e) {
      var cls = e.outcome === 'denied' ? 'is-error' : e.outcome === 'revoked' || e.outcome === 'expired' ? 'is-warning' : 'is-success';
      return '<li class="hm-row"><span class="hm-row__icon ' + cls + '">' + icon(e.outcome === 'denied' ? 'x' : e.outcome === 'granted' ? 'eye' : 'clock', 18) + '</span>' +
        '<span class="hm-row__body"><span class="hm-row__title">' + esc(e.action) + '</span><span class="hm-row__meta">' + esc(e.actor) + ' · ' + esc(e.ts) + '</span></span><span class="hm-row__end">' + badge(e.outcome) + '</span></li>';
    }).join('');
    var html = phoneHeader({ title: 'Hello, ' + p.name.split(' ')[0], sub: p.facility, bell: true, profile: '#/patient/profile' });
    html += '<div class="hm-app-body has-nav">' +
      overviewOf('Viewing your health summary.', 'your account (patient)') +
      '<section class="hm-card"><div class="hm-card__body">' +
      '<div class="hm-identity"><span class="hm-avatar">' + esc(p.name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span>' +
      '<div><h2 class="hm-identity__name">' + esc(p.name) + '</h2><p class="hm-identity__meta">Patient ID ' + esc(p.id) + '</p></div></div>' +
      '<dl class="hm-kv" style="margin-top:16px">' +
      '<dt>Date of birth</dt><dd>' + esc(p.dob) + ' · ' + p.age + ' yrs</dd>' +
      '<dt>Blood group</dt><dd>' + esc(p.bloodGroup) + '</dd>' +
      '<dt>Known allergies</dt><dd>' + esc(p.allergies.join(', ')) + '</dd>' +
      '<dt>Recent encounter</dt><dd>12 Sep 2026 · Emergency</dd>' +
      '</dl></div></section>' +
      '<section><div class="hm-section__head"><h2 class="hm-section__title">Health overview</h2><div style="display:flex;gap:6px;align-items:center;">' + demo() + '<button class="hm-btn hm-btn--ghost hm-btn--sm" data-action="patient-add-record" style="font-size:12px;font-weight:600">' + icon('plus', 14) + 'Add Reading</button></div></div>' +
      '<div class="hm-vitals">' + DATA.vitals.map(function (v) {
        return '<div class="hm-vital"><div class="hm-vital__value">' + esc(v.value) + ' <small>' + esc(v.unit) + '</small></div><div class="hm-vital__label">' + esc(v.label) + '</div><div class="hm-vital__time">' + esc(v.time) + '</div></div>';
      }).join('') + '</div>' +
      '<p class="hm-help" style="margin-top:10px">Indicators only — no diagnosis or interpretation is shown.</p></section>' +
      '<section><h2 class="hm-section__title">Quick actions</h2><div class="hm-quickgrid">' +
      quick.map(function (q) { return '<button class="hm-quick" data-nav="' + q.to + '"><span class="hm-quick__icon">' + icon(q.icon, 18) + '</span><span class="hm-quick__label">' + esc(q.label) + '</span><span class="hm-quick__hint">' + esc(q.hint) + '</span></button>'; }).join('') +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Recent activity</h2></div><div class="hm-card__body"><ul class="hm-list">' + acts + '</ul></div></section>' +
      '<div class="hm-notice is-brand">' + icon('shieldCheck', 18) + '<div><p class="hm-notice__title">Consent is in your control</p><p>You have ' + DATA.grants.filter(function (g) { return g.status === 'active'; }).length + ' active access grants. Review or revoke them any time in Access.</p></div></div>' +
      '</div>';
    return html;
  }

  function patientRecords() {
    var q = state.recordsQuery.toLowerCase(), cat = state.recordsCat;
    var list = DATA.records.filter(function (r) {
      var okCat = cat === 'all' || r.cat === cat;
      var okQ = !q || (r.type + r.summary + r.facility + r.clinician).toLowerCase().indexOf(q) > -1;
      return okCat && okQ;
    });
    var chips = '<button class="hm-chip" data-action="records-cat" data-value="all" aria-pressed="' + (cat === 'all') + '">All</button>' +
      DATA.categories.map(function (c) {
        var count = DATA.records.filter(function (r) { return r.cat === c.id; }).length;
        if (!count) return '';
        return '<button class="hm-chip" data-action="records-cat" data-value="' + c.id + '" aria-pressed="' + (cat === c.id) + '">' + esc(c.label) + '</button>';
      }).join('');
    var html = phoneHeader({ brand: 'My records', flat: true, back: '#/patient/home', bell: true });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-search">' + icon('search', 18) + '<input class="hm-input" type="search" id="records-search" placeholder="Search records" aria-label="Search records" value="' + esc(state.recordsQuery) + '"></div>' +
      '<div class="od-rail hm-chips" style="display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px" role="group" aria-label="Record categories">' + chips + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 10px"><p class="hm-help" style="margin:0">' + list.length + ' record' + (list.length === 1 ? '' : 's') + ' found · Demo data</p><button class="hm-btn hm-btn--primary hm-btn--sm" data-action="patient-add-record">' + icon('plus', 14) + 'Add Record</button></div>' +
      (list.length ? '<ul class="hm-list" style="padding:0">' + list.map(function (r) {
        var c = DATA.categories.filter(function (x) { return x.id === r.cat; })[0] || {};
        return '<li><button class="hm-row hm-row--btn" data-nav="#/patient/record/' + r.id + '"><span class="hm-row__icon">' + icon(c.icon || 'file', 18) + '</span>' +
          '<span class="hm-row__body"><span class="hm-row__title">' + esc(r.type) + '</span><span class="hm-row__meta">' + esc(r.date) + ' · ' + esc(r.facility) + '</span></span>' +
          '<span class="hm-row__end">' + icon('chevR', 18) + '</span></button></li>';
      }).join('') + '</ul>' :
        '<div class="hm-empty">' + '<span class="hm-empty__icon">' + icon('search', 26) + '</span><h3 class="hm-empty__title">No records match</h3><p class="hm-empty__text">Try a different category or clear your search.</p><button class="hm-btn hm-btn--secondary" data-action="records-clear">Clear filters</button></div>') +
      '</div>';
    return html;
  }

  function patientRecord(id) {
    var r = DATA.records.filter(function (x) { return x.id === id; })[0];
    if (!r) return patientRecords();
    var c = DATA.categories.filter(function (x) { return x.id === r.cat; })[0] || {};
    var html = phoneHeader({ brand: r.type, flat: true, back: '#/patient/records' });
    html += '<div class="hm-app-body has-nav">' +
      overviewOf('Viewing a single record.', 'your account') +
      '<section class="hm-card"><div class="hm-card__body">' +
      '<div class="hm-row__icon" style="margin-bottom:12px">' + icon(c.icon || 'file', 20) + '</div>' +
      '<h1 style="margin:0 0 4px;font-size:22px">' + esc(r.type) + '</h1>' +
      '<p class="muted" style="margin:0 0 16px">' + esc(r.date) + ' · ' + esc(r.facility) + '</p>' +
      badge(r.status) +
      '<details class="hm-collapse" open style="margin-top:16px"><summary>Clinical summary' + icon('chevD', 16) + '</summary><div class="hm-collapse__body"><p style="margin:0">' + esc(r.summary) + '</p></div></details>' +
      '<details class="hm-collapse" open style="margin-top:10px"><summary>Structured fields' + icon('chevD', 16) + '</summary><div class="hm-collapse__body"><dl class="hm-kv">' +
      r.fields.map(function (f) { return '<dt>' + esc(f.k) + '</dt><dd>' + esc(f.v) + '</dd>'; }).join('') + '</dl></div></details>' +
      '<details class="hm-collapse" style="margin-top:10px"><summary>Source &amp; provenance' + icon('chevD', 16) + '</summary><div class="hm-collapse__body"><dl class="hm-kv">' +
      '<dt>Recorded by</dt><dd>' + esc(r.clinician) + '</dd><dt>Facility</dt><dd>' + esc(r.facility) + '</dd><dt>Last updated</dt><dd>' + esc(r.updated) + '</dd><dt>Record ID</dt><dd>' + esc(r.id.toUpperCase()) + '</dd>' +
      '</dl></div></details></div></section>' +
      '<div class="hm-notice is-info">' + icon('info', 18) + '<div><p>This view only ever shows your own records. Other patients are never accessible here.</p></div></div>' +
      '</div>';
    return html;
  }

  function patientAccess() {
    var tabs = [['active', 'Active'], ['pending', 'Pending'], ['closed', 'Expired & revoked']];
    var list = DATA.grants.filter(function (g) {
      if (state.accessTab === 'active') return g.status === 'active';
      if (state.accessTab === 'pending') return g.status === 'pending';
      return g.status === 'expired' || g.status === 'revoked';
    });
    var html = phoneHeader({ brand: 'Access & consent', flat: true, back: '#/patient/home', bell: true });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-tabs" role="tablist">' + tabs.map(function (t) {
        return '<button class="hm-tab" role="tab" aria-selected="' + (state.accessTab === t[0]) + '" data-action="access-tab" data-value="' + t[0] + '">' + esc(t[1]) + '</button>';
      }).join('') + '</div>' +
      '<div style="display:flex;gap:10px"><button class="hm-btn hm-btn--primary hm-fill" data-nav="#/patient/new-grant">' + icon('plus', 16) + 'New access grant</button>' +
      '<button class="hm-btn hm-btn--secondary" data-nav="#/patient/history">' + icon('clock', 16) + 'History</button></div>' +
      (list.length ? '<div class="od-stack" style="gap:12px">' + list.map(grantCard).join('') + '</div>' :
        '<div class="hm-empty"><span class="hm-empty__icon">' + icon('shield', 26) + '</span><h3 class="hm-empty__title">Nothing here</h3><p class="hm-empty__text">No ' + esc(state.accessTab === 'closed' ? 'expired or revoked' : state.accessTab) + ' access grants.</p></div>') +
      '<p class="hm-help">Hiding a card never revokes access. Revocation is only confirmed after the (simulated) server result.</p>' +
      '</div>';
    return html;
  }

  function grantCard(g) {
    var cls = g.status === 'expired' ? 'is-expired' : g.status === 'revoked' ? 'is-revoked' : '';
    return '<article class="hm-grant ' + cls + '">' +
      '<div class="hm-grant__top"><span class="hm-avatar hm-avatar--sm">' + icon(g.role.indexOf('organization') > -1 ? 'building' : 'user', 18) + '</span>' +
      '<div class="od-fill"><strong>' + esc(g.recipient) + '</strong><div class="hm-row__meta">' + esc(g.role) + ' · ' + esc(g.org) + '</div></div>' + badge(g.status) + '</div>' +
      '<div class="hm-grant__body">' +
      '<div><span class="hm-eyebrow">Scope</span><ul class="hm-grant__scopelist">' + g.scope.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<dl class="hm-kv"><dt>Purpose</dt><dd>' + esc(g.purpose) + '</dd><dt>Starts</dt><dd>' + esc(g.start) + '</dd><dt>Expires</dt><dd>' + esc(g.expires) + '</dd></dl>' +
      '<div><button class="hm-btn hm-btn--secondary hm-btn--sm" data-nav="#/patient/grant/' + g.id + '">' + icon('eye', 15) + 'Details</button></div>' +
      '</div>' +
      '<div class="hm-grant__actions"><button class="hm-btn hm-btn--danger-ghost hm-btn--sm" data-action="revoke" data-grant="' + g.id + '">' + icon('x', 15) + 'Revoke access</button></div>' +
      '</article>';
  }

  function patientGrant(id) {
    var g = DATA.grants.filter(function (x) { return x.id === id; })[0];
    if (!g) return patientAccess();
    var html = phoneHeader({ brand: 'Grant details', flat: true, back: '#/patient/access' });
    html += '<div class="hm-app-body has-nav">' +
      '<section class="hm-card"><div class="hm-card__body">' +
      '<div class="hm-identity"><span class="hm-avatar">' + icon('user', 22) + '</span><div><h1 class="hm-identity__name">' + esc(g.recipient) + '</h1><p class="hm-identity__meta">' + esc(g.role) + '</p></div></div>' +
      '<div style="margin-top:14px">' + badge(g.status) + '</div>' +
      '<dl class="hm-kv" style="margin-top:16px">' +
      '<dt>Organization</dt><dd>' + esc(g.org) + '</dd>' +
      '<dt>Purpose</dt><dd>' + esc(g.purpose) + '</dd>' +
      '<dt>Information scope</dt><dd>' + esc(g.scope.join(', ')) + '</dd>' +
      '<dt>Starts</dt><dd>' + esc(g.start) + '</dd>' +
      '<dt>Expires</dt><dd>' + esc(g.expires) + '</dd>' +
      '</dl></div></section>' +
      '<div class="hm-notice is-warning">' + icon('alert', 18) + '<div><p class="hm-notice__title">Expiry is enforced by the server</p><p>The app never enforces expiration with a local timer; it always reflects the backend result.</p></div></div>' +
      (g.status === 'active' ? '<button class="hm-btn hm-btn--danger hm-btn--block" data-action="revoke" data-grant="' + g.id + '">' + icon('x', 16) + 'Revoke this access</button>' : '') +
      '</div>';
    return html;
  }

  function newGrant() {
    var s = state.grantStep;
    var steps = ['Recipient & scope', 'Validity & purpose', 'Review & confirm'];
    var html = phoneHeader({ brand: 'New access grant', flat: true, back: '#/patient/access' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-tabs" role="tablist" aria-label="Steps">' + steps.map(function (t, i) {
        return '<button class="hm-tab" role="tab" aria-selected="' + (s === i + 1) + '" disabled>' + (i + 1) + '. ' + esc(t) + '</button>';
      }).join('') + '</div>';
    if (s === 1) {
      html += '<div class="hm-field"><label class="hm-label" for="g-recip">Authorized recipient <span class="req">*</span></label>' +
        '<select class="hm-select" id="g-recip"><option>Dr. Neha Kapoor — Primary care</option><option>Dr. A. Rao — Radiology</option><option>City Diagnostics — Laboratory (organization)</option></select>' +
        '<span class="hm-help">Named or role-based recipient only.</span></div>' +
        '<fieldset style="border:1px solid var(--border);border-radius:12px;padding:14px;margin:0"><legend class="hm-label" style="padding:0 6px">Access scope</legend>' +
        ['Encounters', 'Observations', 'Medications', 'Allergies', 'Reports', 'Care plans'].map(function (x, i) {
          return '<label class="hm-check" style="margin-bottom:8px"><input type="checkbox" ' + (i < 2 ? 'checked' : '') + '> ' + esc(x) + '</label>';
        }).join('') + '</fieldset>' +
        '<button class="hm-btn hm-btn--primary hm-btn--block" data-action="grant-step" data-value="2">Continue' + icon('chevR', 16) + '</button>';
    } else if (s === 2) {
      html += '<div class="hm-field"><label class="hm-label" for="g-purpose">Purpose of access <span class="req">*</span></label>' +
        '<input class="hm-input" id="g-purpose" value="Ongoing care management"></div>' +
        '<div class="hm-field"><label class="hm-label" for="g-start">Access begins</label><input class="hm-input" id="g-start" type="text" value="Immediately on approval" readonly></div>' +
        '<div class="hm-field"><label class="hm-label" for="g-exp">Expires <span class="req">*</span></label>' +
        '<select class="hm-select" id="g-exp"><option>7 days</option><option selected>30 days</option><option>90 days</option><option>180 days</option></select>' +
        '<span class="hm-help">A defined validity period and explicit expiry are required.</span></div>' +
        '<div style="display:flex;gap:10px"><button class="hm-btn hm-btn--secondary hm-fill" data-action="grant-step" data-value="1">' + icon('back', 16) + 'Back</button>' +
        '<button class="hm-btn hm-btn--primary hm-fill" data-action="grant-step" data-value="3">Review</button></div>';
    } else {
      html += '<div class="hm-notice is-brand">' + icon('shieldCheck', 18) + '<div><p class="hm-notice__title">Review before granting</p><p>You are about to let <strong>Dr. Neha Kapoor (Primary care)</strong> see <strong>Encounters, Observations</strong> for <strong>30 days</strong> for <strong>Ongoing care management</strong>.</p></div></div>' +
        '<dl class="hm-kv hm-card" style="padding:16px"><dt>Recipient</dt><dd>Dr. Neha Kapoor</dd><dt>Scope</dt><dd>Encounters, Observations</dd><dt>Purpose</dt><dd>Ongoing care management</dd><dt>Validity</dt><dd>30 days from approval</dd><dt>Revocable</dt><dd>Yes, at any time</dd></dl>' +
        '<div style="display:flex;gap:10px"><button class="hm-btn hm-btn--secondary hm-fill" data-action="grant-step" data-value="2">' + icon('back', 16) + 'Back</button>' +
        '<button class="hm-btn hm-btn--primary hm-fill" data-action="confirm-grant">' + icon('check', 16) + 'Grant access</button></div>' +
        '<p class="hm-help">In production the backend enforces recipient, scope and expiry. This prototype simulates the result.</p>';
    }
    html += '</div>';
    return html;
  }

  function patientQR() {
    var secs = 300 - Math.floor((Date.now() - state.qrCreated) / 1000);
    if (secs < 0) secs = 0;
    var mm = Math.floor(secs / 60), ss = ('0' + (secs % 60)).slice(-2);
    var valid = secs > 0;
    var html = phoneHeader({ brand: 'My QR Pass', flat: true, back: '#/patient/home' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-notice is-success">' + icon('shieldCheck', 18) + '<div><p class="hm-notice__title">Active Dynamic QR Pass</p><p>Cryptographically signed single-use pass with embedded consent authorization for Dr. Rohit Verma.</p></div></div>' +
      '<section class="hm-card"><div class="hm-card__body" style="text-align:center">' +
      '<div class="hm-identity" style="justify-content:center;margin-bottom:16px"><span class="hm-avatar">' + esc(DATA.patient.name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span><div style="text-align:left"><strong>' + esc(DATA.patient.name) + '</strong><div class="hm-row__meta">' + esc(DATA.patient.id) + '</div></div></div>' +
      '<div class="hm-qr">' + demoQR(state.qrToken) + '</div>' +
      '<p style="margin:16px 0 4px">' + (valid ? badge('active') + ' Valid for ' + mm + ':' + ss : badge('expired') + ' Expired') + '</p>' +
      '<p class="hm-help" style="display:flex;align-items:center;justify-content:center;gap:8px">Auth Token: <strong id="app-qr-token-text">' + esc(state.qrToken) + '</strong><button class="hm-btn hm-btn--ghost hm-btn--sm" data-action="qr-copy" style="font-size:11px;padding:2px 8px;border:1px solid var(--border)">📋 Copy</button></p>' +
      '<button class="hm-btn hm-btn--secondary hm-btn--block" style="margin-top:14px" data-action="qr-refresh">' + icon('refresh', 16) + 'Regenerate QR Pass</button>' +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">How clinicians use this</h2></div><div class="hm-card__body"><ol style="margin:0;padding-left:18px;color:var(--text-2);font-size:14px;display:grid;gap:8px"><li>The clinician scans the code.</li><li>The backend validates the reference and its expiry.</li><li>Identity, role, organization and consent are checked server-side.</li><li>Only permitted records are shown, and the access is audited.</li></ol></div></section>' +
      '</div>';
    return html;
  }

  function patientHistory() {
    var html = phoneHeader({ brand: 'Access history', flat: true, back: '#/patient/access' });
    html += '<div class="hm-app-body has-nav">' +
      overviewOf('Viewing your access timeline.', 'your account') +
      '<div class="hm-filterbar"><button class="hm-chip" aria-pressed="true">All events</button><button class="hm-chip" aria-pressed="false">Granted</button><button class="hm-chip" aria-pressed="false">Denied</button><button class="hm-chip" aria-pressed="false">Expired / revoked</button></div>' +
      '<section class="hm-card"><div class="hm-card__body"><ul class="hm-timeline">' + DATA.accessEvents.map(function (e) {
        var cls = e.outcome === 'denied' ? 'is-error' : (e.outcome === 'revoked' || e.outcome === 'expired') ? 'is-warning' : 'is-success';
        return '<li class="hm-timeline__item ' + cls + '"><div class="hm-timeline__title">' + esc(e.action) + '</div><div class="hm-timeline__meta">' + esc(e.actor) + ' · ' + esc(e.resource) + '</div><div class="hm-timeline__meta">' + esc(e.ts) + ' · ' + esc(e.org) + ' ' + badge(e.outcome) + '</div></li>';
      }).join('') + '</ul></div></section>' +
      '<p class="hm-help">Security-sensitive internal details are intentionally not exposed. Demo data.</p>' +
      '</div>';
    return html;
  }

  function patientProfile() {
    var p = DATA.patient;
    var html = phoneHeader({ brand: 'Profile', flat: true, back: '#/patient/home' });
    html += '<div class="hm-app-body has-nav">' +
      '<section class="hm-card"><div class="hm-card__body"><div class="hm-identity"><span class="hm-avatar">' + esc(p.name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span><div><h1 class="hm-identity__name">' + esc(p.name) + '</h1><p class="hm-identity__meta">Patient · ' + esc(p.id) + '</p></div></div></div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Account & settings</h2></div><div class="hm-card__body"><ul class="hm-list">' +
      '<li class="hm-row"><span class="hm-row__icon">' + icon('user', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Account identity</span><span class="hm-row__meta">Managed by Clerk (demo)</span></span></li>' +
      '<li class="hm-row"><span class="hm-row__icon">' + icon('key', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Health identifier</span><span class="hm-row__meta">' + esc(p.abha) + '</span></span></li>' +
      '<li class="hm-row"><span class="hm-row__icon">' + icon('bell', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Notification preferences</span><span class="hm-row__meta">Record, access &amp; consent alerts</span></span><span class="hm-row__end"><input type="checkbox" checked aria-label="Notification preferences"></span></li>' +
      '<li class="hm-row"><span class="hm-row__icon">' + icon('lock', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Privacy information</span><span class="hm-row__meta">How your data is protected</span></span><span class="hm-row__end">' + icon('chevR', 18) + '</span></li>' +
      '<li class="hm-row"><span class="hm-row__icon">' + icon('info', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Help &amp; support</span><span class="hm-row__meta">Contact and guidance</span></span><span class="hm-row__end">' + icon('chevR', 18) + '</span></li>' +
      '</ul></div></section>' +
      '<button class="hm-btn hm-btn--secondary hm-btn--block" data-action="signout">' + icon('logout', 16) + 'Sign out</button>' +
      '<p class="hm-help" style="text-align:center">HackMatrix prototype · demo build</p>' +
      '</div>';
    return html;
  }

  /* ---------------- clinician views ---------------- */
  function clinicianDashboard() {
    var c = DATA.clinician;
    var quick = [
      { label: 'Scan patient QR', hint: 'Identify securely', icon: 'scan', to: '#/clinician/scan' },
      { label: 'Find patient', hint: 'Authorized search', icon: 'search', to: '#/clinician/patients' },
      { label: 'Recent access', hint: 'Your activity', icon: 'clock', to: '#/clinician/history' },
      { label: 'Emergency access', hint: 'Break-glass', icon: 'alert', to: '#/clinician/emergency' }
    ];
    var acts = DATA.clinicianActivity.slice(0, 4).map(function (e) {
      var cls = e.outcome === 'denied' ? 'is-error' : e.outcome === 'expired' ? 'is-warning' : 'is-success';
      return '<li class="hm-row"><span class="hm-row__icon ' + cls + '">' + icon(e.outcome === 'granted' ? 'eye' : e.outcome === 'denied' ? 'x' : 'clock', 18) + '</span>' +
        '<span class="hm-row__body"><span class="hm-row__title">' + esc(e.action) + '</span><span class="hm-row__meta">' + esc(e.patient) + ' · ' + esc(e.ts) + '</span></span><span class="hm-row__end">' + badge(e.outcome) + '</span></li>';
    }).join('');
    var html = phoneHeader({ title: c.name, sub: c.org + ' · ' + c.dept, bell: true, profile: '#/clinician/profile' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-notice is-brand">' + icon('shieldCheck', 18) + '<div><p class="hm-notice__title">' + esc(c.access) + '</p><p>Role and organization come from trusted authentication, never from editable fields.</p></div></div>' +
      '<section><h2 class="hm-section__title">Quick actions</h2><div class="hm-quickgrid">' +
      quick.map(function (q) { return '<button class="hm-quick" data-nav="' + q.to + '"><span class="hm-quick__icon ' + (q.icon === 'alert' ? 'is-amber' : q.icon === 'search' ? 'is-blue' : '') + '">' + icon(q.icon, 18) + '</span><span class="hm-quick__label">' + esc(q.label) + '</span><span class="hm-quick__hint">' + esc(q.hint) + '</span></button>'; }).join('') +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><div><h2 class="hm-card__title">Work summary</h2><p class="hm-card__sub">Today · demo figures</p></div></div><div class="hm-card__body"><div class="hm-vitals">' +
      '<div class="hm-vital"><div class="hm-vital__value">6</div><div class="hm-vital__label">Patients seen</div></div>' +
      '<div class="hm-vital"><div class="hm-vital__value">4</div><div class="hm-vital__label">QR checks</div></div>' +
      '<div class="hm-vital"><div class="hm-vital__value">1</div><div class="hm-vital__label">Denied access</div></div>' +
      '</div></div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Recent activity</h2><button class="hm-btn hm-btn--ghost hm-btn--sm" data-nav="#/clinician/history">All</button></div><div class="hm-card__body"><ul class="hm-list">' + acts + '</ul></div></section>' +
      '<div class="hm-notice is-warning">' + icon('alert', 18) + '<div><p class="hm-notice__title">Action needed</p><p>1 access request is awaiting patient approval. Access is not granted until the patient consents.</p></div></div>' +
      '</div>';
    return html;
  }

  function clinicianScan() {
    var s = state.scanState;
    var body;
    if (s === 'idle') {
      body = '<div class="hm-scanner"><div class="hm-scanner__frame"><span></span><div class="hm-scanner__laser"></div></div><div class="hm-scanner__hint">Scan Patient’s Dynamic QR Code</div></div>' +
        '<div class="hm-notice is-success">' + icon('shieldCheck', 18) + '<div><p>Optical scanner ready. Scan patient QR code or simulate verification below.</p></div></div>' +
        '<button class="hm-btn hm-btn--primary hm-btn--block" data-action="scan" data-value="scanning">' + icon('scan', 16) + 'Scan & Validate QR Code</button>' +
        '<button class="hm-btn hm-btn--secondary hm-btn--block" data-nav="#/clinician/patients">Enter Patient ID Manually</button>';
    } else if (s === 'scanning') {
      body = '<div class="hm-scanner"><div class="hm-scanner__frame"><span></span><div class="hm-scanner__laser"></div></div></div>' +
        '<div class="hm-notice is-brand">' + icon('scan', 18) + '<div><p class="hm-notice__title">Validating…</p><p>Checking the reference, expiry, your role, organization and consent.</p></div></div>' +
        '<div class="hm-skel hm-skel--title"></div><div class="hm-skel hm-skel--line"></div><div class="hm-skel hm-skel--line" style="width:70%"></div>' +
        '<button class="hm-btn hm-btn--secondary hm-btn--block" data-action="scan" data-value="idle">Cancel</button>';
    } else {
      var msgs = {
        invalid: ['error', 'Invalid code', 'The code is not a valid HackMatrix reference. Ask the patient to regenerate it.'],
        expired: ['warning', 'Expired code', 'This code has expired and cannot be used. Ask the patient for a fresh code.'],
        network: ['error', 'Network problem', 'The reference could not be validated. Check the connection and try again.'],
        denied: ['error', 'Access denied', 'Consent or organization policy prevented access. No patient information was revealed.']
      };
      var msg = msgs[s] || msgs.network;
      body = '<div class="hm-scanner" style="aspect-ratio:auto;padding:40px 20px"><span class="hm-empty__icon" style="background:rgba(255,255,255,.1);color:#fff">' + icon(msg[0] === 'error' ? 'xCircle' : 'alert', 28) + '</span><p style="margin:12px 0 0;font-weight:600">' + esc(msg[1]) + '</p></div>' +
        '<div class="hm-notice is-' + (msg[0] === 'warning' ? 'warning' : 'error') + '">' + icon('alert', 18) + '<div><p>' + esc(msg[2]) + '</p></div></div>' +
        '<button class="hm-btn hm-btn--primary hm-btn--block" data-action="scan" data-value="idle">Try again</button>' +
        '<button class="hm-btn hm-btn--secondary hm-btn--block" data-nav="#/clinician/dashboard">Back to dashboard</button>';
    }
    var html = phoneHeader({ brand: 'Scan QR', flat: true, back: '#/clinician/dashboard' });
    html += '<div class="hm-app-body has-nav">' + body + '</div>';
    return html;
  }

  function clinicianPatients() {
    var q = state.adminQuery.toLowerCase();
    var list = DATA.clinicianActivity.filter(function (e) { return !q || e.patient.toLowerCase().indexOf(q) > -1; });
    var html = phoneHeader({ brand: 'Patients', flat: true, back: '#/clinician/dashboard', bell: true });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-search">' + icon('search', 18) + '<input class="hm-input" type="search" id="clin-search" placeholder="Search authorized patients" aria-label="Search patients" value="' + esc(state.adminQuery) + '"></div>' +
      '<div class="hm-notice is-info">' + icon('lock', 18) + '<div><p>A search only returns patients you are authorized to see. Unauthorized identifiers are shown as not found to avoid leaking their existence.</p></div></div>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Open a patient</h2></div><div class="hm-card__body">' +
      '<button class="hm-row hm-row--btn" data-nav="#/clinician/patient/p1"><span class="hm-row__icon is-success">' + icon('shieldCheck', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">Meera Nair · ' + esc(DATA.clinicianPatient.id) + '</span><span class="hm-row__meta">Emergency grant active · expires 13 Sep</span></span><span class="hm-row__end">' + icon('chevR', 18) + '</span></button>' +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Recent access</h2></div><div class="hm-card__body">' +
      (list.length ? '<ul class="hm-list">' + list.map(function (e) {
        return '<li class="hm-row"><span class="hm-row__icon ' + (e.outcome === 'denied' ? 'is-error' : e.outcome === 'expired' ? 'is-warning' : '') + '">' + icon('eye', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">' + esc(e.patient) + '</span><span class="hm-row__meta">' + esc(e.action) + ' · ' + esc(e.ts) + '</span></span><span class="hm-row__end">' + badge(e.outcome) + '</span></li>';
      }).join('') + '</ul>' : '<p class="hm-help">No matching activity.</p>') +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Pending requests</h2></div><div class="hm-card__body"><ul class="hm-list">' +
      DATA.clinicianRequests.map(function (r) {
        return '<li class="hm-row"><span class="hm-row__icon is-warning">' + icon('clock', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">' + esc(r.patient) + '</span><span class="hm-row__meta">' + esc(r.scope) + ' · ' + esc(r.state) + '</span></span></li>';
      }).join('') + '</ul><p class="hm-help">Clinicians cannot approve consent here; patient approval is required.</p></div></section>' +
      '</div>';
    return html;
  }

  function clinicianPatient() {
    var p = DATA.clinicianPatient;
    var html = phoneHeader({ brand: 'Patient', flat: true, back: '#/clinician/patients' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-notice is-success">' + icon('checkCircle', 18) + '<div><p class="hm-notice__title">Authorization established</p><p>' + esc(p.consent) + ' · grant ' + esc(p.grantRef) + '</p></div></div>' +
      '<section class="hm-card"><div class="hm-card__body">' +
      '<div class="hm-identity"><span class="hm-avatar">' + esc(p.name.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span><div><h1 class="hm-identity__name">' + esc(p.name) + '</h1><p class="hm-identity__meta">' + esc(p.id) + ' · ' + p.age + ' yrs · ' + esc(p.sex) + '</p></div></div>' +
      '<dl class="hm-kv" style="margin-top:14px"><dt>Blood group</dt><dd>' + esc(p.bloodGroup) + '</dd><dt>Allergies</dt><dd>' + esc(p.allergies.join(', ')) + '</dd><dt>Facility</dt><dd>' + esc(p.facility) + '</dd></dl>' +
      '<div class="hm-notice is-warning" style="margin-top:14px">' + icon('alert', 16) + '<div><p class="hm-notice__title">Safety alert</p><p>Allergy: ' + esc(p.allergies.join(', ')) + '</p></div></div>' +
      '</div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Active grant</h2>' + badge('active') + '</div><div class="hm-card__body">' +
      '<dl class="hm-kv"><dt>Scope</dt><dd>' + esc(p.scope.join(', ')) + '</dd><dt>Expires</dt><dd>' + esc(p.expires) + '</dd></dl>' +
      '<button class="hm-btn hm-btn--primary hm-btn--block" style="margin-top:14px" data-nav="#/clinician/records/p1">' + icon('records', 16) + 'Open clinical records</button>' +
      '<button class="hm-btn hm-btn--secondary hm-btn--block" style="margin-top:8px" data-action="add-diagnosis">' + icon('plus', 16) + 'Record New Diagnosis / Note</button>' +
      '</div></section>' +
      '<div class="hm-notice is-info">' + icon('info', 18) + '<div><p>Only the scope above is visible. Access is recorded in the audit trail. Demo data.</p></div></div>' +
      '</div>';
    return html;
  }

  function clinicianRecords() {
    var p = DATA.clinicianPatient;
    var byCat = DATA.categories.map(function (c) {
      var rows = DATA.records.filter(function (r) { return r.cat === c.id && p.scope.indexOf(c.label) > -1; });
      if (!rows.length) return '';
      return '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">' + esc(c.label) + '</h2></div><div class="hm-card__body"><ul class="hm-list">' +
        rows.map(function (r) {
          return '<li class="hm-row"><span class="hm-row__icon">' + icon(c.icon, 18) + '</span><span class="hm-row__body"><span class="hm-row__title">' + esc(r.type) + '</span><span class="hm-row__meta">' + esc(r.date) + ' · ' + esc(r.facility) + '</span></span></li>';
        }).join('') + '</ul></div></section>';
    }).join('');
    var html = phoneHeader({ brand: 'Clinical records', flat: true, back: '#/clinician/patient/p1' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-notice is-info">' + icon('info', 18) + '<div><p class="hm-notice__title">' + esc(p.name) + ' · ' + esc(p.id) + '</p><p>Authorized scope only · demo data. Diagnoses and history are never fabricated.</p></div></div>' +
      '<button class="hm-btn hm-btn--primary hm-btn--block" style="margin-bottom:12px" data-action="add-diagnosis">' + icon('plus', 16) + 'Record New Diagnosis / Note</button>' +
      (byCat || '<div class="hm-empty"><span class="hm-empty__icon">' + icon('records', 26) + '</span><h3 class="hm-empty__title">No authorized records</h3><p class="hm-empty__text">The current grant does not include record categories, or none are available.</p></div>') +
      '</div>';
    return html;
  }

  function clinicianHistory() {
    var html = phoneHeader({ brand: 'Access history', flat: true, back: '#/clinician/dashboard' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-filterbar"><button class="hm-chip" aria-pressed="true">All</button><button class="hm-chip" aria-pressed="false">Granted</button><button class="hm-chip" aria-pressed="false">Denied</button></div>' +
      '<section class="hm-card"><div class="hm-card__body"><ul class="hm-timeline">' + DATA.clinicianActivity.map(function (e) {
        var cls = e.outcome === 'denied' ? 'is-error' : e.outcome === 'expired' ? 'is-warning' : 'is-success';
        return '<li class="hm-timeline__item ' + cls + '"><div class="hm-timeline__title">' + esc(e.action) + '</div><div class="hm-timeline__meta">' + esc(e.patient) + ' · ' + esc(e.activity) + '</div><div class="hm-timeline__meta">' + esc(e.ts) + ' ' + badge(e.outcome) + '</div></li>';
      }).join('') + '</ul></div></section>' +
      '<p class="hm-help">Audit records are read-only; clinicians cannot edit or delete them.</p>' +
      '</div>';
    return html;
  }

  function clinicianEmergency() {
    var html = phoneHeader({ brand: 'Emergency access', flat: true, back: '#/clinician/dashboard' });
    html += '<div class="hm-app-body has-nav">' +
      '<div class="hm-notice is-error">' + icon('alert', 18) + '<div><p class="hm-notice__title">Break-glass access</p><p>Use only for a genuine emergency. This action is subject to additional audit and review and is not a universal bypass.</p></div></div>' +
      '<div class="hm-field"><label class="hm-label" for="em-patient">Patient reference <span class="req">*</span></label><input class="hm-input" id="em-patient" placeholder="e.g. HMX-P-31877"></div>' +
      '<div class="hm-field"><label class="hm-label" for="em-reason">Clinical justification <span class="req">*</span></label><textarea class="hm-textarea" id="em-reason" placeholder="Describe the emergency and why immediate access is required (minimum 10 characters)."></textarea><span class="hm-help">Justification is recorded in the audit trail. Minimum 10 characters.</span><span class="hm-error-text" id="em-error" hidden>' + icon('alertCircle', 14) + ' A justification of at least 10 characters is required.</span></div>' +
      '<button class="hm-btn hm-btn--danger hm-btn--block" data-action="emergency-submit">' + icon('lock', 16) + 'Request emergency access</button>' +
      '<p class="hm-help">Even in emergency mode the backend still validates the clinician identity, organization and policy before any record is revealed.</p>' +
      '</div>';
    return html;
  }

  function clinicianProfile() {
    var c = DATA.clinician;
    var html = phoneHeader({ brand: 'Profile', flat: true, back: '#/clinician/dashboard' });
    html += '<div class="hm-app-body has-nav">' +
      '<section class="hm-card"><div class="hm-card__body"><div class="hm-identity"><span class="hm-avatar">' + esc(c.name.replace('Dr. ', '').split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2)) + '</span><div><h1 class="hm-identity__name">' + esc(c.name) + '</h1><p class="hm-identity__meta">' + esc(c.role) + ' · ' + esc(c.id) + '</p></div></div></div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Credential & organization</h2></div><div class="hm-card__body"><dl class="hm-kv">' +
      '<dt>Organization</dt><dd>' + esc(c.org) + '</dd><dt>Department</dt><dd>' + esc(c.dept) + '</dd><dt>Account status</dt><dd>' + badge('active') + '</dd><dt>Trust source</dt><dd>Backend authentication context</dd>' +
      '</dl><p class="hm-help" style="margin-top:10px">Role and organization are not editable here.</p></div></section>' +
      '<button class="hm-btn hm-btn--secondary hm-btn--block" data-action="signout">' + icon('logout', 16) + 'Sign out</button>' +
      '</div>';
    return html;
  }

  /* ---------------- admin shell + views ---------------- */
  var ADMIN_NAV = [
    { k: 'overview', l: 'Overview', i: 'grid' },
    { k: 'surveillance', l: 'Disease Surveillance', i: 'activity' },
    { k: 'predictive', l: 'Predictive Monitoring', i: 'branch', planned: true },
    { k: 'geo', l: 'Geographic Trends', i: 'pin' },
    { k: 'facilities', l: 'Facility Analytics', i: 'building' },
    { k: 'privacy', l: 'Privacy & Data Quality', i: 'shield' },
    { k: 'audit', l: 'Audit & Access', i: 'list' },
    { k: 'orgs', l: 'Organizations', i: 'building' },
    { k: 'users', l: 'Users & Roles', i: 'users' },
    { k: 'status', l: 'System Status', i: 'server' },
    { k: 'settings', l: 'Settings', i: 'sliders' }
  ];

  function adminShell(active, content, title) {
    var nav = ADMIN_NAV.map(function (n) {
      return '<button class="hm-admin__navitem" ' + (active === n.k ? 'aria-current="true"' : '') + ' data-nav="#/admin/' + n.k + '" title="' + esc(n.l) + '">' + icon(n.i, 19) + '<span class="hm-admin__navlabel">' + esc(n.l) + '</span>' + (n.planned ? '<span class="planned">soon</span>' : '') + '</button>';
    }).join('');
    return '<div class="hm-admin' + (state.collapsed ? ' is-collapsed' : '') + '">' +
      '<aside class="hm-admin__sidebar"><div class="hm-admin__brand"><span class="hm-logo on-dark"><span class="hm-logo__mark">' + icon('shieldCheck', 17) + '</span><span class="hm-logo__text">Hack<b>Matrix</b></span></span></div>' +
      '<div class="hm-admin__env">Admin console · demo</div>' +
      '<nav class="hm-admin__nav" aria-label="Sections">' + nav + '</nav></aside>' +
      '<div class="hm-admin__main">' +
      '<header class="hm-admin__topbar">' +
      '<button class="hm-icon-btn" data-action="admin-collapse" aria-label="Toggle sidebar">' + icon('menu', 20) + '</button>' +
      '<div><div class="hm-admin__crumb">HackMatrix / Administrator</div><h1 class="hm-admin__title">' + esc(title) + '</h1></div>' +
      '<div class="spacer"></div>' +
      '<div class="hm-search hm-admin__search">' + icon('search', 17) + '<input class="hm-input" type="search" placeholder="Search" aria-label="Search"></div>' + demo() +
      '<button class="hm-icon-btn" data-action="notify" aria-label="Notifications">' + icon('bell', 20) + '</button>' +
      '<button class="hm-btn hm-btn--secondary hm-btn--sm" data-action="signout">' + icon('logout', 15) + 'Sign out</button>' +
      '</header>' +
      '<div class="hm-admin__content">' + content + '</div>' +
      '</div></div>';
  }

  function pageHead(title, desc, actions) {
    return '<div class="hm-page-head"><div><h2 class="hm-page-head__title">' + esc(title) + '</h2><p class="hm-page-head__desc">' + esc(desc) + '</p></div>' + (actions ? '<div class="hm-page-head__actions">' + actions + '</div>' : '') + '</div>';
  }

  function kpiCards(cards) {
    return '<div class="hm-kpi-grid">' + cards.map(function (c) {
      var arrow = c.dir === 'up' ? 'trendUp' : c.dir === 'down' ? 'trendDown' : 'minus';
      return '<article class="hm-card hm-stat"><div class="hm-stat__label">' + esc(c.label) + '<span title="Value is from demo data">' + icon('info', 13) + '</span></div>' +
        '<div class="hm-stat__value">' + esc(c.value) + (c.unit ? '<small>' + esc(c.unit) + '</small>' : '') + '</div>' +
        '<div class="hm-stat__delta ' + (c.dir || 'flat') + '">' + icon(arrow, 14) + esc(c.delta) + ' <span class="muted">' + esc(c.hint) + '</span></div></article>';
    }).join('') + '</div>';
  }

  function adminOverview() {
    var labels = dayLabels(state.period);
    var cut = function (arr) { return arr.slice(arr.length - state.period); };
    var trend = lineChart({
      labels: labels, unit: 'cases', period: 'last ' + state.period + ' days',
      series: [
        { name: 'Influenza-like illness', color: '#0F766E', data: cut(DATA.admin.trend.ili) },
        { name: 'Dengue', color: '#2563EB', data: cut(DATA.admin.trend.dengue) },
        { name: 'Acute diarrheal disease', color: '#B45309', data: cut(DATA.admin.trend.add) }
      ],
      aria: 'Observed syndrome counts over the last ' + state.period + ' days'
    });
    var region = barChart({
      labels: DATA.admin.regions.map(function (r) { return r.name.replace(' Region', ''); }),
      data: DATA.admin.regions.map(function (r) { return r.cases; }),
      unit: 'cases', color: '#0F766E', aria: 'Reported cases by region'
    });
    var facilityBar = barChart({
      labels: DATA.admin.facilities.slice(0, 5).map(function (f) { return f.name.split(' ')[0]; }),
      data: DATA.admin.facilities.slice(0, 5).map(function (f) { return f.volume; }),
      unit: 'records', color: '#2563EB', aria: 'Reporting volume by facility'
    });
    var content = pageHead('Analytics Overview', 'Privacy-preserving aggregate surveillance. Individual patient records are not shown in the administrator console.',
      '<span class="hm-seg" role="group" aria-label="Time range">' +
      [7, 14, 30].map(function (d) { return '<button data-action="period" data-value="' + d + '" aria-pressed="' + (state.period === d) + '">' + d + 'd</button>'; }).join('') + '</span>' +
      '<button class="hm-btn hm-btn--secondary" data-action="refresh">' + icon('refresh', 15) + 'Refresh</button>' +
      '<button class="hm-btn hm-btn--secondary" data-action="export">' + icon('download', 15) + 'Export</button>') +
      overviewOf('Aggregate analytics workspace.', 'anonymized populations') +
      kpiCards(DATA.admin.metrics) +
      '<div class="hm-section" style="margin-top:18px"><div class="hm-section__head"><h3 class="hm-section__title">Disease trend</h3>' + demo() + '</div><div class="hm-card"><div class="hm-card__body">' + trend + '</div></div></div>' +
      '<div class="hm-grid-2" style="margin-top:18px"><div><div class="hm-section__head"><h3 class="hm-section__title">Regional distribution</h3></div><div class="hm-card"><div class="hm-card__body">' + region + '</div></div></div>' +
      '<div><div class="hm-section__head"><h3 class="hm-section__title">Facility reporting</h3></div><div class="hm-card"><div class="hm-card__body">' + facilityBar + '</div></div></div></div>' +
      '<div class="hm-grid-2" style="margin-top:18px"><section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Recent system activity</h2></div><div class="hm-card__body"><ul class="hm-timeline">' +
      DATA.admin.audit.slice(0, 4).map(function (a) { return '<li class="hm-timeline__item ' + (a.outcome === 'denied' ? 'is-error' : a.outcome === 'failure' ? 'is-warning' : 'is-success') + '"><div class="hm-timeline__title">' + esc(a.action) + '</div><div class="hm-timeline__meta">' + esc(a.actor) + ' · ' + esc(a.ts) + '</div></li>'; }).join('') + '</ul></div></section>' +
      '<section class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Data freshness</h2></div><div class="hm-card__body"><div class="hm-notice is-success">' + icon('checkCircle', 18) + '<div><p class="hm-notice__title">Last successful refresh</p><p>' + esc(DATA.admin.refreshed) + '</p></div></div>' +
      '<dl class="hm-kv" style="margin-top:14px"><dt>Aggregation period</dt><dd>Daily, 24 h buckets</dd><dt>Pipeline</dt><dd>Operational</dd><dt>Suppression rule</dt><dd>k ≥ ' + DATA.admin.k + ' (see Privacy)</dd></dl></div></section></div>' +
      '<p class="hm-help" style="margin-top:16px">All metrics are synthetic demo values for the Prototype. Do not treat as production statistics.</p>';
    return adminShell('overview', content, 'Analytics Overview');
  }

  function adminSurveillance() {
    var labels = dayLabels(state.period);
    var cut = function (arr) { return arr.slice(arr.length - state.period); };
    var d = DATA.admin.diseases.filter(function (x) { return x.id === state.disease; })[0] || DATA.admin.diseases[0];
    var obs = cut(DATA.admin.trend[state.disease]);
    var fc = DATA.admin.forecast.slice(0, 14);
    var fLabels = dayLabels(14);
    var allLabels = labels.concat(fLabels);
    var obsData = obs.concat(new Array(fLabels.length).fill(null));
    var fcData = new Array(obs.length).fill(null).concat(fc);
    var chart = lineChart({
      labels: allLabels, unit: 'cases', period: state.period + ' observed days + 14-day forecast',
      series: [
        { name: 'Observed', color: '#0F766E', data: obsData },
        { name: 'Forecast (model estimate)', color: '#94A3B8', dashed: true, data: fcData }
      ]
    });
    var total = obs.reduce(function (a, b) { return a + b; }, 0);
    var content = pageHead('Disease Surveillance', 'Observed syndrome counts clearly separated from model-generated estimates.',
      '<button class="hm-btn hm-btn--secondary" data-action="export">' + icon('download', 15) + 'Export aggregate</button>') +
      overviewOf('Exploring aggregate surveillance data.', 'anonymized populations') +
      '<div class="hm-filterbar hm-card" style="padding:14px"><div class="hm-field" style="min-width:220px"><label class="hm-label" for="sc-disease">Disease / syndrome</label><select class="hm-select" id="sc-disease" data-action="disease">' +
      DATA.admin.diseases.map(function (x) { return '<option value="' + x.id + '"' + (x.id === state.disease ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="hm-field" style="min-width:180px"><label class="hm-label" for="sc-region">Region</label><select class="hm-select" id="sc-region" data-action="region">' +
      '<option value="all">All regions</option>' + DATA.admin.regions.map(function (r) { return '<option value="' + esc(r.name) + '">' + esc(r.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="hm-field"><label class="hm-label">Time range</label><span class="hm-seg" role="group" aria-label="Time range">' + [7, 14, 30].map(function (x) { return '<button data-action="period" data-value="' + x + '" aria-pressed="' + (state.period === x) + '">' + x + 'd</button>'; }).join('') + '</span></div></div>' +
      '<div class="hm-kpi-grid" style="margin-top:14px">' + [
        { label: 'Total observed (' + state.period + 'd)', value: total.toLocaleString('en-IN'), delta: '+2.4%', dir: 'up', hint: 'vs previous window' },
        { label: 'Reporting facilities', value: String(DATA.admin.regions.reduce(function (a, r) { return a + r.facilities; }, 0)), delta: '+4', dir: 'up', hint: 'this week' },
        { label: 'Reporting coverage', value: '94', unit: '%', delta: '-0.6%', dir: 'down', hint: 'facilities on time' },
        { label: 'Data freshness', value: '2', unit: ' h', delta: 'stable', dir: 'flat', hint: 'since last refresh' }
      ].map(function (c) { return '<article class="hm-card hm-stat"><div class="hm-stat__label">' + esc(c.label) + '</div><div class="hm-stat__value">' + esc(c.value) + (c.unit ? '<small>' + esc(c.unit) + '</small>' : '') + '</div><div class="hm-stat__delta ' + c.dir + '">' + icon(c.dir === 'up' ? 'trendUp' : c.dir === 'down' ? 'trendDown' : 'minus', 14) + esc(c.delta) + ' <span class="muted">' + esc(c.hint) + '</span></div></article>'; }).join('') + '</div>' +
      '<div class="hm-section" style="margin-top:18px"><div class="hm-section__head"><h3 class="hm-section__title">' + esc(d.name) + ' — observed vs forecast</h3>' + demo() + '</div><div class="hm-card"><div class="hm-card__body">' + chart +
      '<p class="hm-help" style="margin-top:10px">Observations are recorded counts. Forecast values are model-generated estimates, not confirmed cases. Correlation does not imply causation.</p></div></div></div>';
    return adminShell('surveillance', content, 'Disease Surveillance');
  }

  function adminPredictive() {
    var content = pageHead('Predictive Monitoring', 'Forecast outputs are model-generated estimates and are separated from observed data.') +
      '<div class="hm-empty hm-card" style="padding:60px 24px"><span class="hm-empty__icon">' + icon('branch', 26) + '</span>' +
      '<h3 class="hm-empty__title">Planned — not yet available</h3>' +
      '<p class="hm-empty__text">No predictive model is connected in this build. Forecast surfaces will appear here once a model endpoint exists. Values are never fabricated to populate a chart.</p>' +
      '<div class="hm-cluster" style="justify-content:center"><span class="hm-badge is-info">Planned</span><span class="hm-badge is-neutral">Requires model endpoint</span></div></div>' +
      '<div class="hm-grid-3" style="margin-top:18px">' + [
        { t: 'Forecast horizon', d: 'Configured per model' }, { t: 'Confidence interval', d: 'Shown when available' }, { t: 'Model version', d: 'Recorded with each output' }
      ].map(function (x) { return '<div class="hm-card"><div class="hm-card__body"><div class="hm-eyebrow">' + esc(x.t) + '</div><p class="muted" style="margin:8px 0 0">' + esc(x.d) + '</p></div></div>'; }).join('') + '</div>';
    return adminShell('predictive', content, 'Predictive Monitoring');
  }

  function adminGeo() {
    var rows = DATA.admin.regions.map(function (r) {
      var suppressed = r.cases < DATA.admin.k;
      return '<tr><td>' + esc(r.name) + '</td><td class="num">' + (suppressed ? '<span class="hm-suppress">' + icon('lock', 12) + 'Suppressed</span>' : r.cases.toLocaleString('en-IN')) + '</td><td class="num">' + r.facilities + '</td><td class="num">' + r.completeness + '%</td></tr>';
    }).join('');
    var content = pageHead('Geographic Trends', 'Aggregate counts by region. Individual or identifiable locations are never shown.',
      '<button class="hm-btn hm-btn--secondary" data-action="export">' + icon('download', 15) + 'Export</button>') +
      overviewOf('Regional aggregate comparison.', 'anonymized populations') +
      '<div class="hm-grid-2">' +
      '<div class="hm-card"><div class="hm-card__body">' + barChart({ labels: DATA.admin.regions.map(function (r) { return r.name.replace(' Region', ''); }), data: DATA.admin.regions.map(function (r) { return r.cases; }), unit: 'cases', color: '#0F766E', aria: 'Cases by region' }) + '</div></div>' +
      '<div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Region comparison (accessible table)</h2></div><div class="hm-card__body"><div class="hm-table-wrap"><table class="hm-table"><thead><tr><th>Region</th><th class="num">Cases</th><th class="num">Facilities</th><th class="num">Completeness</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="hm-help" style="margin-top:10px">Groups below the k = ' + DATA.admin.k + ' threshold are suppressed and never reconstructed from totals or alternate breakdowns.</p></div></div></div>';
    return adminShell('geo', content, 'Geographic Trends');
  }

  function adminFacilities() {
    var q = state.adminQuery.toLowerCase();
    var list = DATA.admin.facilities.filter(function (f) { return !q || (f.name + f.region).toLowerCase().indexOf(q) > -1; });
    var per = 5, pages = Math.max(1, Math.ceil(list.length / per));
    if (state.adminPage > pages) state.adminPage = pages;
    var start = (state.adminPage - 1) * per;
    var pageRows = list.slice(start, start + per);
    var head = '<tr><th>Facility</th><th>Region</th><th>Period</th><th class="num">Volume</th><th class="num">Freshness</th><th class="num">Completeness</th><th>Quality</th></tr>';
    var body = pageRows.map(function (f) {
      return '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.region) + '</td><td>' + esc(f.period) + '</td><td class="num">' + f.volume.toLocaleString('en-IN') + '</td><td class="num">' + esc(f.freshness) + '</td><td class="num">' + f.completeness + '%</td><td>' + badge(f.quality) + '</td></tr>';
    }).join('');
    var cards = pageRows.map(function (f) {
      return '<div class="hm-mcard"><strong>' + esc(f.name) + '</strong><dl class="hm-kv" style="margin-top:10px"><dt>Region</dt><dd>' + esc(f.region) + '</dd><dt>Volume</dt><dd>' + f.volume.toLocaleString('en-IN') + '</dd><dt>Freshness</dt><dd>' + esc(f.freshness) + '</dd><dt>Completeness</dt><dd>' + f.completeness + '%</dd><dt>Quality</dt><dd>' + badge(f.quality) + '</dd></dl></div>';
    }).join('');
    var pager = '';
    for (var i = 1; i <= pages; i++) pager += '<button data-action="admin-page" data-value="' + i + '"' + (i === state.adminPage ? ' aria-current="true"' : '') + '>' + i + '</button>';
    var content = pageHead('Facility Analytics', 'Aggregate and organization-scoped metrics. Access to organization data is protected by backend policy.') +
      overviewOf('Facility-level reporting metrics.', 'reporting organizations') +
      '<div class="hm-card"><div class="hm-card__body"><div class="hm-filterbar" style="margin-bottom:12px"><div class="hm-search hm-fill">' + icon('search', 17) + '<input class="hm-input" type="search" id="fac-search" placeholder="Search facilities" aria-label="Search facilities" value="' + esc(state.adminQuery) + '"></div><span class="hm-badge is-neutral">' + list.length + ' facilities</span></div>' +
      '<div class="hm-table-wrap on-mobile-cards"><table class="hm-table"><thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="7"><div class="hm-empty"><span class="hm-empty__icon">' + icon('building', 24) + '</span><h3 class="hm-empty__title">No facilities match</h3><p class="hm-empty__text">Adjust your search to see results.</p></div></td></tr>') + '</tbody></table></div>' +
      '<div class="hm-cards-mobile">' + (cards || '<p class="hm-help">No facilities match your search.</p>') + '</div>' +
      '<div class="hm-row" style="justify-content:flex-end;border-bottom:0"><span class="hm-help">Page ' + state.adminPage + ' of ' + pages + '</span><span class="hm-pager">' + pager + '</span></div>' +
      '</div></div>';
    return adminShell('facilities', content, 'Facility Analytics');
  }

  function adminPrivacy() {
    var content = pageHead('Privacy & Data Quality', 'How aggregate data is protected before it reaches this console. Suppression is enforced by the backend, not by hiding cells in the UI.') +
      overviewOf('Privacy threshold and data-quality configuration.', 'anonymized populations') +
      '<div class="hm-grid-2">' +
      '<div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Minimum group-size threshold (k)</h2>' + demo() + '</div><div class="hm-card__body">' +
      '<p class="muted" style="margin-top:0">Aggregate cells with fewer than k individuals are suppressed. This view lets you see how suppression behaves with the current configuration.</p>' +
      '<div class="hm-seg" role="group" aria-label="k threshold">' + [3, 5, 10].map(function (k) { return '<button data-action="threshold" data-value="' + k + '" aria-pressed="' + (state.threshold === k) + '">k = ' + k + '</button>'; }).join('') + '</div>' +
      '<table class="hm-table" style="margin-top:14px"><thead><tr><th>Example group</th><th class="num">Count</th><th>Rendered as</th></tr></thead><tbody>' +
      [[3, 'District A'], [4, 'District B'], [7, 'District C'], [12, 'District D']].map(function (x) {
        var sup = x[0] < state.threshold;
        return '<tr><td>' + esc(x[1]) + '</td><td class="num">' + (sup ? '<span class="muted">hidden</span>' : x[0]) + '</td><td>' + (sup ? '<span class="hm-suppress">' + icon('lock', 12) + 'Suppressed — minimum group size not met</span>' : '<span class="hm-badge is-success">Shown: ' + x[0] + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="hm-help" style="margin-top:10px">Hidden counts are never revealed through tooltips, exports, charts, or complementary totals.</p></div></div>' +
      '<div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Data quality & de-identification</h2></div><div class="hm-card__body"><dl class="hm-kv">' +
      '<dt>De-identification</dt><dd><span class="hm-badge is-success">' + icon('check', 12) + 'Applied</span></dd>' +
      '<dt>Completeness</dt><dd>96%</dd><dt>Missing fields</dt><dd>1.8% of submitted records</dd><dt>Duplicate records</dt><dd>0.4% flagged</dd>' +
      '<dt>Aggregation period</dt><dd>Daily, 24 h</dd><dt>Last processing</dt><dd>' + esc(DATA.admin.refreshed) + '</dd>' +
      '</dl><div class="hm-notice is-info" style="margin-top:14px">' + icon('info', 18) + '<div><p>Clinical and analytics data paths are logically separated; identifiable records are not exposed here.</p></div></div></div></div></div>';
    return adminShell('privacy', content, 'Privacy & Data Quality');
  }

  function adminAudit() {
    var q = state.adminQuery.toLowerCase();
    var list = DATA.admin.audit.filter(function (a) { return !q || (a.actor + a.action + a.resource + a.outcome).toLowerCase().indexOf(q) > -1; });
    var rows = list.map(function (a) {
      return '<tr><td class="muted">' + esc(a.ts) + '</td><td>' + esc(a.actor) + '</td><td>' + esc(a.role) + '</td><td>' + esc(a.org) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.resource) + '</td><td>' + badge(a.outcome === 'success' ? 'success' : a.outcome === 'denied' ? 'denied' : a.outcome === 'failure' ? 'failure' : a.outcome) + '</td></tr>';
    }).join('');
    var content = pageHead('Audit & Access Monitoring', 'Immutable, read-only audit of access and administrative actions.',
      '<button class="hm-btn hm-btn--secondary" data-action="export">' + icon('download', 15) + 'Export log</button>') +
      overviewOf('Administrative audit viewer.', 'system-wide events') +
      '<div class="hm-card"><div class="hm-card__body"><div class="hm-filterbar" style="margin-bottom:12px">' +
      '<div class="hm-search" style="min-width:240px">' + icon('search', 17) + '<input class="hm-input" type="search" id="audit-search" placeholder="Filter by actor, action, outcome" aria-label="Filter audit" value="' + esc(state.adminQuery) + '"></div>' +
      '<button class="hm-chip" aria-pressed="true">Date range</button><button class="hm-chip" aria-pressed="false">Outcome</button><button class="hm-chip" aria-pressed="false">Organization</button>' +
      '<span class="hm-badge is-error">' + icon('lock', 12) + 'Read-only</span></div>' +
      '<div class="hm-table-wrap on-mobile-cards"><table class="hm-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Role</th><th>Organization</th><th>Action</th><th>Resource</th><th>Outcome</th></tr></thead><tbody>' + (rows || '<tr><td colspan="7"><div class="hm-empty"><span class="hm-empty__icon">' + icon('list', 24) + '</span><h3 class="hm-empty__title">No audit events</h3><p class="hm-empty__text">No events match the current filter.</p></div></td></tr>') + '</tbody></table></div>' +
      '<p class="hm-help" style="margin-top:10px">Audit records cannot be edited or deleted. Sensitive payloads are not displayed.</p></div></div>';
    return adminShell('audit', content, 'Audit & Access Monitoring');
  }

  function adminOrgs() {
    var rows = DATA.admin.orgs.map(function (o) {
      return '<tr><td><button class="hm-btn hm-btn--ghost hm-btn--sm" data-nav="#/admin/org/' + o.id + '">' + esc(o.name) + '</button></td><td>' + esc(o.type) + '</td><td>' + esc(o.region) + '</td><td class="num">' + o.users + '</td><td>' + badge(o.status) + '</td></tr>';
    }).join('');
    var content = pageHead('Organizations', 'Healthcare organizations onboarded to HackMatrix and their authorization status.') +
      overviewOf('Organization registry.', 'reporting organizations') +
      '<div class="hm-card"><div class="hm-card__body"><div class="hm-table-wrap on-mobile-cards"><table class="hm-table"><thead><tr><th>Organization</th><th>Type</th><th>Region</th><th class="num">Users</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="hm-cards-mobile">' + DATA.admin.orgs.map(function (o) { return '<div class="hm-mcard"><strong>' + esc(o.name) + '</strong><dl class="hm-kv" style="margin-top:10px"><dt>Type</dt><dd>' + esc(o.type) + '</dd><dt>Region</dt><dd>' + esc(o.region) + '</dd><dt>Users</dt><dd>' + o.users + '</dd><dt>Status</dt><dd>' + badge(o.status) + '</dd></dl></div>'; }).join('') + '</div></div></div>';
    return adminShell('orgs', content, 'Organizations');
  }

  function adminOrg(id) {
    var o = DATA.admin.orgs.filter(function (x) { return x.id === id; })[0];
    if (!o) return adminOrgs();
    var users = DATA.admin.users.filter(function (u) { return u.org === o.name; });
    var content = pageHead(o.name, 'Organization details, status and associated authorized users.',
      '<button class="hm-btn hm-btn--secondary" data-nav="#/admin/orgs">' + icon('back', 15) + 'All organizations</button>') +
      '<div class="hm-grid-2"><div class="hm-card"><div class="hm-card__body"><dl class="hm-kv">' +
      '<dt>Type</dt><dd>' + esc(o.type) + '</dd><dt>Region</dt><dd>' + esc(o.region) + '</dd><dt>Status</dt><dd>' + badge(o.status) + '</dd><dt>Authorized users</dt><dd>' + o.users + '</dd>' +
      '</dl></div></div>' +
      '<div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Associated users</h2></div><div class="hm-card__body"><ul class="hm-list">' +
      (users.length ? users.map(function (u) { return '<li class="hm-row"><span class="hm-row__icon">' + icon('user', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">' + esc(u.name) + '</span><span class="hm-row__meta">' + esc(u.role) + '</span></span><span class="hm-row__end">' + badge(u.status) + '</span></li>'; }).join('') : '<p class="hm-help">No users listed in the demo set for this organization.</p>') +
      '</ul></div></div></div>';
    return adminShell('orgs', content, 'Organization');
  }

  function adminUsers() {
    var rows = DATA.admin.users.map(function (u) {
      return '<tr><td>' + esc(u.name) + '</td><td><span class="hm-badge ' + (u.role === 'ADMIN' ? 'is-brand' : u.role === 'CLINICIAN' ? 'is-info' : 'is-neutral') + '">' + esc(u.role) + '</span></td><td>' + esc(u.org) + '</td><td>' + badge(u.status) + '</td></tr>';
    }).join('');
    var content = pageHead('Users & Roles', 'Role assignment happens only through a trusted server-side workflow. Administrators cannot self-assign privileges here.') +
      overviewOf('User and role administration.', 'registered accounts') +
      '<div class="hm-notice is-warning">' + icon('lock', 18) + '<div><p class="hm-notice__title">Server-authoritative roles</p><p>This console is read-only for roles. Authorization decisions are never stored in the browser or enforced by hidden buttons.</p></div></div>' +
      '<div class="hm-card" style="margin-top:14px"><div class="hm-card__body"><div class="hm-table-wrap on-mobile-cards"><table class="hm-table"><thead><tr><th>User</th><th>Role</th><th>Organization</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="hm-cards-mobile">' + DATA.admin.users.map(function (u) { return '<div class="hm-mcard"><strong>' + esc(u.name) + '</strong><dl class="hm-kv" style="margin-top:10px"><dt>Role</dt><dd>' + esc(u.role) + '</dd><dt>Organization</dt><dd>' + esc(u.org) + '</dd><dt>Status</dt><dd>' + badge(u.status) + '</dd></dl></div>'; }).join('') + '</div></div></div>';
    return adminShell('users', content, 'Users & Roles');
  }

  function adminStatus() {
    var content = pageHead('System Status', 'Operational health from safe readiness endpoints. No credentials or connection strings are ever displayed.') +
      '<div class="hm-grid-3">' + DATA.admin.status.map(function (s) {
        return '<div class="hm-card"><div class="hm-card__body"><div class="hm-row" style="border-bottom:0;padding:0"><span class="hm-row__icon ' + (s.state === 'operational' ? 'is-success' : 'is-warning') + '">' + icon(s.state === 'operational' ? 'checkCircle' : 'alert', 18) + '</span><span class="hm-row__body"><span class="hm-row__title">' + esc(s.name) + '</span><span class="hm-row__meta">' + esc(s.detail) + '</span></span></div><div style="margin-top:12px">' + badge(s.state) + '</div></div></div>';
      }).join('') + '</div>' +
      '<div class="hm-card" style="margin-top:16px"><div class="hm-card__body"><dl class="hm-kv"><dt>WebSocket (Socket.IO)</dt><dd>Connected · change-stream events</dd><dt>Last ETL run</dt><dd>' + esc(DATA.admin.refreshed) + '</dd><dt>Data freshness</dt><dd>Within SLA</dd></dl></div></div>';
    return adminShell('status', content, 'System Status');
  }

  function adminSettings() {
    var content = pageHead('Settings', 'Administrator console preferences. Changes affecting policy are applied by the backend.') +
      '<div class="hm-grid-2"><div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Console</h2></div><div class="hm-card__body"><div class="od-stack" style="gap:14px">' +
      '<label class="hm-check"><input type="checkbox" checked> Collapse sidebar by default</label>' +
      '<label class="hm-check"><input type="checkbox" checked> Show data-freshness banners</label>' +
      '<label class="hm-check"><input type="checkbox"> Enable high-contrast charts</label>' +
      '<div class="hm-field"><label class="hm-label" for="set-tz">Timezone</label><select class="hm-select" id="set-tz"><option>Asia/Kolkata (IST)</option><option>UTC</option></select></div>' +
      '</div></div></div>' +
      '<div class="hm-card"><div class="hm-card__head"><h2 class="hm-card__title">Privacy defaults</h2></div><div class="hm-card__body"><dl class="hm-kv"><dt>Suppression threshold (k)</dt><dd>' + DATA.admin.k + '</dd><dt>Aggregation</dt><dd>Daily</dd><dt>Export</dt><dd>Aggregate only</dd></dl>' +
      '<div class="hm-notice is-info" style="margin-top:12px">' + icon('info', 18) + '<div><p>Privacy defaults mirror the backend configuration; this prototype does not enforce them.</p></div></div></div></div></div>';
    return adminShell('settings', content, 'Settings');
  }

  /* ---------------- mobile tabbars ---------------- */
  function phoneTabs(ws, active) {
    var tabs = ws === 'patient' ? [
      { k: 'home', l: 'Home', i: 'home' }, { k: 'records', l: 'Records', i: 'records' },
      { k: 'access', l: 'Access', i: 'shield' }, { k: 'profile', l: 'Profile', i: 'user' }
    ] : [
      { k: 'dashboard', l: 'Dashboard', i: 'grid' }, { k: 'scan', l: 'Scan', i: 'scan' },
      { k: 'patients', l: 'Patients', i: 'users' }, { k: 'profile', l: 'Profile', i: 'user' }
    ];
    return tabs.map(function (t) {
      return '<button class="hm-app-nav__item" ' + (active === t.k ? 'aria-current="true"' : '') + ' data-nav="#/' + ws + '/' + t.k + '">' + icon(t.i, 21) + '<span>' + esc(t.l) + '</span></button>';
    }).join('');
  }

  /* ---------------- render ---------------- */
  function phoneScreen(ws, view, arg) {
    var v = view || (ws === 'patient' ? 'home' : 'dashboard');
    var activeTab = v;
    var html;
    if (ws === 'patient') {
      if (v === 'records') html = patientRecords();
      else if (v === 'record') html = patientRecord(arg);
      else if (v === 'access') html = patientAccess();
      else if (v === 'grant') html = patientGrant(arg);
      else if (v === 'new-grant') { html = newGrant(); activeTab = 'access'; }
      else if (v === 'qr') { html = patientQR(); activeTab = 'home'; }
      else if (v === 'history') { html = patientHistory(); activeTab = 'access'; }
      else if (v === 'profile') html = patientProfile();
      else html = patientHome();
    } else {
      if (v === 'scan') html = clinicianScan();
      else if (v === 'patients') html = clinicianPatients();
      else if (v === 'patient') { html = clinicianPatient(); activeTab = 'patients'; }
      else if (v === 'records') { html = clinicianRecords(); activeTab = 'patients'; }
      else if (v === 'history') { html = clinicianHistory(); activeTab = 'dashboard'; }
      else if (v === 'emergency') { html = clinicianEmergency(); activeTab = 'dashboard'; }
      else if (v === 'profile') html = clinicianProfile();
      else html = clinicianDashboard();
    }
    return { html: html, tab: activeTab };
  }

  function adminScreen(view) {
    switch (view) {
      case 'surveillance': return adminSurveillance();
      case 'predictive': return adminPredictive();
      case 'geo': return adminGeo();
      case 'facilities': return adminFacilities();
      case 'privacy': return adminPrivacy();
      case 'audit': return adminAudit();
      case 'orgs': return adminOrgs();
      case 'org': return adminOrg(currentRoute.arg);
      case 'users': return adminUsers();
      case 'status': return adminStatus();
      case 'settings': return adminSettings();
      default: return adminOverview();
    }
  }

  var currentRoute = { ws: 'welcome', view: '', arg: '' };

  function render() {
    currentRoute = parseRoute();
    state.ws = currentRoute.ws;
    var welcome = byId('welcome-stage'), phone = byId('phone-stage'), web = byId('web-stage');
    welcome.hidden = phone.hidden = web.hidden = true;
    welcome.style.display = phone.style.display = web.style.display = 'none';

    if (currentRoute.ws === 'patient' || currentRoute.ws === 'clinician') {
      phone.hidden = false;
      phone.style.display = 'grid';
      var res = phoneScreen(currentRoute.ws, currentRoute.view, currentRoute.arg);
      byId('phone-app').innerHTML = res.html;
      var tabs = byId('phone-tabbar');
      tabs.hidden = false;
      tabs.innerHTML = phoneTabs(currentRoute.ws, res.tab);
      byId('phone-content').classList.add('with-nav');
      updateDemoTabs(currentRoute.ws);
    } else if (currentRoute.ws === 'admin') {
      web.hidden = false;
      web.style.display = 'block';
      byId('web-stage').innerHTML = adminScreen(currentRoute.view || 'overview');
      updateDemoTabs('admin');
    } else {
      welcome.hidden = false;
      welcome.style.display = 'block';
      updateDemoTabs('welcome');
    }
    window.scrollTo(0, 0);
    var scroller = byId('phone-content'); if (scroller) scroller.scrollTop = 0;
    var webc = qs('.hm-admin__content'); if (webc) webc.scrollTop = 0;
  }

  function updateDemoTabs(ws) {
    Array.prototype.forEach.call(document.querySelectorAll('.demo-tab'), function (b) {
      b.setAttribute('aria-current', String(b.getAttribute('data-ws') === ws));
    });
  }

  /* ---------------- toasts, modal, drawer, overlay ---------------- */
  function toast(kind, title, text) {
    var box = byId('toasts');
    var el = document.createElement('div');
    el.className = 'hm-toast is-' + (kind || 'info');
    el.setAttribute('role', 'status');
    el.innerHTML = icon(kind === 'success' ? 'checkCircle' : kind === 'error' ? 'xCircle' : 'info', 18) +
      '<div><div class="hm-toast__title">' + esc(title) + '</div>' + (text ? '<div class="hm-toast__text">' + esc(text) + '</div>' : '') + '</div>';
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 4200);
  }
  function openModal(html) {
    var o = byId('overlay');
    o.innerHTML = '<div class="hm-scrim">' + html + '</div>';
    var scrim = qs('.hm-scrim', o);
    if (scrim) scrim.addEventListener('click', function (e) { if (e.target === scrim) closeModal(); });
  }
  function closeModal() { byId('overlay').innerHTML = ''; }

  function revokeModal(id) {
    var g = DATA.grants.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    openModal('<div class="hm-modal" role="dialog" aria-modal="true" aria-labelledby="rv-t"><div class="hm-modal__head"><h2 class="hm-modal__title" id="rv-t">Revoke access?</h2><p class="muted" style="margin:0">' + esc(g.recipient) + ' will lose access to ' + esc(g.scope.join(', ')) + '.</p></div>' +
      '<div class="hm-modal__body"><div class="hm-notice is-warning">' + icon('alert', 18) + '<div><p>Revocation is confirmed only after the server reports success. This prototype simulates that result.</p></div></div></div>' +
      '<div class="hm-modal__foot"><button class="hm-btn hm-btn--secondary" data-action="overlay-close">Cancel</button><button class="hm-btn hm-btn--danger" data-action="confirm-revoke" data-grant="' + id + '">' + icon('x', 15) + 'Revoke access</button></div></div>');
  }

  function runRevoke(id, btn) {
    if (btn) { btn.classList.add('hm-btn--loading'); btn.disabled = true; }
    setTimeout(function () {
      var g = DATA.grants.filter(function (x) { return x.id === id; })[0];
      if (g) { g.status = 'revoked'; g.expires = 'Revoked just now'; }
      closeModal();
      toast('success', 'Access revoked (simulated)', 'The backend result was confirmed in this demo. No real data was changed.');
      render();
    }, 750);
  }

  /* ---------------- events ---------------- */
  function closestAction(el) { while (el && el !== document.body) { if (el.hasAttribute && (el.hasAttribute('data-action') || el.hasAttribute('data-nav'))) return el; el = el.parentNode; } return null; }

  document.addEventListener('click', function (e) {
    var t = closestAction(e.target);
    if (!t) return;
    if (t.hasAttribute('data-nav')) { e.preventDefault(); go(t.getAttribute('data-nav')); return; }
    var a = t.getAttribute('data-action');
    switch (a) {
      case 'theme': applyTheme(t.getAttribute('data-value')); break;
      case 'overlay-close': closeModal(); break;
      case 'revoke': revokeModal(t.getAttribute('data-grant')); break;
      case 'confirm-revoke': runRevoke(t.getAttribute('data-grant'), t); break;
      case 'grant-step': state.grantStep = parseInt(t.getAttribute('data-value'), 10) || 1; render(); break;
      case 'confirm-grant': {
        DATA.grants.unshift({
          id: 'g' + (DATA.grants.length + 1),
          recipient: 'Dr. Neha Kapoor',
          role: 'Primary care physician',
          org: 'Sunrise Multispecialty Hospital',
          scope: ['Encounters', 'Observations'],
          purpose: 'Ongoing care management',
          start: 'Today',
          expires: 'In 30 days',
          status: 'active'
        });
        toast('success', 'Access Grant Created', 'Dr. Neha Kapoor granted access for 30 days.');
        state.grantStep = 1;
        state.accessTab = 'active';
        go('#/patient/access');
        break;
      }
      case 'access-tab': state.accessTab = t.getAttribute('data-value'); render(); break;
      case 'records-cat': state.recordsCat = t.getAttribute('data-value'); render(); break;
      case 'records-clear': state.recordsCat = 'all'; state.recordsQuery = ''; render(); break;
      case 'qr-copy': {
        navigator.clipboard.writeText(state.qrToken).then(function () {
          toast('success', 'Token Copied', 'Token ' + state.qrToken + ' copied to clipboard.');
        }).catch(function () {
          toast('info', 'Auth Token', state.qrToken);
        });
        break;
      }
      case 'qr-refresh': state.qrToken = 'HMX-QR-DEMO-' + Math.random().toString(16).slice(2, 8).toUpperCase(); state.qrCreated = Date.now(); render(); toast('info', 'QR regenerated', 'A new short-lived demo reference was issued.'); break;
      case 'patient-add-record': {
        openModal('<div class="hm-modal" style="max-width:440px;"><div class="hm-modal__head"><h2 class="hm-modal__title">Add Health Observation</h2><p class="muted" style="margin:0">Self-reported patient record</p></div>' +
          '<div class="hm-modal__body">' +
          '<div class="hm-field"><label class="hm-label">Category</label><select class="hm-select" id="pat-rec-cat"><option value="observations">Observations / Vitals</option><option value="medications">Medication Log</option><option value="careplans">Care Notes / Diary</option></select></div>' +
          '<div class="hm-field"><label class="hm-label">Observation Title</label><input class="hm-input" id="pat-rec-title" value="Blood Glucose Reading" placeholder="e.g. Fasting Blood Sugar" /></div>' +
          '<div class="hm-field"><label class="hm-label">Summary / Value</label><textarea class="hm-textarea" id="pat-rec-summary" rows="3">Fasting blood sugar 94 mg/dL recorded using home glucometer before breakfast.</textarea></div>' +
          '</div>' +
          '<div class="hm-modal__foot"><button class="hm-btn hm-btn--secondary" data-action="overlay-close">Cancel</button><button class="hm-btn hm-btn--primary" data-action="confirm-patient-record">' + icon('check', 15) + 'Save Record</button></div></div>');
        break;
      }
      case 'confirm-patient-record': {
        var pcat = (byId('pat-rec-cat') && byId('pat-rec-cat').value) || 'observations';
        var ptitle = (byId('pat-rec-title') && byId('pat-rec-title').value) || 'Health Observation';
        var psum = (byId('pat-rec-summary') && byId('pat-rec-summary').value) || 'Observation recorded';
        var pnow = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        DATA.records.unshift({
          id: 'r' + (DATA.records.length + 1),
          cat: pcat,
          type: ptitle,
          date: pnow,
          facility: 'Personal Health Device',
          clinician: 'Ananya Sharma (Self-Reported)',
          summary: psum,
          status: 'Active',
          updated: pnow + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fields: [{ k: 'Self-reported', v: 'Yes' }, { k: 'Status', v: 'Verified' }]
        });
        if (pcat === 'observations') {
          DATA.vitals.unshift({ label: ptitle, value: psum.slice(0, 16), unit: 'mg/dL', time: 'Just now' });
        }
        closeModal();
        toast('success', 'Health Record Added', 'Self-reported health observation committed to your personal record.');
        go('#/patient/records');
        break;
      }
      case 'add-diagnosis': {
        openModal('<div class="hm-modal" style="max-width:440px;"><div class="hm-modal__head"><h2 class="hm-modal__title">Record Diagnosis &amp; Encounter</h2><p class="muted" style="margin:0">Meera Nair (HMX-P-31877)</p></div>' +
          '<div class="hm-modal__body">' +
          '<div class="hm-field"><label class="hm-label">Category</label><select class="hm-select" id="diag-cat"><option value="encounters">Clinical Encounter &amp; Diagnosis</option><option value="observations">Vital Signs / Lab Observation</option></select></div>' +
          '<div class="hm-field"><label class="hm-label">Syndrome / Disease</label><select class="hm-select" id="diag-syndrome"><option value="ili">Influenza-like illness (Flu / Viral ARI)</option><option value="dengue">Vector-borne (Dengue)</option><option value="add">Acute Diarrheal Disease (ADD)</option><option value="cardio">Cardiovascular Emergency</option></select></div>' +
          '<div class="hm-field"><label class="hm-label">Diagnosis Note</label><textarea class="hm-textarea" id="diag-summary" rows="3">Patient diagnosed with acute viral respiratory infection with fever 38.8C and dry cough. Prescribed antipyretics and quarantine rest.</textarea></div>' +
          '</div>' +
          '<div class="hm-modal__foot"><button class="hm-btn hm-btn--secondary" data-action="overlay-close">Cancel</button><button class="hm-btn hm-btn--primary" data-action="confirm-diagnosis">' + icon('check', 15) + 'Commit Diagnosis</button></div></div>');
        break;
      }
      case 'confirm-diagnosis': {
        var syn = (byId('diag-syndrome') && byId('diag-syndrome').value) || 'ili';
        var sum = (byId('diag-summary') && byId('diag-summary').value) || 'Acute clinical consultation';
        var cat = (byId('diag-cat') && byId('diag-cat').value) || 'encounters';
        var nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        DATA.records.unshift({
          id: 'r' + (DATA.records.length + 1),
          cat: cat,
          type: 'Clinical diagnosis (' + syn.toUpperCase() + ')',
          date: nowStr,
          facility: 'Sunrise Multispecialty Hospital',
          clinician: 'Dr. Rohit Verma',
          summary: sum,
          status: 'Completed',
          updated: nowStr + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fields: [{ k: 'Syndrome', v: syn.toUpperCase() }, { k: 'Physician', v: 'Dr. Rohit Verma' }]
        });
        if (DATA.admin && DATA.admin.trend && DATA.admin.trend[syn]) {
          DATA.admin.trend[syn][DATA.admin.trend[syn].length - 1] += 1;
        }
        closeModal();
        toast('success', 'Diagnosis Committed', 'New diagnosis saved and public health surveillance registry updated in real time.');
        go('#/clinician/records/p1');
        break;
      }
      case 'scan': {
        var v = t.getAttribute('data-value'); state.scanState = v; render();
        if (v === 'scanning') setTimeout(function () { state.scanState = 'idle'; go('#/clinician/patient/p1'); toast('success', 'Access Granted', 'Cryptographic token verified. Records unlocked under active consent grant.'); }, 900);
        break;
      }
      case 'emergency-submit': {
        var ta = byId('em-reason');
        if (!ta || ta.value.trim().length < 10) { var er = byId('em-error'); if (er) er.hidden = false; if (ta) ta.focus(); break; }
        toast('warning', 'Emergency Break-Glass Logged', 'Emergency access granted and recorded to immutable HMAC audit ledger.');
        go('#/clinician/patient/p1');
        break;
      }
      case 'period': state.period = parseInt(t.getAttribute('data-value'), 10); render(); break;
      case 'threshold': state.threshold = parseInt(t.getAttribute('data-value'), 10); render(); break;
      case 'admin-page': state.adminPage = parseInt(t.getAttribute('data-value'), 10); render(); break;
      case 'admin-collapse': state.collapsed = !state.collapsed; render(); break;
      case 'refresh':
        toast('info', 'Refreshing…', 'Reloading demo aggregates.');
        render();
        break;
      case 'export': toast('info', 'Export (demo)', 'Aggregate-only export. Suppressed values remain suppressed.'); break;
      case 'notify': toast('info', 'Notifications', 'You are all caught up (demo).'); break;
      case 'signout': toast('info', 'Signed out (demo)', 'Clerk sign-out is simulated in this prototype.'); state.collapsed = false; go('#/'); break;
      default: break;
    }
  });

  document.addEventListener('input', function (e) {
    var id = e.target && e.target.id;
    if (!id) return;
    if (id === 'records-search') { state.recordsQuery = e.target.value; var pos = e.target.selectionStart; render(); var el = byId('records-search'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) {} } }
    else if (id === 'clin-search') { state.adminQuery = e.target.value; render(); var c = byId('clin-search'); if (c) c.focus(); }
    else if (id === 'fac-search') { state.adminQuery = e.target.value; state.adminPage = 1; render(); var f = byId('fac-search'); if (f) f.focus(); }
    else if (id === 'audit-search') { state.adminQuery = e.target.value; render(); var au = byId('audit-search'); if (au) au.focus(); }
  });
  document.addEventListener('change', function (e) {
    var id = e.target && e.target.id;
    if (id === 'sc-disease') { state.disease = e.target.value; render(); }
    else if (id === 'sc-region') { state.adminRegion = e.target.value; toast('info', 'Region filter', 'Filtered to ' + e.target.value + ' (demo).'); render(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target && e.target.id === 'em-reason' && (e.ctrlKey || e.metaKey)) { var b = qs('[data-action="emergency-submit"]'); if (b) b.click(); }
  });

  window.addEventListener('hashchange', render);

  /* ---------------- Unified Gateway Hub Authentication ---------------- */
  /* ---------------- Unified Gateway Hub Authentication (Combined Login & Registration) ---------------- */
  function initGatewayAuth() {
    var modeLoginBtn = byId('auth-mode-login-btn');
    var modeRegisterBtn = byId('auth-mode-register-btn');
    var paneLogin = byId('pane-login-section');
    var paneRegister = byId('pane-register-section');
    var errorBanner = byId('gateway-auth-error');
    var gotoRegisterBtn = byId('btn-goto-register');
    var gotoLoginBtn = byId('btn-goto-login');

    if (!paneLogin && !paneRegister) return;

    function showError(msg) {
      if (errorBanner) {
        errorBanner.textContent = msg;
        errorBanner.style.display = 'block';
      }
    }

    function clearError() {
      if (errorBanner) {
        errorBanner.textContent = '';
        errorBanner.style.display = 'none';
      }
    }

    // --- Mode Switching ---
    function switchMode(mode) {
      clearError();
      if (mode === 'login') {
        if (modeLoginBtn) {
          modeLoginBtn.style.background = '#0F766E';
          modeLoginBtn.style.color = '#fff';
          modeLoginBtn.style.fontWeight = '700';
        }
        if (modeRegisterBtn) {
          modeRegisterBtn.style.background = 'transparent';
          modeRegisterBtn.style.color = 'rgba(255,255,255,0.7)';
          modeRegisterBtn.style.fontWeight = '600';
        }
        if (paneLogin) paneLogin.style.display = 'block';
        if (paneRegister) paneRegister.style.display = 'none';
      } else {
        if (modeRegisterBtn) {
          modeRegisterBtn.style.background = '#0F766E';
          modeRegisterBtn.style.color = '#fff';
          modeRegisterBtn.style.fontWeight = '700';
        }
        if (modeLoginBtn) {
          modeLoginBtn.style.background = 'transparent';
          modeLoginBtn.style.color = 'rgba(255,255,255,0.7)';
          modeLoginBtn.style.fontWeight = '600';
        }
        if (paneLogin) paneLogin.style.display = 'none';
        if (paneRegister) paneRegister.style.display = 'block';
      }
    }

    if (modeLoginBtn) modeLoginBtn.addEventListener('click', function () { switchMode('login'); });
    if (modeRegisterBtn) modeRegisterBtn.addEventListener('click', function () { switchMode('register'); });
    if (gotoRegisterBtn) gotoRegisterBtn.addEventListener('click', function () { switchMode('register'); });
    if (gotoLoginBtn) gotoLoginBtn.addEventListener('click', function () { switchMode('login'); });

    // --- Password Show / Hide Toggles ---
    var btnToggleLoginPass = byId('btn-toggle-login-pass');
    var inputLoginPass = byId('gateway-password');
    if (btnToggleLoginPass && inputLoginPass) {
      btnToggleLoginPass.addEventListener('click', function () {
        var isPass = inputLoginPass.getAttribute('type') === 'password';
        inputLoginPass.setAttribute('type', isPass ? 'text' : 'password');
        btnToggleLoginPass.innerHTML = isPass ?
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' :
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>';
      });
    }

    var btnToggleRegPass = byId('btn-toggle-reg-pass');
    var inputRegPass = byId('reg-password');
    if (btnToggleRegPass && inputRegPass) {
      btnToggleRegPass.addEventListener('click', function () {
        var isPass = inputRegPass.getAttribute('type') === 'password';
        inputRegPass.setAttribute('type', isPass ? 'text' : 'password');
        btnToggleRegPass.innerHTML = isPass ?
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' :
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>';
      });
    }

    // --- Login Role Switching ---
    var selectedLoginRole = 'PATIENT';
    var btnPatient = byId('gateway-role-patient');
    var btnClinician = byId('gateway-role-clinician');
    var btnAdmin = byId('gateway-role-admin');
    var labelEmail = byId('gateway-label-email');
    var inputEmail = byId('gateway-email');
    var btnSubmitLogin = byId('gateway-submit-btn');

    function updateLoginRoleUI(role) {
      selectedLoginRole = role;
      [btnPatient, btnClinician, btnAdmin].forEach(function (b) {
        if (!b) return;
        b.style.background = 'transparent';
        b.style.color = 'rgba(255,255,255,0.7)';
        b.classList.remove('active');
      });

      if (role === 'PATIENT') {
        if (btnPatient) {
          btnPatient.style.background = '#0F766E';
          btnPatient.style.color = '#fff';
          btnPatient.classList.add('active');
        }
        if (labelEmail) labelEmail.textContent = 'Email Address or Patient ID / ABHA';
        if (inputEmail) inputEmail.placeholder = 'e.g. ananya.sharma@hackmatrix.demo or HMX-P-20481';
        if (btnSubmitLogin) {
          btnSubmitLogin.style.background = '#0F766E';
          btnSubmitLogin.textContent = 'Sign In as Patient / User';
        }
      } else if (role === 'CLINICIAN') {
        if (btnClinician) {
          btnClinician.style.background = '#2563EB';
          btnClinician.style.color = '#fff';
          btnClinician.classList.add('active');
        }
        if (labelEmail) labelEmail.textContent = 'Hospital Email or Practitioner ID';
        if (inputEmail) inputEmail.placeholder = 'e.g. rohit.verma@hackmatrix.demo or HMX-C-7781';
        if (btnSubmitLogin) {
          btnSubmitLogin.style.background = '#2563EB';
          btnSubmitLogin.textContent = 'Sign In as Clinician';
        }
      } else if (role === 'ADMIN') {
        if (btnAdmin) {
          btnAdmin.style.background = '#D97706';
          btnAdmin.style.color = '#fff';
          btnAdmin.classList.add('active');
        }
        if (labelEmail) labelEmail.textContent = 'Administrator Username or Official Email';
        if (inputEmail) inputEmail.placeholder = 'e.g. admin.rao@hackmatrix.demo or admin';
        if (btnSubmitLogin) {
          btnSubmitLogin.style.background = '#D97706';
          btnSubmitLogin.textContent = 'Sign In as Administrator';
        }
      }
      clearError();
    }

    if (btnPatient) btnPatient.addEventListener('click', function () { updateLoginRoleUI('PATIENT'); });
    if (btnClinician) btnClinician.addEventListener('click', function () { updateLoginRoleUI('CLINICIAN'); });
    if (btnAdmin) btnAdmin.addEventListener('click', function () { updateLoginRoleUI('ADMIN'); });

    // --- Login Form Submit ---
    var loginForm = byId('gateway-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          clearError();
          btnSubmitLogin.disabled = true;
          btnSubmitLogin.textContent = 'Authenticating Credentials...';

          var emailVal = inputEmail.value.trim();
          var passVal = inputLoginPass.value;

          var api = window.HmxApi;
          if (!api) throw new Error('API client not initialized');

          await api.login(emailVal, passVal, selectedLoginRole);

          if (selectedLoginRole === 'PATIENT') {
            window.location.href = 'patient.html';
          } else if (selectedLoginRole === 'CLINICIAN') {
            window.location.href = 'clinician.html';
          } else if (selectedLoginRole === 'ADMIN') {
            window.location.href = 'admin.html';
          }
        } catch (err) {
          showError((err && err.message) || 'Login failed. Please verify credentials.');
        } finally {
          btnSubmitLogin.disabled = false;
          updateLoginRoleUI(selectedLoginRole);
        }
      });
    }

    // --- Registration Role Switching ---
    var selectedRegRole = 'PATIENT';
    var regRolePatient = byId('reg-role-patient');
    var regRoleClinician = byId('reg-role-clinician');
    var regPatientSpecific = byId('reg-patient-specific');
    var regClinicianSpecific = byId('reg-clinician-specific');
    var btnSubmitReg = byId('gateway-reg-submit-btn');

    function updateRegRoleUI(role) {
      selectedRegRole = role;
      if (role === 'PATIENT') {
        if (regRolePatient) {
          regRolePatient.style.background = '#0F766E';
          regRolePatient.style.color = '#fff';
          regRolePatient.classList.add('active');
        }
        if (regRoleClinician) {
          regRoleClinician.style.background = 'transparent';
          regRoleClinician.style.color = 'rgba(255,255,255,0.7)';
          regRoleClinician.classList.remove('active');
        }
        if (regPatientSpecific) regPatientSpecific.style.display = 'block';
        if (regClinicianSpecific) regClinicianSpecific.style.display = 'none';
        if (btnSubmitReg) {
          btnSubmitReg.style.background = '#0F766E';
          btnSubmitReg.textContent = 'Register & Access Patient Portal';
        }
      } else {
        if (regRoleClinician) {
          regRoleClinician.style.background = '#2563EB';
          regRoleClinician.style.color = '#fff';
          regRoleClinician.classList.add('active');
        }
        if (regRolePatient) {
          regRolePatient.style.background = 'transparent';
          regRolePatient.style.color = 'rgba(255,255,255,0.7)';
          regRolePatient.classList.remove('active');
        }
        if (regPatientSpecific) regPatientSpecific.style.display = 'none';
        if (regClinicianSpecific) regClinicianSpecific.style.display = 'block';
        if (btnSubmitReg) {
          btnSubmitReg.style.background = '#2563EB';
          btnSubmitReg.textContent = 'Register & Access Clinician Portal';
        }
      }
      clearError();
    }

    if (regRolePatient) regRolePatient.addEventListener('click', function () { updateRegRoleUI('PATIENT'); });
    if (regRoleClinician) regRoleClinician.addEventListener('click', function () { updateRegRoleUI('CLINICIAN'); });

    // --- Registration Form Submit ---
    var regForm = byId('gateway-register-form');
    if (regForm) {
      regForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
          clearError();

          var name = byId('reg-name').value.trim();
          var email = byId('reg-email').value.trim();
          var pass = byId('reg-password').value;
          var passConfirm = byId('reg-password-confirm').value;

          if (!name || !email || !pass) {
            showError('Please fill in all required fields.');
            return;
          }

          if (pass.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
          }

          if (pass !== passConfirm) {
            showError('Passwords do not match. Please re-enter.');
            return;
          }

          btnSubmitReg.disabled = true;
          btnSubmitReg.textContent = 'Registering Account in MongoDB Atlas...';

          var payload = {
            name: name,
            email: email,
            password: pass,
            role: selectedRegRole
          };

          if (selectedRegRole === 'PATIENT') {
            payload.age = parseInt(byId('reg-age').value, 10) || 30;
            payload.sex = byId('reg-sex').value;
            payload.bloodType = byId('reg-blood').value;
            payload.locality = byId('reg-locality').value || 'Kothrud';
            payload.phone = byId('reg-phone').value.trim() || '+91 98000 00000';
          } else {
            payload.specialty = byId('reg-doc-specialty').value;
            payload.department = byId('reg-doc-specialty').value;
            payload.facility = byId('reg-doc-facility').value.trim() || 'Sunrise Multispecialty Hospital';
            payload.locality = byId('reg-doc-locality').value || 'Shivajinagar';
            payload.license = byId('reg-doc-license').value.trim() || 'MMC-2024-REG';
          }

          var api = window.HmxApi;
          if (!api) throw new Error('API client not initialized');

          await api.register(payload);

          // Redirect to appropriate portal
          if (selectedRegRole === 'PATIENT') {
            window.location.href = 'patient.html';
          } else {
            window.location.href = 'clinician.html';
          }
        } catch (err) {
          showError((err && err.message) || 'Registration failed. Email may already be registered.');
          btnSubmitReg.disabled = false;
          updateRegRoleUI(selectedRegRole);
        }
      });
    }
  }


  /* ---------------- boot ---------------- */
  function boot() {
    applyTheme(savedTheme());
    if (!location.hash) location.hash = '#/';
    render();
    initGatewayAuth();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
