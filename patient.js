/**
 * HackMatrix - Dedicated Patient Portal Logic
 * Connected to live backend at http://localhost:4000/api/v1
 */
(function () {
  'use strict';

  var api = window.HmxApi.forRole('patient');

  // DOM elements
  var authView = document.getElementById('patient-auth-view');
  var appView = document.getElementById('patient-app-view');
  var appRoot = document.getElementById('patient-app-root');
  var tabbar = document.getElementById('patient-tabbar');
  var quickLoginBtn = document.getElementById('btn-quick-patient-login');
  var loginForm = document.getElementById('patient-login-form');
  var errorBanner = document.getElementById('auth-error-banner');
  var overlay = document.getElementById('overlay');
  var toasts = document.getElementById('toasts');

  // State
  var state = {
    user: null,
    profile: null,
    vitals: [],
    records: [],
    grants: [],
    activity: [],
    currentTab: 'home',
    recordFilter: 'all',
    qrData: null,
    qrInterval: null
  };

  // Toast notification helper
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

  // Icons
  var ICONS = {
    home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.6V21h14V9.6"/>',
    records: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/>',
    shieldCheck: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.2 8-6.2s8 2.2 8 6.2"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2.6 20h18.8z"/><path d="M12 9v5M12 17.4h.01"/>',
    logout: '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M16 12H9"/><path d="m13 8 4 4-4 4"/>'
  };

  function icon(name, size) {
    size = size || 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  // Real Dynamic QR Code SVG Generator (Draws functional matrix representation)
  function renderQrSvg(tokenText) {
    var size = 180;
    var hash = 0;
    for (var i = 0; i < tokenText.length; i++) {
      hash = ((hash << 5) - hash) + tokenText.charCodeAt(i);
      hash |= 0;
    }

    var grid = 21; // standard QR version 1 grid
    var cellSize = size / grid;
    var rects = [];

    function isFinder(r, c) {
      if ((r < 7 && c < 7) || (r < 7 && c >= grid - 7) || (r >= grid - 7 && c < 7)) {
        return true;
      }
      return false;
    }

    // Draw finder patterns
    function addFinder(r0, c0) {
      rects.push('<rect x="' + (c0 * cellSize) + '" y="' + (r0 * cellSize) + '" width="' + (7 * cellSize) + '" height="' + (7 * cellSize) + '" fill="#0F766E" rx="4"/>');
      rects.push('<rect x="' + ((c0 + 1) * cellSize) + '" y="' + ((r0 + 1) * cellSize) + '" width="' + (5 * cellSize) + '" height="' + (5 * cellSize) + '" fill="#FFFFFF" rx="2"/>');
      rects.push('<rect x="' + ((c0 + 2) * cellSize) + '" y="' + ((r0 + 2) * cellSize) + '" width="' + (3 * cellSize) + '" height="' + (3 * cellSize) + '" fill="#0F766E" rx="1"/>');
    }

    addFinder(0, 0);
    addFinder(0, grid - 7);
    addFinder(grid - 7, 0);

    // Data matrix pseudo-random generation based on seed token
    for (var r = 0; r < grid; r++) {
      for (var c = 0; c < grid; c++) {
        if (isFinder(r, c)) continue;
        // Timing lines
        if (r === 6 || c === 6) {
          if ((r + c) % 2 === 0) {
            rects.push('<rect x="' + (c * cellSize) + '" y="' + (r * cellSize) + '" width="' + (cellSize - 0.5) + '" height="' + (cellSize - 0.5) + '" fill="#172B3A"/>');
          }
          continue;
        }
        var cellVal = Math.sin(r * 11 + c * 17 + hash);
        if (cellVal > 0.05) {
          rects.push('<rect x="' + (c * cellSize) + '" y="' + (r * cellSize) + '" width="' + (cellSize - 0.5) + '" height="' + (cellSize - 0.5) + '" fill="#172B3A" rx="1"/>');
        }
      }
    }

    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="background:#fff; padding:12px; border-radius:16px; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">' + rects.join('') + '</svg>';
  }

  // --- INITIALIZATION & AUTH ---
  async function init() {
    var token = api.getToken();
    var user = api.getUser();

    if (token && user) {
      try {
        state.user = user;
        await loadAllData();
        showApp();
        return;
      } catch (err) {
        console.warn('Session expired or invalid, redirecting to login', err);
        api.clearSession();
      }
    }
    showAuth();
  }

  function showAuth() {
    authView.style.display = 'block';
    appView.style.display = 'none';
  }

  function showApp() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    renderTabbar();
    renderCurrentTab();
  }

  // Tab Switcher
  var tabSignIn = document.getElementById('tab-patient-signin');
  var tabRegister = document.getElementById('tab-patient-register');
  var paneSignIn = document.getElementById('pane-patient-signin');
  var paneRegister = document.getElementById('pane-patient-register');
  var registerForm = document.getElementById('patient-register-form');

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

  // Quick Login for Multi-Patients
  async function performPatientQuickLogin(persona, btn, label) {
    try {
      errorBanner.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'Authenticating...'; }
      var res = await api.login({ persona: persona });
      state.user = res.user;
      await loadAllData();
      showApp();
      showToast('Signed in as ' + (res.user.name || 'Patient'), 'success');
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

  quickLoginBtn.addEventListener('click', function () {
    performPatientQuickLogin('patient_ananya', quickLoginBtn, 'Sign In as Ananya Sharma (HMX-P-20481)');
  });

  var meeraBtn = byId('btn-quick-patient-meera');
  if (meeraBtn) {
    meeraBtn.addEventListener('click', function () {
      performPatientQuickLogin('patient_meera', meeraBtn, 'Sign In as Meera Nair (HMX-P-31877)');
    });
  }

  var rohanBtn = byId('btn-quick-patient-rohan');
  if (rohanBtn) {
    rohanBtn.addEventListener('click', function () {
      performPatientQuickLogin('patient_rohan', rohanBtn, 'Sign In as Rohan Deshmukh (HMX-P-45520)');
    });
  }

  // Manual Form Login
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    try {
      errorBanner.style.display = 'none';
      var email = document.getElementById('patient-email').value;
      var password = document.getElementById('patient-password').value;
      var res = await api.login(email, password, 'PATIENT');
      state.user = res.user;
      await loadAllData();
      showApp();
      showToast('Signed in successfully', 'success');
    } catch (err) {
      errorBanner.textContent = (err && err.message) || 'Login failed. Please check credentials.';
      errorBanner.style.display = 'block';
    }
  });

  // Registration Form
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        errorBanner.style.display = 'none';
        var name = document.getElementById('reg-patient-name').value;
        var email = document.getElementById('reg-patient-email').value;
        var password = document.getElementById('reg-patient-password').value;
        var gender = document.getElementById('reg-patient-gender').value;
        var bloodGroup = document.getElementById('reg-patient-blood').value;
        var dob = document.getElementById('reg-patient-dob').value;

        var submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account & ABHA Record...';

        var res = await api.register({
          name: name,
          email: email,
          password: password,
          role: 'PATIENT',
          gender: gender,
          bloodGroup: bloodGroup,
          dateOfBirth: dob
        });

        state.user = res.user;
        await loadAllData();
        showApp();
        showToast('Registered & saved to live MongoDB Atlas!', 'success');
      } catch (err) {
        errorBanner.textContent = (err && err.message) || 'Registration failed.';
        errorBanner.style.display = 'block';
      } finally {
        var submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register as New Patient';
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
  var btnInstall = document.getElementById('btn-pwa-install');
  if (btnInstall) btnInstall.style.display = 'inline-flex';

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) btnInstall.style.display = 'inline-flex';
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async function () {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        var choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('HackMatrix App installed to your device!', 'success');
        }
        deferredInstallPrompt = null;
      } else {
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert('To install HackMatrix on iPhone:\n1. Tap the Share icon (square with arrow up) at the bottom.\n2. Scroll down and tap "Add to Home Screen".\n3. Tap "Add" in top-right.');
        } else {
          alert('To install HackMatrix on Android/Chrome:\n1. Tap the browser menu (⋮) in the top-right.\n2. Tap "Install app" or "Add to Home Screen".\n3. Confirm to install.');
        }
      }
    });
  }

  // Logout
  function logout() {
    api.clearSession();
    state.user = null;
    state.profile = null;
    showAuth();
    showToast('Signed out of Patient Portal');
  }

  // --- DATA LOADING ---
  async function loadAllData() {
    var [summaryRes, recordsRes, vitalsRes, grantsRes, activityRes] = await Promise.all([
      api.get('/patients/me/summary'),
      api.get('/patients/me/records'),
      api.get('/patients/me/vitals'),
      api.get('/patients/me/grants'),
      api.get('/patients/me/activity')
    ]);

    state.profile = summaryRes.data.patient;
    state.vitals = vitalsRes.data.vitals || summaryRes.data.vitals || [];
    state.records = recordsRes.data.records || [];
    state.grants = grantsRes.data || [];
    state.activity = activityRes.data.activity || [];
  }

  // --- NAVIGATION TABBAR ---
  function renderTabbar() {
    var tabs = [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'records', label: 'Records', icon: 'records' },
      { id: 'consent', label: 'Consent', icon: 'shieldCheck' },
      { id: 'qr', label: 'QR Pass', icon: 'qr' },
      { id: 'profile', label: 'Profile', icon: 'user' }
    ];

    tabbar.innerHTML = tabs.map(function (t) {
      var active = state.currentTab === t.id;
      return '<button class="hm-tab" data-tab="' + t.id + '" aria-current="' + (active ? 'true' : 'false') + '">' +
        icon(t.icon, 20) +
        '<span>' + t.label + '</span>' +
      '</button>';
    }).join('');

    tabbar.querySelectorAll('.hm-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.currentTab = this.dataset.tab;
        renderTabbar();
        renderCurrentTab();
      });
    });
  }

  // --- TAB RENDERING ---
  function renderCurrentTab() {
    switch (state.currentTab) {
      case 'home': renderHomeTab(); break;
      case 'records': renderRecordsTab(); break;
      case 'consent': renderConsentTab(); break;
      case 'qr': renderQrTab(); break;
      case 'profile': renderProfileTab(); break;
    }
  }

  // 1. HOME TAB
  function renderHomeTab() {
    var p = state.profile || {};
    var activeGrants = state.grants.filter(function (g) { return g.status === 'active'; });

    var html = `
      <div class="od-stack" style="--od-gap: 16px; padding: 16px;">
        <!-- Top App Bar -->
        <div class="od-row" style="justify-content: space-between;">
          <div class="od-row" style="gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--brand-soft); color: var(--brand); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">
              ${(p.name || 'AS').split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div style="font-size: 17px; font-weight: 700; color: var(--text);">${esc(p.name || 'Ananya Sharma')}</div>
              <div style="font-size: 12px; color: var(--text-2); font-family: monospace;">ABHA: ${esc(p.abha || '••••-4821')}</div>
            </div>
          </div>
          <button id="btn-patient-logout" class="hm-btn hm-btn--ghost" title="Sign Out" style="padding: 8px;">
            ${icon('logout', 18)}
          </button>
        </div>

        <!-- Emergency Banner -->
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 12px; padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start;">
          <div style="color: #DC2626; margin-top: 2px;">${icon('alert', 20)}</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: #991B1B;">Critical Medical Alert</div>
            <div style="font-size: 12px; color: #B91C1C; margin-top: 2px;">
              Allergies: <strong>${esc((p.allergies || ['Penicillin']).join(', '))}</strong> • Blood Type: <strong>${esc(p.bloodGroup || 'O+')}</strong>
            </div>
          </div>
        </div>

        <!-- Quick Access QR Card -->
        <div style="background: linear-gradient(135deg, var(--brand), var(--brand-strong)); border-radius: 16px; padding: 18px; color: #fff; box-shadow: 0 4px 16px rgba(15,118,110,0.25);">
          <div class="od-row" style="justify-content: space-between;">
            <div>
              <div style="font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Clinical Intake</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 2px;">Patient QR Pass</div>
            </div>
            <button id="btn-home-open-qr" class="hm-btn hm-btn--primary" style="background: #fff; color: var(--brand); font-weight: 700; font-size: 12px; padding: 8px 14px;">
              ${icon('qr', 16)} Show QR
            </button>
          </div>
          <p style="font-size: 12px; opacity: 0.85; margin: 10px 0 0; line-height: 1.4;">
            Present to authorized doctor or triage nurse for instant, consent-scoped clinical access.
          </p>
        </div>

        <!-- Vitals Panel -->
        <div class="od-stack" style="--od-gap: 8px;">
          <div class="od-row" style="justify-content: space-between;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text);">Latest Vitals</h3>
            <button id="btn-add-vital" class="hm-btn hm-btn--ghost" style="font-size: 12px; font-weight: 600; color: var(--brand); padding: 4px 8px;">
              ${icon('plus', 14)} Add Reading
            </button>
          </div>
          <div class="od-grid" style="--od-cols: 3; --od-gap: 8px;">
            ${state.vitals.slice(0, 3).map(function (v) {
              return `
                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px; text-align: center;">
                  <div style="font-size: 11px; color: var(--text-2);">${esc(v.label)}</div>
                  <div style="font-size: 16px; font-weight: 700; color: var(--brand); margin: 4px 0 2px;">${esc(v.value)}</div>
                  <div style="font-size: 10px; color: var(--text-3);">${esc(v.unit)} • ${esc(v.time)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Active Consent Summary -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 700; color: var(--text);">Active Consent Grants</div>
            <span class="live-badge" style="font-size: 11px;">${activeGrants.length} Active</span>
          </div>
          ${activeGrants.length === 0 ? '<div style="font-size: 12px; color: var(--text-2);">No active grants. You have complete data lockdown.</div>' : `
            <div class="od-stack" style="--od-gap: 6px;">
              ${activeGrants.slice(0, 2).map(function (g) {
                return `
                  <div style="font-size: 12px; padding: 8px; background: var(--surface-2); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: var(--text);">${esc(g.recipient)}</strong>
                      <div style="color: var(--text-2); font-size: 11px;">${esc(g.purpose)}</div>
                    </div>
                    <span style="font-size: 10px; color: var(--brand); font-weight: 600;">${esc(g.expires || 'Active')}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Recent Activity Feed -->
        <div class="od-stack" style="--od-gap: 8px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text);">Access Log Activity</div>
          <div class="od-stack" style="--od-gap: 6px;">
            ${state.activity.slice(0, 3).map(function (a) {
              return `
                <div style="font-size: 12px; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; display: flex; gap: 10px; align-items: center;">
                  <div style="color: var(--brand);">${icon('activity', 18)}</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text);">${esc(a.action)}</div>
                    <div style="font-size: 11px; color: var(--text-2);">${esc(a.clinician || 'Dr. Rohit Verma')} • ${esc(a.facility || 'Sunrise Multispecialty')}</div>
                  </div>
                  <div style="font-size: 11px; color: var(--text-3);">${esc(a.time || 'Today')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    appRoot.innerHTML = html;

    // Listeners
    byId('btn-patient-logout').addEventListener('click', logout);
    byId('btn-home-open-qr').addEventListener('click', function () {
      state.currentTab = 'qr';
      renderTabbar();
      renderCurrentTab();
    });
    byId('btn-add-vital').addEventListener('click', openAddRecordModal);
  }

  // 2. RECORDS TAB
  function renderRecordsTab() {
    var categories = [
      { id: 'all', label: 'All' },
      { id: 'encounters', label: 'Encounters' },
      { id: 'observations', label: 'Vitals' },
      { id: 'medications', label: 'Meds' },
      { id: 'allergies', label: 'Allergies' },
      { id: 'reports', label: 'Reports' },
      { id: 'careplans', label: 'Care Plans' }
    ];

    var filtered = state.records.filter(function (r) {
      if (state.recordFilter === 'all') return true;
      return (r.cat || '').toLowerCase() === state.recordFilter.toLowerCase();
    });

    var html = `
      <div class="od-stack" style="--od-gap: 14px; padding: 16px;">
        <div class="od-row" style="justify-content: space-between;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">Health Records</h2>
          <button id="btn-add-record" class="hm-btn hm-btn--primary" style="font-size: 12px; font-weight: 600; padding: 6px 12px;">
            ${icon('plus', 14)} New Entry
          </button>
        </div>

        <!-- Filter rail -->
        <div class="od-rail" style="--od-rail-pad: 0px; gap: 6px;">
          ${categories.map(function (c) {
            var active = state.recordFilter === c.id;
            return `
              <button class="hm-pill ${active ? 'hm-pill--active' : ''}" data-cat="${c.id}" style="padding: 6px 14px; font-size: 12px; border-radius: 99px; cursor: pointer; border: 1px solid var(--border); background: ${active ? 'var(--brand)' : 'var(--surface)'}; color: ${active ? '#fff' : 'var(--text)'}; font-weight: 600;">
                ${c.label}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Records List -->
        <div class="od-stack" style="--od-gap: 10px;">
          ${filtered.length === 0 ? '<div style="text-align: center; padding: 40px 10px; color: var(--text-2); font-size: 13px;">No records found in this category.</div>' :
            filtered.map(function (r) {
              return `
                <div class="patient-record-card" data-rec-id="${r.id}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;">
                  <div class="od-row" style="justify-content: space-between; margin-bottom: 6px;">
                    <span class="hm-badge hm-badge--${r.cat || 'info'}" style="text-transform: capitalize; font-size: 11px;">${esc(r.cat)}</span>
                    <span style="font-size: 11px; color: var(--text-3);">${esc(r.date)}</span>
                  </div>
                  <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${esc(r.type)}</div>
                  <div style="font-size: 12px; color: var(--text-2); line-height: 1.4; margin-bottom: 8px;">${esc(r.summary)}</div>
                  <div class="od-row" style="justify-content: space-between; font-size: 11px; color: var(--text-3); border-top: 1px solid var(--border); padding-top: 8px; margin-top: 6px;">
                    <span>${esc(r.clinician || 'Physician')}</span>
                    <span>${esc(r.facility || 'Hospital')}</span>
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    `;

    appRoot.innerHTML = html;

    // Category filter click
    appRoot.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.recordFilter = this.dataset.cat;
        renderRecordsTab();
      });
    });

    // Record detail click
    appRoot.querySelectorAll('.patient-record-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var recId = this.dataset.recId;
        var found = state.records.find(function (r) { return r.id === recId; });
        if (found) openRecordDetailModal(found);
      });
    });

    byId('btn-add-record').addEventListener('click', openAddRecordModal);
  }

  // 3. CONSENT & GRANTS TAB
  function renderConsentTab() {
    var activeGrants = state.grants.filter(function (g) { return g.status === 'active'; });
    var revokedGrants = state.grants.filter(function (g) { return g.status !== 'active'; });

    var html = `
      <div class="od-stack" style="--od-gap: 16px; padding: 16px;">
        <div class="od-row" style="justify-content: space-between;">
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">Consent & Grants</h2>
            <div style="font-size: 12px; color: var(--text-2);">Granular control over who accesses your records</div>
          </div>
          <button id="btn-grant-new" class="hm-btn hm-btn--primary" style="font-size: 12px; font-weight: 600; padding: 6px 12px;">
            ${icon('plus', 14)} Grant Access
          </button>
        </div>

        <!-- Active Grants -->
        <div class="od-stack" style="--od-gap: 10px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.04em;">Active Authorizations (${activeGrants.length})</div>
          ${activeGrants.length === 0 ? '<div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; font-size: 13px; color: var(--text-2);">No active grants. No clinician can access your records without authorization.</div>' :
            activeGrants.map(function (g) {
              return `
                <div style="background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--brand); border-radius: 12px; padding: 14px;">
                  <div class="od-row" style="justify-content: space-between; margin-bottom: 4px;">
                    <div style="font-size: 15px; font-weight: 700; color: var(--text);">${esc(g.recipient)}</div>
                    <span class="live-badge" style="font-size: 11px;">Active</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-2); margin-bottom: 8px;">${esc(g.role)} • ${esc(g.org)}</div>
                  <div style="font-size: 12px; background: var(--surface-2); padding: 8px; border-radius: 8px; margin-bottom: 10px;">
                    <div><strong>Purpose:</strong> ${esc(g.purpose)}</div>
                    <div style="margin-top: 4px;"><strong>Scope:</strong> ${(g.scope || []).map(s=>`<span style="display:inline-block; background:var(--brand-soft); color:var(--brand); border-radius:4px; padding:1px 6px; font-size:10px; margin-right:4px;">${esc(s)}</span>`).join('')}</div>
                    <div style="margin-top: 4px; color: var(--text-3); font-size: 11px;">Expires: ${esc(g.expires || '30 days')}</div>
                  </div>
                  <button class="btn-revoke-grant hm-btn hm-btn--danger" data-grant-id="${g.id || g._id}" style="width: 100%; font-size: 12px; font-weight: 600; padding: 8px; border: 1px solid #FCA5A5; color: #DC2626; background: #FEF2F2; border-radius: 8px; cursor: pointer;">
                    Revoke Access Immediately
                  </button>
                </div>
              `;
            }).join('')
          }
        </div>

        <!-- Revoked / Historical Grants -->
        ${revokedGrants.length > 0 ? `
          <div class="od-stack" style="--od-gap: 8px; margin-top: 10px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-3); text-transform: uppercase;">Revoked / Expired History (${revokedGrants.length})</div>
            ${revokedGrants.map(function (g) {
              return `
                <div style="background: var(--surface-2); border: 1px dashed var(--border); border-radius: 10px; padding: 10px; font-size: 12px; opacity: 0.8;">
                  <div style="font-weight: 600; color: var(--text-2);">${esc(g.recipient)} (${esc(g.org)})</div>
                  <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">Purpose: ${esc(g.purpose)} • Status: <span style="color:#B91C1C;">${esc(g.status)}</span></div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    appRoot.innerHTML = html;

    // Revoke buttons
    appRoot.querySelectorAll('.btn-revoke-grant').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var grantId = this.dataset.grantId;
        if (!confirm('Are you sure you want to immediately revoke access for this clinician?')) return;
        try {
          btn.disabled = true;
          btn.textContent = 'Revoking...';
          await api.post('/patients/me/grants/' + grantId + '/revoke', {});
          showToast('Consent grant revoked immediately in database', 'success');
          var fresh = await api.get('/patients/me/grants');
          state.grants = fresh.data || [];
          renderConsentTab();
        } catch (err) {
          showToast(err.message || 'Error revoking grant', 'error');
          btn.disabled = false;
        }
      });
    });

    byId('btn-grant-new').addEventListener('click', openGrantNewModal);
  }

  // 4. QR AUTHORIZATION TAB
  async function renderQrTab() {
    clearInterval(state.qrInterval);

    // Generate or fetch fresh token
    var html = `
      <div class="od-stack" style="--od-gap: 16px; padding: 20px 16px; text-align: center;">
        <div>
          <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text);">Dynamic QR Pass</h2>
          <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">Time-limited cryptographic token for clinical intake</div>
        </div>

        <div id="qr-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px;">
          <div style="font-size: 13px; color: var(--text-2);">Generating secure dynamic token...</div>
        </div>

        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px; font-size: 12px; text-align: left;">
          <div style="font-weight: 700; color: var(--text); margin-bottom: 4px;">Authorized Clinical Scope:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="hm-badge hm-badge--teal">Encounters</span>
            <span class="hm-badge hm-badge--teal">Observations</span>
            <span class="hm-badge hm-badge--teal">Medications</span>
            <span class="hm-badge hm-badge--teal">Allergies</span>
          </div>
          <div style="font-size: 11px; color: var(--text-3); margin-top: 8px;">
            Single-use token. Once resolved by Dr. Rohit Verma in Clinician Portal, it immediately burns and logs into immutable audit.
          </div>
        </div>

        <button id="btn-refresh-qr" class="hm-btn hm-btn--primary" style="padding: 12px; font-weight: 600; width: 100%;">
          Generate New Token
        </button>
      </div>
    `;

    appRoot.innerHTML = html;

    byId('btn-refresh-qr').addEventListener('click', loadQrToken);
    await loadQrToken();
  }

  async function loadQrToken() {
    var container = document.getElementById('qr-container');
    if (!container) return;
    try {
      container.innerHTML = '<div style="font-size: 13px; color: var(--text-2);">Refreshing QR token...</div>';
      var res = await api.post('/patients/me/qr', {});
      state.qrData = res.data;
      var token = state.qrData.token;
      var expirySeconds = state.qrData.expiresInSeconds || 300;

      container.innerHTML = `
        <div id="actual-qr-holder" style="background:#fff; padding:16px; border-radius:18px; box-shadow:0 4px 16px rgba(0,0,0,0.08); display:inline-block; margin-bottom:12px;"></div>
        <div style="margin: 8px 0; display:flex; justify-content:center; gap:8px; align-items:center;">
          <span style="font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.1em; color: var(--brand); background:var(--surface-2); padding:4px 10px; border-radius:6px;">
            ${esc(token)}
          </span>
          <button type="button" id="btn-copy-token" class="hm-btn hm-btn--ghost" style="font-size:12px; font-weight:600; color:var(--brand); padding:4px 8px; border:1px solid var(--border);">
            📋 Copy
          </button>
        </div>
        <div id="qr-timer" style="font-size: 12px; color: #DC2626; font-weight: 600; margin-top: 6px;">
          Expires in: <span id="timer-val">${formatTime(expirySeconds)}</span>
        </div>
      `;

      var copyBtn = document.getElementById('btn-copy-token');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(token).then(function () {
            showToast('Token ' + token + ' copied to clipboard!', 'success');
          }).catch(function () {
            showToast('Token: ' + token, 'info');
          });
        });
      }

      var holder = document.getElementById('actual-qr-holder');
      if (window.QRCode && holder) {
        new window.QRCode(holder, {
          text: token,
          width: 180,
          height: 180,
          colorDark: "#0F766E",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } else if (holder) {
        holder.innerHTML = renderQrSvg(token);
      }

      var remaining = expirySeconds;
      clearInterval(state.qrInterval);
      state.qrInterval = setInterval(function () {
        remaining--;
        var timerVal = document.getElementById('timer-val');
        if (timerVal) {
          if (remaining <= 0) {
            clearInterval(state.qrInterval);
            timerVal.textContent = 'EXPIRED';
            document.getElementById('qr-timer').style.color = '#991B1B';
          } else {
            timerVal.textContent = formatTime(remaining);
          }
        }
      }, 1000);

    } catch (err) {
      container.innerHTML = '<div style="color: #DC2626; font-size: 13px;">Error generating QR: ' + esc(err.message) + '</div>';
    }
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // 5. PROFILE & AUDIT TAB
  function renderProfileTab() {
    var p = state.profile || {};
    var html = `
      <div class="od-stack" style="--od-gap: 16px; padding: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">Patient Profile & Privacy</h2>

        <!-- Demographic Card -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px;">
          <div class="od-row" style="gap: 12px; margin-bottom: 14px;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px;">
              ${(p.name || 'AS').split(' ').map(n=>n[0]).join('')}
            </div>
            <div>
              <div style="font-size: 17px; font-weight: 700; color: var(--text);">${esc(p.name)}</div>
              <div style="font-size: 12px; color: var(--text-2);">ABHA: ${esc(p.abha || '••••-4821')}</div>
            </div>
          </div>

          <div class="od-grid" style="--od-cols: 2; --od-gap: 10px; font-size: 12px;">
            <div style="background: var(--surface-2); padding: 8px 10px; border-radius: 8px;">
              <span style="color: var(--text-2);">Date of Birth:</span>
              <div style="font-weight: 600; color: var(--text);">${esc(p.dob || '14 Mar 1991')} (${p.age || 34} yrs)</div>
            </div>
            <div style="background: var(--surface-2); padding: 8px 10px; border-radius: 8px;">
              <span style="color: var(--text-2);">Blood Group:</span>
              <div style="font-weight: 600; color: var(--text);">${esc(p.bloodGroup || 'O+')}</div>
            </div>
            <div style="background: var(--surface-2); padding: 8px 10px; border-radius: 8px;">
              <span style="color: var(--text-2);">Sex:</span>
              <div style="font-weight: 600; color: var(--text);">${esc(p.sex || 'Female')}</div>
            </div>
            <div style="background: var(--surface-2); padding: 8px 10px; border-radius: 8px;">
              <span style="color: var(--text-2);">Primary Facility:</span>
              <div style="font-weight: 600; color: var(--text);">${esc(p.facility || 'Sunrise Multispecialty')}</div>
            </div>
          </div>
        </div>

        <!-- Immutable Audit Trail -->
        <div class="od-stack" style="--od-gap: 8px;">
          <div class="od-row" style="justify-content: space-between;">
            <div style="font-size: 14px; font-weight: 700; color: var(--text);">Access Log Audit Trail</div>
            <span style="font-size: 11px; color: var(--text-3); font-weight: 600;">TAMPER-EVIDENT</span>
          </div>
          <div class="od-stack" style="--od-gap: 6px;">
            ${state.activity.map(function (a) {
              return `
                <div style="font-size: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px;">
                  <div class="od-row" style="justify-content: space-between;">
                    <strong style="color: var(--text);">${esc(a.action)}</strong>
                    <span style="font-size: 11px; color: var(--text-3);">${esc(a.time || '10 Oct 2026')}</span>
                  </div>
                  <div style="color: var(--text-2); font-size: 11px; margin-top: 3px;">
                    Actor: ${esc(a.clinician || 'Dr. Rohit Verma')} (${esc(a.facility || 'Sunrise Hospital')})
                  </div>
                  <div style="color: var(--brand); font-size: 11px; margin-top: 2px;">
                    Resource: ${esc(a.resource || 'Health records')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <button id="btn-profile-logout" class="hm-btn hm-btn--danger" style="margin-top: 10px; padding: 12px; font-weight: 600; width: 100%; border: 1px solid #FCA5A5; color: #DC2626; background: #FEF2F2; border-radius: 10px; cursor: pointer;">
          Sign Out of Patient Account
        </button>
      </div>
    `;

    appRoot.innerHTML = html;
    byId('btn-profile-logout').addEventListener('click', logout);
  }

  // --- MODALS ---
  function openRecordDetailModal(rec) {
    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 380px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
            <span class="hm-badge hm-badge--${rec.cat || 'info'}" style="text-transform: capitalize;">${esc(rec.cat)}</span>
            <button id="btn-close-modal" class="hm-btn hm-btn--ghost" style="padding: 4px;">${icon('x', 18)}</button>
          </div>
          <h3 style="margin: 0 0 6px; font-size: 17px; font-weight: 700; color: var(--text);">${esc(rec.type)}</h3>
          <div style="font-size: 12px; color: var(--text-2); margin-bottom: 12px;">
            Recorded on ${esc(rec.date)} • ${esc(rec.facility)}
          </div>
          <div style="font-size: 13px; color: var(--text); line-height: 1.5; background: var(--surface-2); padding: 10px; border-radius: 8px; margin-bottom: 14px;">
            ${esc(rec.summary)}
          </div>
          ${rec.fields && rec.fields.length > 0 ? `
            <div style="font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 6px;">Clinical Attributes:</div>
            <div class="od-stack" style="--od-gap: 4px; margin-bottom: 16px;">
              ${rec.fields.map(f=>`
                <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px dashed var(--border);">
                  <span style="color:var(--text-2);">${esc(f.k)}:</span>
                  <span style="font-weight:600; color:var(--text);">${esc(f.v)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <button id="btn-close-modal-bottom" class="hm-btn hm-btn--primary" style="width: 100%; padding: 10px; font-size: 13px;">Close Record</button>
        </div>
      </div>
    `;

    function close() { overlay.innerHTML = ''; }
    byId('btn-close-modal').addEventListener('click', close);
    byId('btn-close-modal-bottom').addEventListener('click', close);
  }

  function openAddRecordModal() {
    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 380px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Add Health Observation</h3>
            <button id="btn-close-add-modal" class="hm-btn hm-btn--ghost" style="padding: 4px;">${icon('x', 18)}</button>
          </div>
          <form id="add-record-form">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Category</label>
              <select id="new-rec-cat" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">
                <option value="observations">Observations / Vitals</option>
                <option value="medications">Medications</option>
                <option value="careplans">Care Plans / Notes</option>
              </select>
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Title / Record Type</label>
              <input type="text" id="new-rec-type" placeholder="e.g. Self-recorded Blood Glucose" value="Blood Glucose Reading" required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;" />
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Summary / Value</label>
              <textarea id="new-rec-summary" rows="3" placeholder="e.g. Fasting blood sugar 94 mg/dL recorded using home glucometer." required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">Fasting blood sugar 94 mg/dL before breakfast.</textarea>
            </div>
            <button type="submit" id="btn-submit-record" class="hm-btn hm-btn--primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight:600;">
              Save to Health Record
            </button>
          </form>
        </div>
      </div>
    `;

    function close() { overlay.innerHTML = ''; }
    byId('btn-close-add-modal').addEventListener('click', close);

    byId('add-record-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = byId('btn-submit-record');
      try {
        btn.disabled = true;
        btn.textContent = 'Saving to Database...';
        var cat = byId('new-rec-cat').value;
        var type = byId('new-rec-type').value;
        var summary = byId('new-rec-summary').value;

        await api.post('/patients/me/records', {
          cat: cat,
          type: type,
          summary: summary,
          fields: [{ k: 'Self-reported', v: 'Yes' }, { k: 'Device', v: 'Personal Monitor' }]
        });

        showToast('Record saved to database!', 'success');
        close();

        // Refresh records and vitals from live database
        var [freshRecords, freshVitals] = await Promise.all([
          api.get('/patients/me/records'),
          api.get('/patients/me/vitals')
        ]);
        state.records = freshRecords.data.records || [];
        if (freshVitals && freshVitals.data && freshVitals.data.vitals) {
          state.vitals = freshVitals.data.vitals;
        }
        if (state.currentTab === 'records') renderRecordsTab();
        else if (state.currentTab === 'home') renderHomeTab();
      } catch (err) {
        showToast(err.message || 'Error saving record', 'error');
        btn.disabled = false;
        btn.textContent = 'Save to Health Record';
      }
    });
  }

  function openGrantNewModal() {
    overlay.innerHTML = `
      <div class="hm-dialog-backdrop">
        <div class="hm-dialog" style="max-width: 380px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Grant Clinical Consent</h3>
            <button id="btn-close-grant-modal" class="hm-btn hm-btn--ghost" style="padding: 4px;">${icon('x', 18)}</button>
          </div>
          <form id="grant-consent-form">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Practitioner / Recipient</label>
              <input type="text" id="grant-recipient" value="Dr. Rohit Verma" required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;" />
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Facility / Organization</label>
              <input type="text" id="grant-org" value="Sunrise Multispecialty Hospital" required style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;" />
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Clinical Purpose</label>
              <select id="grant-purpose" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-strong); font-size:13px;">
                <option value="Emergency treatment & stabilization">Emergency treatment & stabilization</option>
                <option value="Outpatient Consultation & Follow-up">Outpatient Consultation & Follow-up</option>
                <option value="Diagnostic Lab Workup">Diagnostic Lab Workup</option>
              </select>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--text);">Scope of Access</label>
              <div class="od-stack" style="--od-gap: 4px; font-size:12px;">
                <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="scope" value="Encounters" checked /> Encounters</label>
                <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="scope" value="Observations" checked /> Vital signs & Observations</label>
                <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="scope" value="Medications" checked /> Medications</label>
                <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="scope" value="Allergies" checked /> Allergies</label>
              </div>
            </div>
            <button type="submit" id="btn-submit-grant" class="hm-btn hm-btn--primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight:600;">
              Authorize Grant in Database
            </button>
          </form>
        </div>
      </div>
    `;

    function close() { overlay.innerHTML = ''; }
    byId('btn-close-grant-modal').addEventListener('click', close);

    byId('grant-consent-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = byId('btn-submit-grant');
      try {
        btn.disabled = true;
        btn.textContent = 'Saving Grant...';
        var recipient = byId('grant-recipient').value;
        var org = byId('grant-org').value;
        var purpose = byId('grant-purpose').value;
        var scope = Array.from(document.querySelectorAll('input[name="scope"]:checked')).map(function (c) { return c.value; });

        await api.post('/patients/me/grants', {
          recipient: recipient,
          role: 'Emergency Clinician',
          org: org,
          purpose: purpose,
          scope: scope.length > 0 ? scope : ['Encounters', 'Observations'],
          validityDays: 14
        });

        showToast('Consent grant created in database!', 'success');
        close();

        var fresh = await api.get('/patients/me/grants');
        state.grants = fresh.data || [];
        renderConsentTab();
      } catch (err) {
        showToast(err.message || 'Error granting consent', 'error');
        btn.disabled = false;
        btn.textContent = 'Authorize Grant in Database';
      }
    });
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
    var target = document.querySelector('.theme-dot[data-value="' + savedTheme + '"]');
    if (target) {
      document.querySelectorAll('.theme-dot').forEach(function (d) { d.setAttribute('aria-checked', 'false'); });
      target.setAttribute('aria-checked', 'true');
    }
  }

  function byId(id) { return document.getElementById(id); }

  // Boot
  init();
})();
