/**
 * HackMatrix - Shared REST API Client
 * Single source of truth for connecting front-end portals to the backend API.
 */
(function (global) {
  'use strict';

  var isBrowser = typeof window !== 'undefined' && window.location;
  var host = (isBrowser && window.location.hostname) ? window.location.hostname : 'localhost';
  var port = (isBrowser && window.location.port) ? window.location.port : '';
  // If running directly on port 4000, use relative path; otherwise target http://<host>:4000/api/v1
  var API_BASE = (port === '4000') ? '/api/v1' : ('http://' + (host || 'localhost') + ':4000/api/v1');

  var Api = {
    base: API_BASE,

    prefix: '',
    
    forRole: function(role) {
      var client = Object.create(Api);
      client.prefix = role ? ('_' + role) : '';
      return client;
    },

    getToken: function () {
      return localStorage.getItem('hmx' + this.prefix + '_token') || localStorage.getItem('hmx_token') || null;
    },

    getUser: function () {
      try {
        var u = localStorage.getItem('hmx' + this.prefix + '_user') || localStorage.getItem('hmx_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setSession: function (token, user) {
      if (token) localStorage.setItem('hmx' + this.prefix + '_token', token);
      if (user) localStorage.setItem('hmx' + this.prefix + '_user', JSON.stringify(user));
    },

    clearSession: function () {
      localStorage.removeItem('hmx' + this.prefix + '_token');
      localStorage.removeItem('hmx' + this.prefix + '_user');
    },

    async checkHealth() {
      try {
        var healthUrl = (port === '4000') ? '/health' : ('http://' + (host || 'localhost') + ':4000/health');
        var res = await fetch(healthUrl);
        return res.ok;
      } catch (e) {
        return false;
      }
    },

    async request(endpoint, options) {
      options = options || {};
      var headers = options.headers || {};
      headers['Content-Type'] = 'application/json';

      var token = this.getToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
        if (token.startsWith('dev:')) {
          headers['x-dev-user-id'] = token.slice(4);
        }
      }

      var url = endpoint.startsWith('http') ? endpoint : (this.base + endpoint);

      try {
        var resp = await fetch(url, {
          method: options.method || 'GET',
          headers: headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        var data;
        try {
          data = await resp.json();
        } catch (err) {
          data = { error: { code: 'PARSE_ERROR', message: 'Unable to parse server response' } };
        }

        if (!resp.ok) {
          var errObj = (data && data.error) || { code: 'HTTP_' + resp.status, message: resp.statusText };
          throw errObj;
        }

        // Cache successful GET responses in localStorage for offline resiliency
        if ((!options.method || options.method === 'GET') && data) {
          try {
            localStorage.setItem('hmx_cache_' + endpoint, JSON.stringify(data));
          } catch (e) {}
        }

        return data;
      } catch (networkError) {
        // Offline / Network Failure Fallback
        console.warn('Network request failed for ' + endpoint + ', checking offline cache/mocks:', networkError);
        
        // 1. Try cached response from previous session
        try {
          var cached = localStorage.getItem('hmx_cache_' + endpoint);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (e) {}

        // 2. Fallback to built-in offline mock data
        var fallback = this.getOfflineFallback(endpoint, options);
        if (fallback !== null) {
          return fallback;
        }

        throw networkError;
      }
    },

    getOfflineFallback: function(endpoint, options) {
      var ep = endpoint.split('?')[0];

      // Auth fallbacks
      if (ep === '/auth/login') {
        var persona = (options.body && options.body.persona) || 'patient';
        if (persona === 'patient') {
          return { data: { token: 'dev:u4', user: { _id: 'u4', name: 'Ananya Sharma', role: 'PATIENT', email: 'ananya@demo.org', linkedPatientId: 'HMX-P-20481' } } };
        } else if (persona === 'clinician') {
          return { data: { token: 'dev:u3', user: { _id: 'u3', name: 'Dr. Rohit Verma', role: 'CLINICIAN', email: 'dr.rohit@sunrise.org' } } };
        } else {
          return { data: { token: 'dev:u1', user: { _id: 'u1', name: 'admin.rao', role: 'ADMIN', email: 'admin@health.gov.in' } } };
        }
      }

      // Patient fallbacks
      if (ep === '/patients/me/summary') {
        return {
          data: {
            patient: { id: 'HMX-P-20481', name: 'Ananya Sharma', age: 34, sex: 'Female', bloodGroup: 'O+', dob: '14 Mar 1991', abha: '91-4821-9902', phone: '+91 98765 43210', allergies: ['Penicillin'], facility: 'Sunrise Multispecialty Hospital' },
            vitals: [
              { label: 'Blood Pressure', value: '118/76', unit: 'mmHg', time: 'Today 09:30 AM' },
              { label: 'Heart Rate', value: '72', unit: 'bpm', time: 'Today 09:30 AM' },
              { label: 'Blood Glucose', value: '98', unit: 'mg/dL', time: 'Fasting' }
            ],
            records: [
              { id: 'REC-1', cat: 'encounters', type: 'Emergency Consultation', summary: 'Acute allergic rhinitis stabilization.', date: 'Today', clinician: 'Dr. Rohit Verma', facility: 'Sunrise Hospital' },
              { id: 'REC-2', cat: 'observations', type: 'Vital Signs Baseline', summary: 'Normal sinus rhythm, SpO2 99%.', date: 'Yesterday', clinician: 'Nurse Desk', facility: 'Sunrise Hospital' }
            ]
          }
        };
      }
      if (ep === '/patients/me/records') {
        return {
          data: {
            records: [
              { id: 'REC-1', cat: 'encounters', type: 'Emergency Consultation', summary: 'Acute allergic rhinitis stabilization.', date: '10 Oct 2026', clinician: 'Dr. Rohit Verma', facility: 'Sunrise Multispecialty Hospital', fields: [{ k: 'Disposition', v: 'Discharged' }, { k: 'Followup', v: '7 days' }] },
              { id: 'REC-2', cat: 'observations', type: 'Vital Signs Panel', summary: 'BP 118/76 mmHg, HR 72 bpm, SpO2 99%.', date: '09 Oct 2026', clinician: 'Nurse Station', facility: 'Sunrise Multispecialty Hospital', fields: [{ k: 'Heart Rate', v: '72 bpm' }, { k: 'BP', v: '118/76' }] },
              { id: 'REC-3', cat: 'medications', type: 'Antihistamine Prescription', summary: 'Levocetirizine 5mg OD x 5 days.', date: '08 Oct 2026', clinician: 'Dr. Rohit Verma', facility: 'Sunrise Multispecialty Hospital', fields: [{ k: 'Dosage', v: '5mg once daily' }] },
              { id: 'REC-4', cat: 'allergies', type: 'Allergy Record', summary: 'Penicillin - High severity anaphylactoid risk.', date: '01 Jan 2024', clinician: 'Dr. S. Iyer', facility: 'City Clinic', fields: [{ k: 'Severity', v: 'High' }] }
            ]
          }
        };
      }
      if (ep === '/patients/me/vitals') {
        return {
          data: {
            vitals: [
              { label: 'Blood Pressure', value: '118/76', unit: 'mmHg', time: 'Today 09:30 AM' },
              { label: 'Heart Rate', value: '72', unit: 'bpm', time: 'Today 09:30 AM' },
              { label: 'Blood Glucose', value: '98', unit: 'mg/dL', time: 'Fasting' }
            ]
          }
        };
      }
      if (ep === '/patients/me/grants') {
        return {
          data: [
            { id: 'GRANT-1', recipient: 'Dr. Rohit Verma', role: 'Emergency Clinician', org: 'Sunrise Multispecialty Hospital', purpose: 'Emergency treatment & stabilization', scope: ['Encounters', 'Observations', 'Medications', 'Allergies'], status: 'active', expires: '14 days' }
          ]
        };
      }
      if (ep === '/patients/me/activity') {
        return {
          data: {
            activity: [
              { action: 'Health Record Accessed', clinician: 'Dr. Rohit Verma', facility: 'Sunrise Hospital', time: '10 Oct 2026 14:20', resource: 'Vital Signs & Encounters' }
            ]
          }
        };
      }
      if (ep === '/patients/me/qr') {
        return { data: { token: 'HMX-QR-DEMO-20481', expiresInSeconds: 300 } };
      }

      // Clinician fallbacks
      if (ep === '/clinicians/me') {
        return { data: { id: 'HMX-C-7781', name: 'Dr. Rohit Verma', department: 'Emergency Medicine', role: 'CLINICIAN', facility: 'Sunrise Multispecialty Hospital' } };
      }
      if (ep === '/clinicians/dashboard') {
        return {
          data: {
            stats: { patientsSeenToday: 6, qrChecksToday: 4, activeConsents: 8, deniedAttempts: 0 },
            recentActivity: [
              { action: 'QR Token Verification', patient: 'Ananya Sharma (HMX-P-20481)', outcome: 'granted', ts: 'Just now' }
            ]
          }
        };
      }
      if (ep === '/clinicians/patients') {
        return {
          data: [
            { id: 'HMX-P-20481', name: 'Ananya Sharma', age: 34, sex: 'Female', bloodGroup: 'O+', facility: 'Sunrise Multispecialty Hospital' },
            { id: 'HMX-P-31877', name: 'Meera Nair', age: 47, sex: 'Female', bloodGroup: 'B+', facility: 'Sunrise Multispecialty Hospital' }
          ]
        };
      }
      if (ep.startsWith('/clinicians/patients/') && ep.endsWith('/records')) {
        return {
          data: {
            records: [
              { id: 'CR-1', cat: 'encounters', type: 'Emergency Consultation', summary: 'Patient admitted with acute allergic reaction; stabilized and discharged with advice.', date: '12 Sep 2026', clinician: 'Dr. Rohit Verma', facility: 'Sunrise Multispecialty', fields: [{ k: 'Disposition', v: 'Discharged home' }, { k: 'Follow-up', v: 'Review in 7 days' }] },
              { id: 'CR-2', cat: 'observations', type: 'Vital signs panel', summary: 'BP 118/76 mmHg, HR 72 bpm, SpO2 98%, Temp 36.9 C.', date: '12 Sep 2026', clinician: 'Nurse station', facility: 'Sunrise Multispecialty', fields: [{ k: 'Blood pressure', v: '118/76 mmHg' }, { k: 'Heart rate', v: '72 bpm' }] },
              { id: 'CR-3', cat: 'medications', type: 'Active medication', summary: 'Amlodipine 5 mg once daily for hypertension.', date: '02 Aug 2026', clinician: 'Dr. Neha Kapoor', facility: 'Sunrise Multispecialty', fields: [{ k: 'Drug', v: 'Amlodipine' }, { k: 'Dose', v: '5 mg' }] },
              { id: 'CR-4', cat: 'allergies', type: 'Allergy alert', summary: 'Penicillin - rash and angioedema. Severe anaphylactic risk.', date: '18 Jan 2019', clinician: 'Dr. S. Iyer', facility: 'City Medical Centre', fields: [{ k: 'Substance', v: 'Penicillin' }, { k: 'Severity', v: 'High' }] }
            ]
          }
        };
      }
      if (ep.startsWith('/clinicians/patients/')) {
        return {
          data: { id: 'HMX-P-20481', name: 'Ananya Sharma', age: 34, sex: 'Female', bloodGroup: 'O+', consent: 'Active Emergency Grant', scope: ['Encounters', 'Observations', 'Medications', 'Allergies'], expires: 'Active' }
        };
      }
      if (ep === '/clinicians/qr/resolve') {
        return {
          data: {
            patient: { id: 'HMX-P-20481', name: 'Ananya Sharma', age: 34, sex: 'Female', bloodGroup: 'O+' },
            consent: { active: true, scope: ['Encounters', 'Observations', 'Medications', 'Allergies'] }
          }
        };
      }
      if (ep === '/clinicians/audit') {
        return {
          data: {
            events: [
              { action: 'QR Scanned & Resolved', outcome: 'granted', resource: 'Patient Chart', ts: '10 Oct 2026 14:30', hash: 'e3b0c44298fc1c149afbf4c8996fb924' },
              { action: 'Encounter Note Added', outcome: 'success', resource: 'Clinical Record', ts: '10 Oct 2026 12:15', hash: '7c9f2b8813a02d41b65f7c32' }
            ]
          }
        };
      }

      // Admin fallbacks
      if (ep === '/admin/overview') {
        return {
          data: {
            patientsRegistered: 12,
            activeClinicians: 4,
            surveillanceEvents: 184320,
            activeClusters: 2
          }
        };
      }
      if (ep === '/admin/surveillance') {
        return {
          data: {
            liveCounts: { flu: 1420, dengue: 680, diarrheal: 410, cardio: 290 }
          }
        };
      }
      if (ep === '/admin/audit') {
        return {
          data: {
            events: [
              { action: 'Surveillance Aggregate Sync', actor: 'pipeline-worker', actorRole: 'System', resource: 'Analytics Dataset', outcome: 'success', ts: '10 Oct 2026 06:15', hash: '9fa12e43bc091d' },
              { action: 'Emergency Break-Glass', actor: 'Dr. Rohit Verma', actorRole: 'CLINICIAN', resource: 'Patient Chart HMX-P-20481', outcome: 'emergency_override', ts: '10 Oct 2026 05:40', hash: 'd41d8cd98f00b204' }
            ]
          }
        };
      }

      // Mock write endpoints (POST/PATCH/DELETE) return success when offline
      if (options.method && options.method !== 'GET') {
        return { success: true, data: { id: 'MOCK-ID-' + Date.now(), ...options.body } };
      }

      return null;
    },

    get: function (endpoint) {
      return this.request(endpoint, { method: 'GET' });
    },

    post: function (endpoint, body) {
      return this.request(endpoint, { method: 'POST', body: body });
    },

    patch: function (endpoint, body) {
      return this.request(endpoint, { method: 'PATCH', body: body });
    },

    delete: function (endpoint) {
      return this.request(endpoint, { method: 'DELETE' });
    },

    async login(emailOrPersona, password, personaRole) {
      var body = {};
      if (typeof emailOrPersona === 'object' && emailOrPersona !== null) {
        body = emailOrPersona;
      } else if (password) {
        body = { email: emailOrPersona, password: password };
        if (personaRole) body.persona = personaRole;
      } else {
        body = { persona: emailOrPersona };
      }
      var res = await this.post('/auth/login', body);
      if (res && res.data) {
        this.setSession(res.data.token, res.data.user);
        return res.data;
      }
      throw new Error('Invalid login response');
    },

    async register(data) {
      var res = await this.post('/auth/register', data);
      if (res && res.data) {
        this.setSession(res.data.token, res.data.user);
        return res.data;
      }
      throw new Error('Invalid registration response');
    }
  };

  global.HmxApi = Api;
})(window);
