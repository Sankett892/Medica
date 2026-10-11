/**
 * HackMatrix - Dedicated Clinician Portal Logic
 * Connected to live backend at http://localhost:4000/api/v1
 */
(function () {
  'use strict';

  var api = window.HmxApi.forRole('clinician');

  // DOM elements
  var authView = document.getElementById('clinician-auth-view');
  var appView = document.getElementById('clinician-app-view');
  var viewRoot = document.getElementById('clinician-view-root');
  var quickLoginBtn = document.getElementById('btn-quick-clinician-login');
  var loginForm = document.getElementById('clinician-login-form');
  var errorBanner = document.getElementById('clinician-error-banner');
  var overlay = document.getElementById('overlay');
  var toasts = document.getElementById('toasts');

  // State
  var state = {
    user: null,
    profile: null,
    dashboard: null,
    currentView: 'dashboard',
    selectedPatient: null,
    patientRecords: [],
    patientsList: [],
    auditLogs: [],
    pollInterval: null
  };

  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'hm-toast hm-toast--' + (type || 'info');
    toast.innerHTML = '<span>' + esc(message) + '</span>';
    toasts.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('fade-out');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function byId(id) { return document.getElementById(id); }

  // --- INITIALIZATION ---
  async function init() {
    var token = api.getToken();
    var user = api.getUser();

    if (token && user) {
      try {
        state.user = user;
        await loadInitialData();
        showApp();
        return;
      } catch (err) {
        if (err && (err.status === 401 || err.code === 'UNAUTHENTICATED')) {
          console.warn('Clinician session expired or invalid', err);
          api.clearSession();
          showAuth();
          return;
        }
        console.warn('Network or server lag during clinician load, keeping session active:', err);
        showApp();
        return;
      }
    }
    showAuth();
  }

  var socket = null;
  function initSocketConnection() {
    try {
      if (typeof io !== 'undefined' && !socket) {
        var host = (window.location.hostname || 'localhost');
        var socketUrl = (window.location.port === '4000') ? window.location.origin : ('http://' + host + ':4000');
        socket = io(socketUrl);
        socket.on('survey:submitted', function (data) {
          console.log('[Socket.IO Clinician] Survey submitted event:', data);
          showToast('Patient recovery feedback submitted: ' + (data.recoveryStatus || 'Completed'), data.isWorsened ? 'error' : 'success');
          if (state.currentView === 'chart' && state.selectedPatient) {
            loadPatientChart(state.selectedPatient.id);
          } else if (state.currentView === 'followups') {
            renderClinicianFollowUpsView();
          }
        });
      }
    } catch (e) {
      console.warn('Clinician socket notice:', e);
    }
  }

  function showAuth() {
    authView.style.display = 'block';
    appView.style.display = 'none';
    var mobNav = byId('clinician-mobile-bottom-nav');
    if (mobNav) mobNav.style.display = 'none';
  }

  function showApp() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    var mobNav = byId('clinician-mobile-bottom-nav');
    if (mobNav) mobNav.style.display = '';
    initSocketConnection();

    if (state.profile) {
      var nameEl = byId('clinician-name');
      var facEl = byId('clinician-facility');
      if (nameEl) nameEl.textContent = state.profile.name || 'Dr. Rohit Verma';
      if (facEl) facEl.textContent = state.profile.org || 'Sunrise Multispecialty Hospital';
    }

    renderCurrentView();
  }

  // Tab Switcher
  var tabSignIn = byId('tab-clinician-signin');
  var tabRegister = byId('tab-clinician-register');
  var paneSignIn = byId('pane-clinician-signin');
  var paneRegister = byId('pane-clinician-register');
  var registerForm = byId('clinician-register-form');

  if (tabSignIn && tabRegister) {
    tabSignIn.addEventListener('click', function () {
      tabSignIn.style.background = 'var(--surface, #fff)';
      tabSignIn.style.color = 'var(--text, #172B3A)';
      tabSignIn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      tabRegister.style.background = 'transparent';
      tabRegister.style.color = 'var(--text-2, #64748B)';
      tabRegister.style.boxShadow = 'none';
      paneSignIn.style.display = 'block';
      paneRegister.style.display = 'none';
      errorBanner.style.display = 'none';
    });

    tabRegister.addEventListener('click', function () {
      tabRegister.style.background = 'var(--surface, #fff)';
      tabRegister.style.color = 'var(--text, #172B3A)';
      tabRegister.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      tabSignIn.style.background = 'transparent';
      tabSignIn.style.color = 'var(--text-2, #64748B)';
      tabSignIn.style.boxShadow = 'none';
      paneSignIn.style.display = 'none';
      paneRegister.style.display = 'block';
      errorBanner.style.display = 'none';
    });
  }

  // Quick Login for Multi-Clinicians
  async function performClinicianQuickLogin(persona, btn, label) {
    try {
      errorBanner.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'Authenticating Doctor...'; }
      var res = await api.login({ persona: persona });
      state.user = res.user;
      await loadInitialData();
      showApp();
      showToast('Signed in as ' + (res.user.name || 'Clinician'), 'success');
    } catch (err) {
      errorBanner.textContent = (err && err.message) || 'Authentication failed';
      errorBanner.style.display = 'block';
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg> ' + label;
      }
    }
  }

  if (quickLoginBtn) {
    quickLoginBtn.addEventListener('click', function () {
      performClinicianQuickLogin('clinician_rohit', quickLoginBtn, 'Sign In as Dr. Rohit Verma (Emergency Clinician)');
    });
  }

  var nehaClinBtn = byId('btn-quick-clinician-neha');
  if (nehaClinBtn) {
    nehaClinBtn.addEventListener('click', function () {
      performClinicianQuickLogin('clinician_neha', nehaClinBtn, 'Sign In as Dr. Neha Kapoor (Primary Care)');
    });
  }

  var anandClinBtn = byId('btn-quick-clinician-anand');
  if (anandClinBtn) {
    anandClinBtn.addEventListener('click', function () {
      performClinicianQuickLogin('clinician_anand', anandClinBtn, 'Sign In as Dr. Anand Rao (Infectious Disease)');
    });
  }

  // Form Login
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    try {
      errorBanner.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Authenticating Doctor...'; }
      var email = byId('clinician-email').value.trim();
      var password = byId('clinician-password').value;
      var res = await api.login(email, password, 'CLINICIAN');
      state.user = res.user;
      await loadInitialData();
      showApp();
      showToast('Clinician authenticated successfully as ' + (res.user.name || 'Practitioner'), 'success');
    } catch (err) {
      errorBanner.textContent = (err && err.message) || 'Login failed. Please check credentials.';
      errorBanner.style.display = 'block';
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Authenticate Clinician'; }
    }
  });

  // Clinician Registration Form
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        errorBanner.style.display = 'none';
        var name = byId('reg-clinician-name').value;
        var email = byId('reg-clinician-email').value;
        var password = byId('reg-clinician-password').value;
        var licenseNumber = byId('reg-clinician-license').value;
        var specialty = byId('reg-clinician-dept').value;

        var submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering & Provisioning Practitioner...';

        var res = await api.register({
          name: name,
          email: email,
          password: password,
          role: 'CLINICIAN',
          licenseNumber: licenseNumber,
          specialty: specialty
        });

        state.user = res.user;
        await loadInitialData();
        showApp();
        showToast('Clinician registered and linked in MongoDB Atlas!', 'success');
      } catch (err) {
        errorBanner.textContent = (err && err.message) || 'Registration failed.';
        errorBanner.style.display = 'block';
      } finally {
        var submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register & Link Practitioner';
        }
      }
    });
  }

  // PWA Installation & Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW registration info:', err);
      });
    });
  }

  var deferredInstallPrompt = null;
  var installBanner = byId('clinician-install-banner');
  var btnInstallApp = byId('btn-install-app');
  var btnDismissInstall = byId('btn-dismiss-install');
  var btnInstallLegacy = byId('btn-pwa-install-clinician');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBanner) installBanner.style.display = 'block';
    if (btnInstallLegacy) btnInstallLegacy.style.display = 'inline-flex';
  });

  async function triggerInstallApp() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      var choice = await deferredInstallPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        showToast('HackMatrix Doctor App installed successfully!', 'success');
      }
      deferredInstallPrompt = null;
      if (installBanner) installBanner.style.display = 'none';
    } else {
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert('To install HackMatrix Doctor App on iPhone/iPad:\n1. Tap the Share icon (square with arrow pointing up) in Safari.\n2. Scroll down and tap "Add to Home Screen".\n3. Tap "Add" in the top-right corner.');
      } else {
        alert('To install HackMatrix Doctor App on Android/Chrome:\n1. Tap the browser menu (⋮) in the top-right.\n2. Tap "Install app" or "Add to Home Screen".\n3. Tap "Install" to place it on your home screen.');
      }
    }
  }

  if (btnInstallApp) btnInstallApp.addEventListener('click', triggerInstallApp);
  if (btnInstallLegacy) btnInstallLegacy.addEventListener('click', triggerInstallApp);
  if (btnDismissInstall) {
    btnDismissInstall.addEventListener('click', function () {
      if (installBanner) installBanner.style.display = 'none';
    });
  }

  // Logout
  byId('btn-clinician-logout').addEventListener('click', function () {
    api.clearSession();
    state.user = null;
    state.profile = null;
    showAuth();
    showToast('Signed out of Clinician Workstation');
  });

  // Top Action Buttons
  byId('btn-quick-scan-qr').addEventListener('click', openQrScannerModal);
  byId('btn-quick-emergency').addEventListener('click', openEmergencyModal);

  // Desktop Navigation Tab buttons
  document.querySelectorAll('.clinician-nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.clinician-nav-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      state.currentView = this.dataset.view;

      // Sync Mobile Bottom Navigation
      document.querySelectorAll('.mobile-nav-btn[data-view]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.view === state.currentView);
      });

      renderCurrentView();
    });
  });

  // Mobile Bottom Navigation Bar wiring
  document.querySelectorAll('.mobile-nav-btn[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetView = this.dataset.view;
      document.querySelectorAll('.mobile-nav-btn[data-view]').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      // Sync Desktop nav
      document.querySelectorAll('.clinician-nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.view === targetView);
      });

      state.currentView = targetView;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  var mobileScanQrBtn = byId('btn-mobile-scan-qr');
  if (mobileScanQrBtn) {
    mobileScanQrBtn.addEventListener('click', openQrScannerModal);
  }

  async function loadInitialData() {
    try {
      var [profRes, dashRes, patRes] = await Promise.all([
        api.get('/clinicians/me'),
        api.get('/clinicians/dashboard'),
        api.get('/clinicians/patients')
      ]);
      state.profile = profRes.data;
      state.dashboard = dashRes.data;
      state.patientsList = patRes.data || [];
    } catch (err) {
      console.warn('Clinician initial data error:', err);
    }
  }

  // --- ROUTING / VIEW RENDERING ---
  function renderCurrentView() {
    switch (state.currentView) {
      case 'dashboard': renderDashboardView(); break;
      case 'patients': renderPatientsView(); break;
      case 'chart': renderPatientChartView(); break;
      case 'followups': renderClinicianFollowUpsView(); break;
      case 'audit': renderAuditView(); break;
    }
  }


  // 1. DASHBOARD VIEW
  function renderDashboardView() {
    var dash = state.dashboard || {};
    var stats = dash.stats || { patientsSeenToday: 6, qrChecksToday: 4, activeConsents: 8, deniedAttempts: 0 };
    var activity = dash.recentActivity || [];

    var html = `
      <div class="od-stack" style="--od-gap: 24px;">

        <!-- KPI Cards -->
        <div class="od-grid" style="--od-cols: 4; --od-gap: 16px;">
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Patients Attended</div>
            <div style="font-size: 28px; font-weight: 800; color: #2563EB; margin: 6px 0 2px;">${stats.patientsSeenToday || 6}</div>
            <div style="font-size: 12px; color: var(--text-3);">Active ER Shift</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">QR Authorizations</div>
            <div style="font-size: 28px; font-weight: 800; color: #0F766E; margin: 6px 0 2px;">${stats.qrChecksToday || 4}</div>
            <div style="font-size: 12px; color: var(--text-3);">Single-use tokens resolved</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Active Consent Grants</div>
            <div style="font-size: 28px; font-weight: 800; color: #15803D; margin: 6px 0 2px;">${stats.activeConsents || 8}</div>
            <div style="font-size: 12px; color: var(--text-3);">In-scope clinical access</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Emergency Overrides</div>
            <div style="font-size: 28px; font-weight: 800; color: #B45309; margin: 6px 0 2px;">1</div>
            <div style="font-size: 12px; color: var(--text-3);">Audited break-glass cases</div>
          </div>
        </div>

        <!-- Active Patients Queue -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">Assigned Patients Queue</h3>
              <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Active patients under consultation & emergency triage</div>
            </div>
            <button id="btn-dash-view-all-patients" class="hm-btn hm-btn--ghost" style="padding: 6px 12px; font-size: 12px; color: #2563EB;">View All &rarr;</button>
          </div>

          <div class="od-stack" style="--od-gap: 12px;" id="dash-patient-list">
            ${state.patientsList && state.patientsList.length > 0 ? state.patientsList.slice(0, 5).map(function (p) {
              var initials = (p.name || 'P').split(' ').map(function(n){ return n[0]; }).join('');
              return `
                <div style="background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="width: 42px; height: 42px; border-radius: 50%; background: #EAF1FE; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px;">
                      ${esc(initials)}
                    </div>
                    <div>
                      <div style="font-size: 15px; font-weight: 700; color: var(--text);">${esc(p.name)}</div>
                      <div style="font-size: 12px; color: var(--text-2);">ID: <strong>${esc(p.id)}</strong> • ${esc(p.age || 34)} yrs • ${esc(p.sex || 'Female')} • Blood: <strong style="color:#B91C1C;">${esc(p.bloodGroup || 'O+')}</strong> • Allergy: <span style="color:#DC2626; font-weight:600;">${esc(p.allergies || 'None')}</span></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="hm-btn hm-btn--ghost btn-dash-add-note" data-pat-id="${esc(p.id)}" style="padding: 7px 12px; font-size: 12px; font-weight: 600; color: #2563EB;">+ Add Note</button>
                    <button class="hm-btn hm-btn--primary btn-dash-open-chart" data-pat-id="${esc(p.id)}" style="background: #2563EB; padding: 7px 14px; font-size: 12px; font-weight: 600;">Open Chart</button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="background: var(--surface-2); border: 1px dashed var(--border); border-radius: 12px; padding: 24px; text-align: center; color: var(--text-2);">
                <div style="font-size: 24px; margin-bottom: 6px;">🩺</div>
                <div style="font-weight: 600; font-size: 14px; color: var(--text);">No Patients In Current Queue</div>
                <div style="font-size: 12px; color: var(--text-3); margin-top: 4px;">Scan a patient's QR code or request patient consent to begin consultation.</div>
              </div>
            `}
          </div>
        </div>

        <!-- Recent Activity Audit Feed -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Recent Access & QR Verification Audit</h3>
            <span style="font-size: 12px; color: var(--text-3); font-family: monospace;">HMAC SIGNED</span>
          </div>
          <div class="od-stack" style="--od-gap: 8px;">
            ${activity.slice(0, 5).map(function (a) {
              var outcomeClass = a.outcome === 'granted' || a.outcome === 'success' ? '#15803D' : (a.outcome === 'emergency_override' ? '#B45309' : '#DC2626');
              return `
                <div style="padding: 12px; background: var(--surface-2); border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                  <div>
                    <strong style="color: var(--text);">${esc(a.action || 'Record Access')}</strong>
                    <div style="color: var(--text-2); font-size: 12px; margin-top: 2px;">
                      Resource: ${esc(a.activity || a.patient || 'Patient File')}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: ${outcomeClass};">${esc(a.outcome || 'success')}</span>
                    <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">${esc(a.ts || 'Recent')}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    viewRoot.innerHTML = html;

    var btnViewAll = byId('btn-dash-view-all-patients');
    if (btnViewAll) {
      btnViewAll.addEventListener('click', function () {
        document.querySelectorAll('.clinician-nav-btn').forEach(function (b) { b.classList.remove('active'); });
        var patBtn = document.querySelector('.clinician-nav-btn[data-view="patients"]');
        if (patBtn) patBtn.classList.add('active');
        state.currentView = 'patients';
        renderPatientsView();
      });
    }

    viewRoot.querySelectorAll('.btn-dash-open-chart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadPatientChart(this.dataset.patId);
      });
    });

    viewRoot.querySelectorAll('.btn-dash-add-note').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAddClinicalRecordModal(this.dataset.patId);
      });
    });
  }

  // 2. PATIENT DIRECTORY VIEW
  async function renderPatientsView() {
    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading authorized patient directory...</div>';
    try {
      var res = await api.get('/clinicians/patients');
      state.patientsList = res.data || [];

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div class="od-row" style="justify-content: space-between;">
            <div>
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--text);">Authorized Patient Directory</h2>
              <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">Patients with current clinical consent or emergency intake at Sunrise Multispecialty Hospital</div>
            </div>
            <div style="width: 320px;">
              <input type="text" id="patient-search-input" placeholder="Search by name or ABHA ID..." style="width:100%; padding:10px 14px; border:1px solid var(--border-strong); border-radius:10px; font-size:14px;" />
            </div>
          </div>

          <div class="od-stack" style="--od-gap: 12px;" id="patient-list-container">
            ${renderPatientListItems(state.patientsList)}
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;

      attachPatientListListeners();

      var searchInput = byId('patient-search-input');
      searchInput.addEventListener('input', async function () {
        var q = this.value.trim();
        var searchRes = await api.get('/clinicians/patients?q=' + encodeURIComponent(q));
        var container = byId('patient-list-container');
        if (container) {
          container.innerHTML = renderPatientListItems(searchRes.data || []);
          attachPatientListListeners();
        }
      });

    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading patients: ' + esc(err.message) + '</div>';
    }
  }

  function renderPatientListItems(list) {
    if (!list || list.length === 0) {
      return '<div style="background:var(--surface); padding:40px; text-align:center; color:var(--text-2); border-radius:12px; border:1px solid var(--border);">No matching patients found.</div>';
    }
    return list.map(function (p) {
      return `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; gap: 14px; align-items: center;">
            <div style="width: 46px; height: 46px; border-radius: 12px; background: #EAF1FE; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">
              ${esc((p.name || 'P').split(' ').map(n=>n[0]).join(''))}
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--text);">${esc(p.name)}</div>
              <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">
                ID: <strong>${esc(p.id)}</strong> • ${esc(p.age || 34)} yrs • ${esc(p.sex || 'Female')} • Blood Type: <strong>${esc(p.bloodGroup || 'O+')}</strong>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="live-badge" style="background:#EFFBF3; color:#15803D;">Consent Active</span>
            <button class="btn-quick-add-note hm-btn hm-btn--ghost" data-pat-id="${p.id}" style="color:#2563EB; font-size:13px; font-weight:600; padding:8px 12px;">
              + Add Note
            </button>
            <button class="btn-open-chart hm-btn hm-btn--primary" data-pat-id="${p.id}" style="background:#2563EB; font-size:13px; font-weight:600; padding:8px 16px;">
              Open Chart
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function attachPatientListListeners() {
    viewRoot.querySelectorAll('.btn-open-chart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadPatientChart(this.dataset.patId);
      });
    });
    viewRoot.querySelectorAll('.btn-quick-add-note').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAddClinicalRecordModal(this.dataset.patId);
      });
    });
  }

  // 3. PATIENT CHART VIEW
  async function loadPatientChart(patientId) {
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }

    document.querySelectorAll('.clinician-nav-btn').forEach(function (b) { b.classList.remove('active'); });
    var chartBtn = document.querySelector('.clinician-nav-btn[data-view="chart"]');
    if (chartBtn) chartBtn.classList.add('active');
    state.currentView = 'chart';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading scoped clinical chart for patient ' + esc(patientId) + '...</div>';

    try {
      var [identRes, recordsRes] = await Promise.all([
        api.get('/clinicians/patients/' + patientId),
        api.get('/clinicians/patients/' + patientId + '/records')
      ]);

      state.selectedPatient = identRes.data;
      state.patientRecords = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data.records || []);
      renderPatientChartView();
    } catch (err) {
      // If no active consent, auto-send or offer access request directly to patient's consent page
      var isConsentIssue = err && (err.code === 'NO_ACTIVE_CONSENT' || (err.message && err.message.toLowerCase().includes('consent')));

      viewRoot.innerHTML = `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; max-width: 680px; margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
            <div style="width:48px; height:48px; border-radius:12px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:24px;">
              🛡️
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">Access Authorization Required</h3>
              <div style="font-size: 13px; color: var(--text-2); margin-top:2px;">Patient: <strong style="color:var(--text);">${esc(patientId)}</strong></div>
            </div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span class="live-badge" style="background:#F59E0B; animation:pulse 1.8s infinite;">Awaiting Patient Consent</span>
              <span style="font-size:12px; color:var(--text-3);">Live Consent Sync</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.5;">
              To view this patient's clinical chart, an active consent authorization is required. An access request has been transmitted directly to the patient's <strong>Consent &amp; Grants</strong> page. Once approved by the patient, this chart will unlock automatically.
            </p>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px;">
              <button id="btn-request-consent-now" class="hm-btn hm-btn--primary" style="flex:1; padding: 11px 16px; font-weight: 600; background:#2563EB; font-size:13px;">
                📨 Send / Re-request Access Consent
              </button>
              <button id="btn-poll-refresh-chart" class="hm-btn hm-btn--ghost" style="padding: 11px 16px; font-weight: 600; border:1px solid var(--border); font-size:13px;">
                🔄 Check Status Now
              </button>
            </div>

            <div style="text-align:center; font-size:12px; color:var(--text-3); display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10B981; animation:pulse 1.5s infinite;"></span>
              Auto-checking for patient approval every 3 seconds...
            </div>

            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 12px; color: var(--text-3);">Life-threatening clinical situation?</span>
              <button id="btn-chart-breakglass" class="hm-btn hm-btn--danger" style="padding: 8px 14px; font-size:12px; font-weight: 600;">
                Emergency Break-Glass Override
              </button>
            </div>
          </div>
        </div>
      `;

      // Trigger automatic request to patient's consent page if not already created
      api.post('/clinicians/patients/' + patientId + '/consent', {
        purpose: 'Clinical consultation & intake',
        scope: ['Encounters', 'Observations', 'Medications', 'Allergies']
      }).catch(function (e) {
        console.log('Consent request dispatch status:', e.message);
      });

      var reqBtn = byId('btn-request-consent-now');
      if (reqBtn) {
        reqBtn.addEventListener('click', async function () {
          try {
            reqBtn.disabled = true;
            reqBtn.textContent = 'Transmitting request...';
            await api.post('/clinicians/patients/' + patientId + '/consent', {
              purpose: 'Clinical consultation & intake',
              scope: ['Encounters', 'Observations', 'Medications', 'Allergies']
            });
            showToast('Access request sent directly to patient consent page!', 'success');
          } catch (e) {
            showToast(e.message || 'Error transmitting consent request', 'info');
          } finally {
            reqBtn.disabled = false;
            reqBtn.textContent = '📨 Send / Re-request Access Consent';
          }
        });
      }

      var refreshBtn = byId('btn-poll-refresh-chart');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          loadPatientChart(patientId);
        });
      }

      var bgBtn = byId('btn-chart-breakglass');
      if (bgBtn) bgBtn.addEventListener('click', openEmergencyModal);

      // Start auto-poll every 3 seconds to check if patient approved
      state.pollInterval = setInterval(async function () {
        if (state.currentView !== 'chart') {
          clearInterval(state.pollInterval);
          state.pollInterval = null;
          return;
        }
        try {
          var check = await api.get('/clinicians/patients/' + patientId);
          if (check && check.data) {
            clearInterval(state.pollInterval);
            state.pollInterval = null;
            showToast('Consent granted by patient! Unlocking chart...', 'success');
            loadPatientChart(patientId);
          }
        } catch (pollErr) {
          // Still waiting for approval
        }
      }, 3000);
    }
  }

  function renderPatientChartView() {
    var p = state.selectedPatient;
    if (!p) {
      viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">No patient selected. Please select a patient from the directory or scan a QR code.</div>';
      return;
    }

    var html = `
      <div class="od-stack" style="--od-gap: 20px;">

        <!-- Patient Header Card -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <div class="od-row" style="justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div style="display: flex; gap: 16px; align-items: center;">
              <div style="width: 56px; height: 56px; border-radius: 16px; background: #EAF1FE; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px;">
                ${esc((p.name || 'P').split(' ').map(n=>n[0]).join(''))}
              </div>
              <div>
                <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--text);">${esc(p.name)}</h2>
                <div style="font-size: 13px; color: var(--text-2); margin-top: 3px;">
                  ID: <strong>${esc(p.id)}</strong> • Age: <strong>${esc(p.age)}</strong> • Sex: <strong>${esc(p.sex)}</strong> • Blood Group: <strong style="color:#B91C1C;">${esc(p.bloodGroup || 'O+')}</strong>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="btn-chart-add-note" class="hm-btn hm-btn--primary" style="background:#2563EB; font-weight:600; font-size:13px; padding:9px 16px;">
                + Add Encounter Note
              </button>
            </div>
          </div>

          <!-- Consent Scope Warning -->
          <div style="background: #EEF3FE; border: 1px solid #BFDBFE; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #1E40AF;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Consent Grant Verified:</strong> ${esc(p.consent || 'Emergency medical intake')}
              </div>
              <span class="live-badge" style="font-size: 11px;">Cryptographically Authorized</span>
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #1D4ED8;">
              Scoped Categories: <strong>${(p.scope || ['Encounters', 'Observations', 'Medications', 'Allergies']).join(', ')}</strong> • Expires: <strong>${esc(p.expires || 'Active')}</strong>
            </div>
          </div>
        </div>

        <!-- Clinical Records Timeline -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">Clinical Records & Observations (${state.patientRecords.length})</h3>
            <span style="font-size: 12px; color: var(--text-2);">Filtered strictly by authorized consent scope</span>
          </div>

          <div class="od-stack" style="--od-gap: 12px;">
            ${state.patientRecords.length === 0 ? '<div style="color:var(--text-2); text-align:center; padding:30px;">No records available under current scope.</div>' :
              state.patientRecords.map(function (r) {
                return `
                  <div style="background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
                    <div class="od-row" style="justify-content: space-between; margin-bottom: 6px;">
                      <span class="hm-badge hm-badge--${r.cat || 'info'}" style="text-transform: capitalize;">${esc(r.cat)}</span>
                      <span style="font-size: 12px; color: var(--text-3);">${esc(r.date)}</span>
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${esc(r.type)}</div>
                    <div style="font-size: 13px; color: var(--text-2); line-height: 1.5; margin-bottom: 8px;">${esc(r.summary)}</div>
                    ${r.followUpSurvey || (r.fields && r.fields.some(f => f.k === 'Patient Recovery Feedback')) ? `
                      <div style="background: #ECFDF5; border: 1.5px solid #10B981; border-radius: 10px; padding: 12px 14px; margin-top: 10px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                          <span style="font-size: 16px;">🩺</span>
                          <strong style="color: #065F46; font-size: 13px;">Verified Patient Recovery Feedback:</strong>
                          <span class="live-badge" style="background:#059669; color:#fff; font-size:10px;">Submitted</span>
                        </div>
                        <div style="color: #047857; font-size: 13px; font-weight: 600;">
                          ${esc((r.followUpSurvey && r.followUpSurvey.recoveryStatus) || (r.fields && r.fields.find(f => f.k === 'Patient Recovery Feedback')?.v) || '')}
                        </div>
                        ${(r.followUpSurvey && r.followUpSurvey.comments) || (r.fields && r.fields.find(f => f.k === 'Patient Comments')?.v) ? `
                          <div style="color: #065F46; font-size: 12px; margin-top: 4px; font-style: italic;">
                            "${esc((r.followUpSurvey && r.followUpSurvey.comments) || (r.fields && r.fields.find(f => f.k === 'Patient Comments')?.v))}"
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                    ${((r.followUpSurvey && r.followUpSurvey.recoveryStatus === 'Completely recovered') || (r.fields && r.fields.some(f => f.k === 'Patient Recovery Feedback' && f.v === 'Completely recovered')) || r.isRecovered) ? '' : `
                      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); display: flex; justify-content: flex-end;">
                        <button class="hm-btn hm-btn--success btn-mark-encounter-recovered" data-enc-id="${esc(r.id)}" style="background: #10B981; color: #fff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Mark Patient as Completely Recovered
                        </button>
                      </div>
                    `}
                    ${r.fields && r.fields.length > 0 ? `
                      <div class="od-grid" style="--od-cols: 2; --od-gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border); font-size: 12px;">
                        ${r.fields.map(f=>`<div><span style="color:var(--text-3);">${esc(f.k)}:</span> <strong>${esc(f.v)}</strong></div>`).join('')}
                      </div>
                    ` : ''}
                    <div style="font-size: 11px; color: var(--text-3); margin-top: 10px; text-align: right;">
                      Recorded by: ${esc(r.clinician || 'Physician')} • Facility: ${esc(r.facility || 'Sunrise Multispecialty')}
                    </div>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>

      </div>
    `;

    viewRoot.innerHTML = html;

    byId('btn-chart-add-note').addEventListener('click', function () {
      openAddClinicalRecordModal(p.id);
    });

    viewRoot.querySelectorAll('.btn-mark-encounter-recovered').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var encId = this.dataset.encId;
        try {
          this.disabled = true;
          this.textContent = 'Updating recovery status...';
          await api.post('/clinicians/encounters/' + encId + '/mark-recovered', {
            comments: 'Patient verified completely recovered by attending clinician.'
          });
          showToast('Patient marked Completely Recovered! Admin disease count decremented (-1).', 'success');
          loadPatientChart(p.id);
        } catch (err) {
          showToast(err.message || 'Error updating recovery status', 'error');
          this.disabled = false;
          this.textContent = 'Mark Patient as Completely Recovered';
        }
      });
    });
  }

  // 4. AUDIT VIEW
  async function renderAuditView() {
    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading immutable clinician audit trail...</div>';
    try {
      var res = await api.get('/clinicians/audit');
      state.auditLogs = res.data.events || [];

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--text);">Clinician Access Audit Trail</h2>
            <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">Immutable, digitally signed ledger of all actions performed by Dr. Rohit Verma</div>
          </div>

          <div class="od-stack" style="--od-gap: 10px;">
            ${state.auditLogs.map(function (a) {
              var outcomeColor = a.outcome === 'granted' || a.outcome === 'success' ? '#15803D' : (a.outcome === 'emergency_override' ? '#B45309' : '#DC2626');
              return `
                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; font-size: 13px;">
                  <div class="od-row" style="justify-content: space-between;">
                    <div>
                      <strong style="color: var(--text);">${esc(a.action)}</strong>
                      <span style="margin-left: 8px; font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${outcomeColor};">${esc(a.outcome)}</span>
                    </div>
                    <span style="font-size: 12px; color: var(--text-3);">${esc(a.ts)}</span>
                  </div>
                  <div style="color: var(--text-2); font-size: 12px; margin-top: 4px;">
                    Target Resource: <strong>${esc(a.resource)}</strong> ${a.patientId ? `(Patient: ${esc(a.patientId)})` : ''}
                  </div>
                  <div style="font-family: monospace; font-size: 11px; color: var(--text-3); margin-top: 4px;">
                    HMAC Hash: ${esc(a.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading audit trail: ' + esc(err.message) + '</div>';
    }
  }

  // --- MODALS ---

  // QR Scanner Modal with Live Optical Camera Feed & jsQR
  function playSuccessBeep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  function openQrScannerModal() {
    var activeStream = null;
    var scanFrameId = null;

    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 440px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 14px;">
            <div class="od-row" style="gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M3 12h18"/></svg>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">Optical Patient QR Scanner</h3>
            </div>
            <button id="btn-close-scanner" class="hm-btn hm-btn--ghost" style="padding: 4px;">✕</button>
          </div>

          <!-- Live Camera Viewport -->
          <div style="position: relative; width: 100%; height: 220px; background: #0B1220; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <video id="qr-live-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
            <canvas id="qr-scan-canvas" hidden></canvas>
            
            <!-- Targeting reticle -->
            <div id="scanner-reticle" style="position: absolute; width: 140px; height: 140px; border: 2.5px solid #2DD4BF; border-radius: 14px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none;"></div>
            <div id="scanner-laser" style="position: absolute; width: 140px; height: 2px; background: #2DD4BF; box-shadow: 0 0 8px #2DD4BF; animation: scanLine 2s infinite ease-in-out; pointer-events: none;"></div>
            <div id="camera-status-badge" style="position: absolute; bottom: 10px; background: rgba(0,0,0,0.65); color: #E2E8F0; font-size: 11px; padding: 4px 10px; border-radius: 99px; backdrop-filter: blur(4px);">
              Starting Camera Feed...
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
            <div style="font-size:11px; font-weight:700; color:var(--text-3); text-transform:uppercase;">Quick Optical Scan Presets:</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
              <button type="button" id="btn-scan-sim-ananya" class="hm-btn hm-btn--ghost" style="font-size:11px; font-weight:600; color:#0F766E; border:1px solid #99F6E4; background:#F0FDFA; border-radius:8px; padding:6px 4px; cursor:pointer;" title="Ananya Sharma (HMX-P-20481)">
                Ananya (P1)
              </button>
              <button type="button" id="btn-scan-sim-meera" class="hm-btn hm-btn--ghost" style="font-size:11px; font-weight:600; color:#2563EB; border:1px solid #BFDBFE; background:#EFF6FF; border-radius:8px; padding:6px 4px; cursor:pointer;" title="Meera Nair (HMX-P-31877)">
                Meera (P2)
              </button>
              <button type="button" id="btn-scan-sim-rohan" class="hm-btn hm-btn--ghost" style="font-size:11px; font-weight:600; color:#7C3AED; border:1px solid #DDD6FE; background:#F5F3FF; border-radius:8px; padding:6px 4px; cursor:pointer;" title="Rohan Patel (HMX-P-28110)">
                Rohan (P3)
              </button>
            </div>
            <label style="display:flex; align-items:center; justify-content:center; gap:6px; padding:6px 10px; background:var(--surface-2); border:1px dashed var(--border); border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; margin-top:2px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload QR Image File
              <input type="file" id="qr-file-input" accept="image/*" style="display:none;" />
            </label>
          </div>

          <form id="qr-resolve-form">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Detected QR Token</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="qr-input-token" placeholder="Scan QR with camera or enter token..." value="HMX-QR-DEMO-20481" required style="flex:1; padding:9px 12px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px; font-family:monospace;" />
                <button type="button" id="btn-paste-qr" class="hm-btn hm-btn--ghost" style="font-size:12px; color:#2563EB; font-weight:600;">Paste</button>
              </div>
            </div>
            <button type="submit" id="btn-submit-resolve-qr" class="hm-btn hm-btn--primary" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 600; background:#2563EB;">
              Resolve &amp; Open Patient Chart
            </button>
          </form>

          <style>
            @keyframes scanLine {
              0% { transform: translateY(-65px); }
              50% { transform: translateY(65px); }
              100% { transform: translateY(-65px); }
            }
          </style>
        </div>
      </div>
    `;

    var video = byId('qr-live-video');
    var canvas = byId('qr-scan-canvas');
    var statusBadge = byId('camera-status-badge');
    var reticle = byId('scanner-reticle');
    var laser = byId('scanner-laser');

    function closeScanner() {
      if (scanFrameId) cancelAnimationFrame(scanFrameId);
      if (activeStream) {
        activeStream.getTracks().forEach(function (t) { t.stop(); });
      }
      overlay.innerHTML = '';
    }

    byId('btn-close-scanner').addEventListener('click', closeScanner);

    // Start Live Optical Camera Scanner
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function (stream) {
          activeStream = stream;
          video.srcObject = stream;
          video.setAttribute('playsinline', true);
          video.play();
          statusBadge.textContent = 'Camera Active: Align QR Code';

          function scanTick() {
            if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              var code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });

              if (code && code.data) {
                var foundText = code.data.trim();
                // Check if JSON or raw token
                var resolvedToken = foundText;
                try {
                  var parsed = JSON.parse(foundText);
                  if (parsed && parsed.token) resolvedToken = parsed.token;
                } catch (e) {}

                // Match found!
                playSuccessBeep();
                statusBadge.textContent = 'QR Code Detected!';
                statusBadge.style.background = '#15803D';
                if (reticle) reticle.style.borderColor = '#22C55E';
                if (laser) laser.style.display = 'none';

                byId('qr-input-token').value = resolvedToken;
                showToast('QR Code captured from optical camera!', 'success');

                // Stop camera and trigger submit
                activeStream.getTracks().forEach(function (t) { t.stop(); });
                setTimeout(function () {
                  byId('btn-submit-resolve-qr').click();
                }, 400);
                return;
              }
            }
            scanFrameId = requestAnimationFrame(scanTick);
          }

          scanFrameId = requestAnimationFrame(scanTick);
        })
        .catch(function (err) {
          console.warn('Camera access unavailable:', err);
          statusBadge.textContent = 'Camera Off (Manual Input Ready)';
        });
    } else {
      statusBadge.textContent = 'Manual Input Mode';
    }

    function triggerSimulatedScan(token, patientName) {
      playSuccessBeep();
      if (statusBadge) {
        statusBadge.textContent = 'Optical QR Detected: ' + patientName;
        statusBadge.style.background = '#15803D';
      }
      if (reticle) reticle.style.borderColor = '#22C55E';
      if (laser) laser.style.display = 'none';
      byId('qr-input-token').value = token;
      showToast('QR Code captured for ' + patientName, 'success');
      setTimeout(function () {
        byId('btn-submit-resolve-qr').click();
      }, 350);
    }

    var ananyaScanBtn = byId('btn-scan-sim-ananya');
    if (ananyaScanBtn) {
      ananyaScanBtn.addEventListener('click', function () {
        triggerSimulatedScan('HMX-QR-ANANYA-20481', 'Ananya Sharma');
      });
    }

    var meeraScanBtn = byId('btn-scan-sim-meera');
    if (meeraScanBtn) {
      meeraScanBtn.addEventListener('click', function () {
        triggerSimulatedScan('HMX-QR-MEERA-31877', 'Meera Nair');
      });
    }

    var rohanScanBtn = byId('btn-scan-sim-rohan');
    if (rohanScanBtn) {
      rohanScanBtn.addEventListener('click', function () {
        triggerSimulatedScan('HMX-QR-ROHAN-28110', 'Rohan Patel');
      });
    }

    // QR Image File Upload Decoder
    var fileInput = byId('qr-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (event) {
          var img = new Image();
          img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = window.jsQR && window.jsQR(imgData.data, imgData.width, imgData.height);
            if (code && code.data) {
              playSuccessBeep();
              byId('qr-input-token').value = code.data.trim();
              showToast('QR code decoded from uploaded image!', 'success');
              setTimeout(function () {
                byId('btn-submit-resolve-qr').click();
              }, 400);
            } else {
              showToast('No QR code detected in the uploaded image. Please enter token manually.', 'info');
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    byId('btn-paste-qr').addEventListener('click', async function () {
      try {
        var text = await navigator.clipboard.readText();
        if (text) byId('qr-input-token').value = text.trim();
      } catch (e) {
        byId('qr-input-token').value = 'HMX-QR-ANANYA-20481';
      }
    });

    byId('qr-resolve-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = byId('btn-submit-resolve-qr');
      try {
        btn.disabled = true;
        btn.textContent = 'Verifying cryptographic token...';
        var token = byId('qr-input-token').value.trim();

        var res = await api.post('/clinicians/qr/resolve', { token: token });
        showToast('QR Token Resolved! Identity verified.', 'success');
        closeScanner();

        // Open resolved patient's chart
        if (res.data && res.data.patient) {
          loadPatientChart(res.data.patient.id);
        }
      } catch (err) {
        showToast(err.message || 'Invalid or expired QR code', 'error');
        btn.disabled = false;
        btn.textContent = 'Resolve & Open Patient Chart';
      }
    });
  }

  // Break-Glass Emergency Modal
  function openEmergencyModal() {
    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 440px; border-top: 4px solid #DC2626;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
            <div class="od-row" style="gap: 8px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><path d="M12 3 2.6 20h18.8z"/><path d="M12 9v5M12 17.4h.01"/></svg>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #991B1B;">Emergency Break-Glass Override</h3>
            </div>
            <button id="btn-close-emergency" class="hm-btn hm-btn--ghost" style="padding: 4px;">✕</button>
          </div>

          <div style="background: #FEF2F2; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #B91C1C; margin-bottom: 14px; line-height: 1.4;">
            <strong>Warning:</strong> Break-glass override bypasses patient consent for life-threatening emergencies. This action alerts clinical administration and triggers an immediate compliance audit.
          </div>

          <form id="emergency-override-form">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Patient Identifier</label>
              <input type="text" id="em-patient-id" value="HMX-P-20481" required style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;" />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Clinical Justification (Mandatory)</label>
              <textarea id="em-justification" rows="3" required style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">Acute respiratory trauma / unconscious in emergency bay. Immediate triage required.</textarea>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text); cursor:pointer;">
                <input type="checkbox" id="em-supervisor-alert" checked required />
                I confirm supervisor alert has been dispatched to Dr. Neha Kapoor (Chief of ER)
              </label>
            </div>

            <button type="submit" id="btn-submit-emergency" class="hm-btn hm-btn--danger" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 600; background:#DC2626; color:#fff; border:none; border-radius:10px; cursor:pointer;">
              Execute Emergency Break-Glass Override
            </button>
          </form>
        </div>
      </div>
    `;

    function close() { overlay.innerHTML = ''; }
    byId('btn-close-emergency').addEventListener('click', close);

    byId('emergency-override-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = byId('btn-submit-emergency');
      try {
        btn.disabled = true;
        btn.textContent = 'Authorizing emergency break-glass...';
        var patId = byId('em-patient-id').value.trim();
        var justification = byId('em-justification').value.trim();

        await api.post('/clinicians/emergency', {
          patientId: patId,
          justification: justification,
          supervisorAlerted: true
        });

        showToast('Emergency break-glass executed and logged to audit trail!', 'success');
        close();

        // Directly open the patient chart under emergency override!
        loadPatientChart(patId);
      } catch (err) {
        showToast(err.message || 'Error executing emergency override', 'error');
        btn.disabled = false;
        btn.textContent = 'Execute Emergency Break-Glass Override';
      }
    });
  }

  // Add Clinical Record Modal
  function openAddClinicalRecordModal(patientId) {
    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 440px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Add Clinical Note &amp; Diagnosis</h3>
            <button id="btn-close-note-modal" class="hm-btn hm-btn--ghost" style="padding: 4px;">✕</button>
          </div>
          <form id="add-clinical-note-form">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Encounter / Record Category</label>
              <select id="doc-rec-cat" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">
                <option value="encounters">Clinical Encounter & Diagnosis</option>
                <option value="observations">Vital Signs / Lab Observation</option>
                <option value="medications">Prescribed Medication</option>
                <option value="careplans">Discharge / Follow-up Plan</option>
              </select>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Disease Category (Surveillance Classification)</label>
              <select id="doc-rec-syndrome" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #2563EB; font-size:13px; font-weight:600; background:#EFF6FF; color:#1E40AF;">
                <option value="Bronchial Asthma">Bronchial Asthma</option>
                <option value="Diabetes Mellitus">Diabetes Mellitus</option>
                <option value="Hypertension">Hypertension</option>
                <option value="Dermatological conditions">Dermatological conditions</option>
                <option value="Acute Respiratory Infection (ARI)">Acute Respiratory Infection (ARI)</option>
                <option value="Dengue Fever / Vector-Borne">Vector-Borne (Dengue / Chikungunya)</option>
                <option value="Acute Diarrheal Disease (ADD)">Acute Diarrheal Disease (ADD / Gastroenteritis)</option>
                <option value="General Health / Routine Checkup">General Health / Routine Checkup</option>
              </select>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Pune Encounter Locality *</label>
              <select id="doc-rec-locality" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">
                <option value="Shivajinagar">Shivajinagar</option>
                <option value="Kothrud">Kothrud</option>
                <option value="Baner">Baner</option>
                <option value="Aundh">Aundh</option>
                <option value="Hinjawadi">Hinjawadi</option>
                <option value="Wakad">Wakad</option>
                <option value="Hadapsar">Hadapsar</option>
                <option value="Kharadi">Kharadi</option>
                <option value="Bibwewadi">Bibwewadi</option>
                <option value="Kondhwa">Kondhwa</option>
                <option value="Viman Nagar">Viman Nagar</option>
                <option value="Yerawada">Yerawada</option>
                <option value="Pimpri">Pimpri</option>
                <option value="Chinchwad">Chinchwad</option>
              </select>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Clinical Heading / Diagnosis Summary</label>
              <input type="text" id="doc-rec-type" value="Bronchial Asthma Assessment &amp; Inhaler Review" required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;" />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Clinical Notes &amp; Treatment Plan</label>
              <textarea id="doc-rec-summary" rows="3" required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">Wheezing and nocturnal dyspnea recorded. Prescribed Budesonide/Formoterol inhaler and oral bronchodilator.</textarea>
            </div>

            <!-- Patient Recovery Follow-Up Survey Option -->
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#1D4ED8; cursor:pointer;">
                <input type="checkbox" id="doc-rec-followup-enable" checked />
                Enable Automated Patient Recovery Follow-Up Survey
              </label>
              <div id="doc-followup-options" style="margin-top: 8px; display:flex; align-items:center; gap:8px;">
                <label style="font-size:11px; color:#1E40AF; font-weight:600;">Interval:</label>
                <select id="doc-rec-followup-interval" style="padding:4px 8px; border-radius:6px; border:1px solid #93C5FD; font-size:12px; background:#fff; color:#1E40AF;">
                  <option value="7" selected>7 Days (Standard)</option>
                  <option value="10">10 Days</option>
                  <option value="14">14 Days</option>
                  <option value="0">⚡ Due Immediately (Test Mode)</option>
                </select>
              </div>
            </div>

            <button type="submit" id="btn-submit-doc-note" class="hm-btn hm-btn--primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight:600; background:#2563EB;">
              Sign Diagnosis &amp; Commit to Database
            </button>
          </form>
        </div>
      </div>
    `;

    function close() { overlay.innerHTML = ''; }
    byId('btn-close-note-modal').addEventListener('click', close);

    byId('add-clinical-note-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = byId('btn-submit-doc-note');
      try {
        btn.disabled = true;
        btn.textContent = 'Signing and committing note...';
        var cat = byId('doc-rec-cat').value;
        var syndrome = byId('doc-rec-syndrome').value;
        var locality = byId('doc-rec-locality').value;
        var type = byId('doc-rec-type').value;
        var summary = byId('doc-rec-summary').value;
        var isFollowUp = byId('doc-rec-followup-enable').checked;
        var interval = parseInt(byId('doc-rec-followup-interval').value, 10);

        await api.post('/clinicians/patients/' + patientId + '/records', {
          cat: cat,
          type: type,
          summary: summary,
          diseaseCategory: syndrome,
          locality: locality,
          diagnosis: type,
          followUpConfig: {
            enabled: isFollowUp,
            intervalDays: interval === 0 ? 7 : interval,
            testNow: interval === 0
          },
          fields: [
            { k: 'Diagnosis / Syndrome', v: syndrome },
            { k: 'Locality', v: locality },
            { k: 'Physician', v: (state.user && state.user.name) || 'Dr. Rohit Verma' },
            { k: 'Facility', v: 'Sunrise Multispecialty Hospital' }
          ]
        });

        showToast('Clinical diagnosis (' + syndrome + ') committed and sync broadcasted!', 'success');
        close();

        // Refresh chart
        loadPatientChart(patientId);
      } catch (err) {
        showToast(err.message || 'Error committing clinical note', 'error');
        btn.disabled = false;
        btn.textContent = 'Sign & Commit to Patient Chart';
      }
    });
  }

  // Follow-Up Reviews View
  async function renderClinicianFollowUpsView() {
    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading patient follow-up surveys...</div>';
    try {
      var res = await api.get('/followups/clinician');
      var surveys = res.data || [];

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div class="od-row" style="justify-content: space-between;">
            <div>
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--text);">Patient Recovery Follow-Up Reviews</h2>
              <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">Patient-reported recovery outcomes across consultations</div>
            </div>
            <button id="btn-refresh-doc-followups" class="hm-btn hm-btn--ghost" style="border: 1px solid var(--border); padding: 8px 14px; font-size: 13px; font-weight: 600; cursor:pointer;">
              ↻ Refresh Reviews
            </button>
          </div>

          <div class="od-stack" style="--od-gap: 12px;">
            ${surveys.length === 0 ? '<div style="background:var(--surface); padding:40px; text-align:center; color:var(--text-2); border-radius:14px; border:1px solid var(--border);">No follow-up surveys recorded for your consultations yet.</div>' :
              surveys.map(function (s) {
                var isWorsened = s.isWorsened || s.recoveryStatus === 'Symptoms have worsened';
                var statusColor = isWorsened ? '#DC2626' : (s.status === 'completed' ? '#15803D' : '#2563EB');
                var statusBg = isWorsened ? '#FEF2F2' : (s.status === 'completed' ? '#EFFBF3' : '#EFF6FF');

                return `
                  <div style="background: var(--surface); border: 1.5px solid ${isWorsened ? '#EF4444' : 'var(--border)'}; border-radius: 14px; padding: 18px; box-shadow: ${isWorsened ? '0 4px 14px rgba(239,68,68,0.12)' : 'none'};">
                    <div class="od-row" style="justify-content: space-between; margin-bottom: 8px;">
                      <div class="od-row" style="gap: 10px;">
                        <span style="font-size: 16px; font-weight: 700; color: var(--text);">${esc(s.patientName)}</span>
                        <span class="live-badge" style="background:${statusBg}; color:${statusColor}; font-size: 11px;">
                          ${isWorsened ? '⚠️ HIGH ATTENTION: Symptoms Worsened' : (s.status === 'completed' ? 'Completed' : 'Awaiting Patient')}
                        </span>
                      </div>
                      <span style="font-size: 12px; color: var(--text-3);">
                        Scheduled: ${s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '7 Days'}
                      </span>
                    </div>

                    <div style="font-size: 13px; color: var(--text-2); margin-bottom: 6px;">
                      Condition: <strong>${esc(s.diseaseCategory || 'Consultation')}</strong> • Clinician: <strong>${esc(s.clinicianName || 'Dr. Rohit Verma')}</strong>
                    </div>

                    ${s.recoveryStatus ? `
                      <div style="padding: 10px 14px; background: ${isWorsened ? '#FFF1F2' : 'var(--surface-2)'}; border-radius: 10px; margin-top: 10px;">
                        <div style="font-size: 12px; font-weight: 700; color: ${isWorsened ? '#BE123C' : 'var(--text)'};">
                          Patient-Reported Status: ${esc(s.recoveryStatus)}
                        </div>
                        ${s.comments ? `<div style="font-size: 12px; color: var(--text-2); margin-top: 4px; font-style: italic;">Patient Comments: "${esc(s.comments)}"</div>` : ''}
                        <div style="font-size: 11px; color: var(--text-3); margin-top: 6px;">
                          Submitted at: ${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </div>
                      </div>
                    ` : `
                      <div style="font-size: 12px; color: var(--text-3); margin-top: 6px;">
                        Survey currently pending patient response.
                      </div>
                    `}
                    ${s.recoveryStatus !== 'Completely recovered' ? `
                      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); display: flex; justify-content: flex-end;">
                        <button class="hm-btn hm-btn--success btn-doc-mark-survey-recovered" data-enc-id="${esc(s.encounterId)}" style="background: #10B981; color: #fff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          Mark Patient as Completely Recovered
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;

      viewRoot.querySelectorAll('.btn-doc-mark-survey-recovered').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var encId = this.dataset.encId;
          try {
            this.disabled = true;
            this.textContent = 'Updating recovery status...';
            await api.post('/clinicians/encounters/' + encId + '/mark-recovered', {
              comments: 'Verified completely recovered by clinician during follow-up review.'
            });
            showToast('Patient marked Completely Recovered! Admin disease count decremented (-1).', 'success');
            renderClinicianFollowUpsView();
          } catch (err) {
            showToast(err.message || 'Error updating recovery status', 'error');
            this.disabled = false;
            this.textContent = 'Mark Patient as Completely Recovered';
          }
        });
      });

      var refreshBtn = byId('btn-refresh-doc-followups');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', renderClinicianFollowUpsView);
      }
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading follow-up reviews: ' + esc(err.message) + '</div>';
    }
  }


  // --- THEME PICKER SUPPORT ---
  document.querySelectorAll('.theme-dot').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.dataset.value;
      document.body.setAttribute('data-theme', val);
      document.querySelectorAll('.theme-dot').forEach(function (d) {
        d.setAttribute('aria-checked', d.dataset.value === val ? 'true' : 'false');
      });
      localStorage.setItem('hmx_theme', val);
    });
  });

  var savedTheme = localStorage.getItem('hmx_theme');
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
  }

  // Boot
  init();
})();
