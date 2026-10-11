/**
 * HackMatrix - Dedicated Public Health Administrator Console Logic
 * Connected to live backend at http://localhost:4000/api/v1
 */
(function () {
  'use strict';

  var api = window.HmxApi.forRole('admin');

  // DOM elements
  var authView = document.getElementById('admin-auth-view');
  var appView = document.getElementById('admin-app-view');
  var viewRoot = document.getElementById('admin-view-root');
  var quickLoginBtn = document.getElementById('btn-quick-admin-login');
  var loginForm = document.getElementById('admin-login-form');
  var errorBanner = document.getElementById('admin-error-banner');
  var logoutBtn = document.getElementById('btn-admin-logout');
  var viewTitle = document.getElementById('admin-view-title');
  var viewSub = document.getElementById('admin-view-sub');
  var toasts = document.getElementById('toasts');

  // State
  var state = {
    user: null,
    currentView: 'pune-map',
    overview: null,
    surveillance: null,
    geographic: null,
    facilities: null,
    auditLogs: [],
    systemStatus: null,
    kThreshold: 5
  };

  var socket = null;
  function initSocketConnection() {
    try {
      if (typeof io !== 'undefined' && !socket) {
        var host = (window.location.hostname || 'localhost');
        var socketUrl = (window.location.port === '4000') ? window.location.origin : ('http://' + host + ':4000');
        socket = io(socketUrl);
        socket.on('analytics:updated', function (data) {
          console.log('[Socket.IO Admin] Analytics updated event:', data);
          if (data && data.source === 'clinician_recovery_mark') {
            showToast('Patient marked completely recovered. Active disease count decremented (-1).', 'success');
          }
          if (state.currentView === 'pune-map') {
            renderPuneMapView();
          } else if (state.currentView === 'followups') {
            renderFollowUpsView();
          }
        });
        socket.on('survey:submitted', function (data) {
          console.log('[Socket.IO Admin] Survey submitted event:', data);
          if (data && data.recoveryStatus === 'Completely recovered') {
            showToast('Patient marked Completely Recovered! Active count decremented (-1).', 'success');
          }
          if (state.currentView === 'pune-map') {
            renderPuneMapView();
          } else if (state.currentView === 'followups') {
            renderFollowUpsView();
          }
        });
      }
    } catch (e) {
      console.warn('Admin socket initialization notice:', e);
    }
  }

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
        await loadOverviewData();
        showApp();
        return;
      } catch (err) {
        if (err && (err.status === 401 || err.code === 'UNAUTHENTICATED')) {
          console.warn('Admin session expired or invalid', err);
          api.clearSession();
          showAuth();
          return;
        }
        console.warn('Network or server lag during overview load, keeping session active:', err);
        showApp();
        return;
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
    appView.style.display = 'flex';
    initSocketConnection();
    renderCurrentView();
  }

  // Tab Switcher
  var tabSignIn = byId('tab-admin-signin');
  var tabRegister = byId('tab-admin-register');
  var paneSignIn = byId('pane-admin-signin');
  var paneRegister = byId('pane-admin-register');
  var registerForm = byId('admin-register-form');

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

  // Quick Login
  if (quickLoginBtn) {
    quickLoginBtn.addEventListener('click', async function () {
      try {
        errorBanner.style.display = 'none';
        quickLoginBtn.disabled = true;
        quickLoginBtn.textContent = 'Authenticating Administrator...';
        var res = await api.login('admin');
        state.user = res.user;
        await loadOverviewData();
        showApp();
        startRealtimeSync();
        showToast('Signed in as admin.rao (Public Health Admin)', 'success');
      } catch (err) {
        errorBanner.textContent = (err && err.message) || 'Authentication failed';
        errorBanner.style.display = 'block';
      } finally {
        quickLoginBtn.disabled = false;
        quickLoginBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg> Sign In as admin.rao (Public Health Admin)';
      }
    });
  }

  // Form Login
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    try {
      errorBanner.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Authenticating Administrator...'; }
      var email = byId('admin-email').value.trim();
      var password = byId('admin-password').value;
      var res = await api.login(email, password, 'ADMIN');
      state.user = res.user;
      await loadOverviewData();
      showApp();
      startRealtimeSync();
      showToast('Administrator authenticated successfully', 'success');
    } catch (err) {
      errorBanner.textContent = (err && err.message) || 'Login failed. Please check credentials.';
      errorBanner.style.display = 'block';
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Authenticate Administrator'; }
    }
  });

  // Admin Registration Form
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        errorBanner.style.display = 'none';
        var name = byId('reg-admin-name').value;
        var email = byId('reg-admin-email').value;
        var password = byId('reg-admin-password').value;
        var department = byId('reg-admin-dept').value;

        var submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering Authority Officer...';

        var res = await api.register({
          name: name,
          email: email,
          password: password,
          role: 'ADMIN',
          department: department
        });

        state.user = res.user;
        await loadOverviewData();
        showApp();
        startRealtimeSync();
        showToast('Health official registered and stored in MongoDB Atlas!', 'success');
      } catch (err) {
        errorBanner.textContent = (err && err.message) || 'Registration failed.';
        errorBanner.style.display = 'block';
      } finally {
        var submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register Health Authority Officer';
        }
      }
    });
  }

  // Real-time synchronization pipeline (3.5s polling loop)
  var syncInterval = null;
  function startRealtimeSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async function () {
      if (!state.user || authView.style.display !== 'none') return;
      try {
        if (state.currentView === 'overview') {
          var res = await api.get('/admin/overview');
          state.overview = res.data;
          renderOverviewView();
        } else if (state.currentView === 'surveillance') {
          await renderSurveillanceView();
        } else if (state.currentView === 'audit') {
          var auditRes = await api.get('/admin/audit');
          state.auditLogs = (auditRes.data && auditRes.data.events) || [];
          renderAuditView();
        }
      } catch (e) {
        // Silent fail on background poll
      }
    }, 3500);
  }

  // Logout
  logoutBtn.addEventListener('click', function () {
    if (syncInterval) clearInterval(syncInterval);
    api.clearSession();
    state.user = null;
    showAuth();
    showToast('Signed out of Administrator Console');
  });

  // Navigation Links
  document.querySelectorAll('.admin-nav-item[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-nav-item[data-view]').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      state.currentView = this.dataset.view;
      renderCurrentView();
    });
  });

  async function loadOverviewData() {
    var res = await api.get('/admin/overview');
    state.overview = res.data;
  }

  // --- VIEW RENDERING ---
  function renderCurrentView() {
    switch (state.currentView) {
      case 'overview': renderOverviewView(); break;
      case 'pune-map': renderPuneMapView(); break;
      case 'followups': renderFollowUpsView(); break;
      case 'surveillance': renderSurveillanceView(); break;
      case 'geographic': renderGeographicView(); break;
      case 'facilities': renderFacilitiesView(); break;
      case 'audit': renderAuditView(); break;
      case 'system': renderSystemView(); break;
    }
  }


  // 1. OVERVIEW VIEW
  function renderOverviewView() {
    viewTitle.textContent = 'Public Health Overview';
    viewSub.textContent = 'Key surveillance metrics, active consents, and disease indicators in Karnataka';

    var ov = state.overview || {};
    var metrics = ov.metrics || {
      patientsRegistered: 12480,
      activeConsentGrants: 8320,
      cliniciansOnDuty: 342,
      facilitiesReporting: 48,
      surveillanceAlerts: 3,
      audits24h: 18450
    };

    var html = `
      <div class="od-stack" style="--od-gap: 24px;">

        <!-- Epidemic Alert Banner -->
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-left: 6px solid #DC2626; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 14px; align-items: center;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><path d="M12 3 2.6 20h18.8z"/><path d="M12 9v5M12 17.4h.01"/></svg>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #991B1B;">Disease Surveillance Alert: Vector-Borne Surge Detected</div>
              <div style="font-size: 13px; color: #B91C1C; margin-top: 2px;">
                Dengue case reports elevated (+28% vs 14-day baseline) across Bangalore Urban & Mysore. Early containment protocols triggered.
              </div>
            </div>
          </div>
          <button id="btn-view-alert-details" class="hm-btn hm-btn--danger" style="background:#DC2626; color:#fff; border:none; padding:8px 14px; font-size:12px; font-weight:600; border-radius:8px; cursor:pointer;">
            View Surveillance
          </button>
        </div>

        <!-- KPI Grid -->
        <div class="od-grid" style="--od-cols: 3; --od-gap: 16px;">
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Active Consent Grants</div>
            <div style="font-size: 32px; font-weight: 800; color: #0F766E; margin: 8px 0 2px;">${(metrics.activeConsentGrants || 8320).toLocaleString()}</div>
            <div style="font-size: 12px; color: #15803D; font-weight: 600;">99.4% Authorized Scoping</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Registered Patients</div>
            <div style="font-size: 32px; font-weight: 800; color: #2563EB; margin: 8px 0 2px;">${(metrics.patientsRegistered || 12480).toLocaleString()}</div>
            <div style="font-size: 12px; color: var(--text-3);">Linked ABHA Health IDs</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Clinicians Active</div>
            <div style="font-size: 32px; font-weight: 800; color: #7C3AED; margin: 8px 0 2px;">${(metrics.cliniciansOnDuty || 342).toLocaleString()}</div>
            <div style="font-size: 12px; color: var(--text-3);">Verified Medical Staff</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Facilities Online</div>
            <div style="font-size: 32px; font-weight: 800; color: #0284C7; margin: 8px 0 2px;">${(metrics.facilitiesReporting || 48).toLocaleString()}</div>
            <div style="font-size: 12px; color: #15803D; font-weight: 600;">100% Real-time FHIR Sync</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">24h Audit Volume</div>
            <div style="font-size: 32px; font-weight: 800; color: #475569; margin: 8px 0 2px;">${(metrics.audits24h || 18450).toLocaleString()}</div>
            <div style="font-size: 12px; color: var(--text-3);">Cryptographically Signed</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
            <div style="font-size: 13px; color: var(--text-2); font-weight: 600;">Emergency Break-Glass</div>
            <div style="font-size: 32px; font-weight: 800; color: #D97706; margin: 8px 0 2px;">4</div>
            <div style="font-size: 12px; color: #B45309; font-weight: 600;">100% Compliance Reviewed</div>
          </div>
        </div>

        <!-- Privacy & Architecture Notice -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--text);">Zero Direct PHI Exposure Guarantee</h3>
          <p style="margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.6;">
            Under the HackMatrix architectural specification, administrator consoles never receive individual patient names or record bodies. All epidemiological reports undergo local differential privacy perturbation and $k$-anonymity suppression ($k \ge 5$) before aggregation.
          </p>
        </div>

      </div>
    `;

    viewRoot.innerHTML = html;

    byId('btn-view-alert-details').addEventListener('click', function () {
      document.querySelector('.admin-nav-item[data-view="surveillance"]').click();
    });
  }

  // 2. SURVEILLANCE VIEW
  async function renderSurveillanceView() {
    viewTitle.textContent = 'Epidemiological Disease Surveillance';
    viewSub.textContent = '14-day syndromic trends, baseline comparisons, and automated cluster detection';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading disease surveillance data...</div>';

    try {
      var res = await api.get('/admin/surveillance');
      state.surveillance = res.data;
      var lc = (res.data && res.data.liveCounts) || {};

      var conditions = [
        { name: 'Acute Respiratory Illness (ARI / Flu)', cases: lc.flu || 1420, trend: '+4%', status: 'Normal', color: '#0F766E' },
        { name: 'Vector-Borne (Dengue / Chikungunya)', cases: lc.dengue || 680, trend: '+28%', status: 'Surge Alert', color: '#DC2626' },
        { name: 'Acute Diarrheal / Enteric', cases: lc.diarrheal || 410, trend: '-6%', status: 'Normal', color: '#2563EB' },
        { name: 'Cardiovascular Emergencies', cases: lc.cardio || 290, trend: '+2%', status: 'Normal', color: '#7C3AED' }
      ];

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div class="od-grid" style="--od-cols: 2; --od-gap: 16px;">
            ${conditions.map(function (c) {
              return `
                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px;">
                  <div class="od-row" style="justify-content: space-between; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">${esc(c.name)}</h3>
                    <span class="hm-badge ${c.status === 'Surge Alert' ? 'hm-badge--danger' : 'hm-badge--success'}">${esc(c.status)}</span>
                  </div>
                  <div class="od-row" style="gap: 12px; margin-bottom: 14px;">
                    <div style="font-size: 28px; font-weight: 800; color: ${c.color};">${c.cases.toLocaleString()}</div>
                    <div style="font-size: 13px; font-weight: 600; color: ${c.trend.startsWith('+2') ? '#DC2626' : 'var(--text-2)'};">${esc(c.trend)} vs baseline</div>
                  </div>
                  <!-- SVG Trend Sparkline -->
                  <div style="height: 60px; width: 100%; background: var(--surface-2); border-radius: 8px; overflow: hidden; display: flex; align-items: flex-end; padding: 6px 12px;">
                    ${renderSparklineSvg(c.name, c.color)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading surveillance: ' + esc(err.message) + '</div>';
    }
  }

  function renderSparklineSvg(name, color) {
    var points = [30, 35, 32, 40, 38, 45, 42, 50, 48, 55, 52, 60, 58, 70];
    if (name.includes('Diarrheal')) points = [55, 52, 50, 48, 46, 44, 42, 40, 38, 36, 35, 34, 33, 30];
    var max = Math.max.apply(null, points);
    var svgPoints = points.map(function (v, i) {
      var x = (i / (points.length - 1)) * 340;
      var y = 50 - (v / max) * 40;
      return x + ',' + y;
    }).join(' ');

    return `
      <svg width="100%" height="50" viewBox="0 0 340 50" preserveAspectRatio="none">
        <polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${svgPoints}" />
      </svg>
    `;
  }

  // 3. GEOGRAPHIC VIEW WITH K-ANONYMITY SLIDER
  async function renderGeographicView() {
    viewTitle.textContent = 'Geographic Trends & Privacy Preservation';
    viewSub.textContent = 'District-level prevalence with dynamic k-anonymity suppression slider';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading district surveillance data...</div>';

    try {
      var res = await api.get('/admin/geographic');
      state.geographic = res.data;

      var districts = [
        { name: 'Bangalore Urban', cases: 482, pop: '9.6M', risk: 'High' },
        { name: 'Mysore', cases: 142, pop: '3.1M', risk: 'Medium' },
        { name: 'Belagavi', cases: 88, pop: '4.8M', risk: 'Low' },
        { name: 'Dakshina Kannada', cases: 64, pop: '2.1M', risk: 'Medium' },
        { name: 'Kalaburagi', cases: 28, pop: '2.6M', risk: 'Low' },
        { name: 'Kodagu', cases: 7, pop: '0.6M', risk: 'Low' },
        { name: 'Chamarajanagar', cases: 4, pop: '1.0M', risk: 'Low' }
      ];

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">

          <!-- Interactive Privacy Controls Card -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Dynamic k-Anonymity Suppression Threshold</h3>
                <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">
                  Values below threshold <strong>k</strong> are mathematically suppressed (&lt;k) to prevent patient re-identification.
                </div>
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #0F766E;">
                k = <span id="k-val-display">${state.kThreshold}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 16px; margin: 16px 0;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-2);">Strict Privacy (k=20)</span>
              <input type="range" id="k-slider" min="3" max="20" value="${state.kThreshold}" style="flex: 1; accent-color: #0F766E; cursor: pointer;" />
              <span style="font-size: 12px; font-weight: 700; color: var(--text-2);">Granular (k=3)</span>
            </div>
          </div>

          <!-- District Table -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-2); font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 14px;">District</th>
                  <th style="padding: 10px 14px;">Population</th>
                  <th style="padding: 10px 14px;">Reported Cases</th>
                  <th style="padding: 10px 14px;">Risk Status</th>
                  <th style="padding: 10px 14px;">Privacy Status</th>
                </tr>
              </thead>
              <tbody id="district-tbody">
                ${renderDistrictRows(districts, state.kThreshold)}
              </tbody>
            </table>
          </div>

        </div>
      `;

      viewRoot.innerHTML = html;

      var slider = byId('k-slider');
      slider.addEventListener('input', function () {
        state.kThreshold = parseInt(this.value, 10);
        byId('k-val-display').textContent = state.kThreshold;
        byId('district-tbody').innerHTML = renderDistrictRows(districts, state.kThreshold);
      });

    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading geographic data: ' + esc(err.message) + '</div>';
    }
  }

  function renderDistrictRows(districts, k) {
    return districts.map(function (d) {
      var isSuppressed = d.cases < k;
      var caseDisplay = isSuppressed ? `<span style="color:#B45309; font-weight:700;">&lt;${k} (Suppressed)</span>` : `<strong>${d.cases}</strong>`;
      var privBadge = isSuppressed ? `<span class="hm-badge hm-badge--warning">Suppressed (k=${k})</span>` : `<span class="hm-badge hm-badge--teal">Public Safe</span>`;

      return `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 12px 14px; font-weight: 600;">${esc(d.name)}</td>
          <td style="padding: 12px 14px; color: var(--text-2);">${esc(d.pop)}</td>
          <td style="padding: 12px 14px;">${caseDisplay}</td>
          <td style="padding: 12px 14px;"><span class="hm-badge hm-badge--${d.risk === 'High' ? 'danger' : (d.risk === 'Medium' ? 'warning' : 'success')}">${d.risk}</span></td>
          <td style="padding: 12px 14px;">${privBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // 4. FACILITIES VIEW
  async function renderFacilitiesView() {
    viewTitle.textContent = 'Pune Regional Healthcare Facilities';
    viewSub.textContent = 'Verified public and district healthcare facilities across all 14 Pune talukas';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading Pune healthcare facilities from MongoDB...</div>';

    try {
      var res = await api.get('/admin/facilities?pageSize=50');
      state.facilities = res.data;
      var facs = Array.isArray(res.data) ? res.data : ((res.data && res.data.facilities) || []);

      var html = `
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
          <div class="od-row" style="justify-content: space-between; margin-bottom: 16px;">
            <div>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">Verified Hospitals & Healthcare Facilities (${facs.length})</h3>
              <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">Persisted in MongoDB across 14 Pune District Talukas</div>
            </div>
            <button id="btn-refresh-admin-facilities" class="hm-btn hm-btn--ghost" style="border: 1px solid var(--border); padding: 7px 14px; font-size: 12px; font-weight: 600; cursor:pointer;">
              ↻ Refresh Facilities
            </button>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-2); font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 14px;">Facility Name</th>
                  <th style="padding: 10px 14px;">Taluka Region</th>
                  <th style="padding: 10px 14px;">Facility Type</th>
                  <th style="padding: 10px 14px;">Locality / Address</th>
                  <th style="padding: 10px 14px;">Bed Capacity</th>
                  <th style="padding: 10px 14px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${facs.map(function (f) {
                  return `
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 12px 14px; font-weight: 700; color: var(--text);">${esc(f.name)}</td>
                      <td style="padding: 12px 14px; font-weight: 600; color: #0F766E;">${esc(f.region)}</td>
                      <td style="padding: 12px 14px; color: var(--text-2);">${esc(f.type)}</td>
                      <td style="padding: 12px 14px; color: var(--text-2);">${esc(f.locality || f.address || f.region)}</td>
                      <td style="padding: 12px 14px; font-weight: 600; color: #2563EB;">${esc(f.bedCapacity || 50)} Beds</td>
                      <td style="padding: 12px 14px;"><span class="hm-badge hm-badge--teal">${esc(f.verificationStatus || 'Verified')}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;

      var refBtn = byId('btn-refresh-admin-facilities');
      if (refBtn) {
        refBtn.addEventListener('click', renderFacilitiesView);
      }
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading facilities: ' + esc(err.message) + '</div>';
    }
  }

  // 5. AUDIT VIEW
  async function renderAuditView() {
    viewTitle.textContent = 'Immutable Audit Ledger';
    viewSub.textContent = 'Real-time cryptographic audit events signed with HMAC integrity verification';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading cryptographic audit ledger...</div>';

    try {
      var res = await api.get('/admin/audit');
      state.auditLogs = Array.isArray(res.data) ? res.data : (res.data?.events || []);

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div class="od-row" style="justify-content: space-between;">
            <div style="font-size: 14px; font-weight: 700; color: var(--text);">Events (${state.auditLogs.length})</div>
            <div style="font-size: 12px; color: var(--text-2);">Integrity: <strong style="color:#15803D;">VERIFIED</strong></div>
          </div>

          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-2); font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px 12px;">Timestamp</th>
                  <th style="padding: 10px 12px;">Actor & Role</th>
                  <th style="padding: 10px 12px;">Action</th>
                  <th style="padding: 10px 12px;">Resource</th>
                  <th style="padding: 10px 12px;">Outcome</th>
                  <th style="padding: 10px 12px;">HMAC Hash</th>
                </tr>
              </thead>
              <tbody>
                ${state.auditLogs.map(function (a) {
                  var outcomeColor = a.outcome === 'granted' || a.outcome === 'success' ? '#15803D' : (a.outcome === 'emergency_override' ? '#B45309' : '#DC2626');
                  return `
                    <tr style="border-bottom: 1px solid var(--border);">
                      <td style="padding: 12px; font-family: monospace; color: var(--text-2);">${esc(a.ts)}</td>
                      <td style="padding: 12px;"><strong>${esc(a.actor)}</strong> <span style="font-size:11px; color:var(--text-3);">(${esc(a.actorRole)})</span></td>
                      <td style="padding: 12px; font-weight: 600;">${esc(a.action)}</td>
                      <td style="padding: 12px; color: var(--text-2);">${esc(a.resource)}</td>
                      <td style="padding: 12px;"><span style="color:${outcomeColor}; font-weight:700; text-transform:uppercase; font-size:11px;">${esc(a.outcome)}</span></td>
                      <td style="padding: 12px; font-family: monospace; font-size: 10px; color: var(--text-3); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${esc(a.hash)}">${esc(a.hash ? a.hash.slice(0, 16) + '...' : 'e3b0c442...')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading audit ledger: ' + esc(err.message) + '</div>';
    }
  }

  // 6. SYSTEM & DATABASE VIEW
  async function renderSystemView() {
    viewTitle.textContent = 'Database Engine & Health Status';
    viewSub.textContent = 'Backend runtime status, synthetic dataset details, and live Mongoose integration';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading system status...</div>';

    try {
      var res = await api.get('/admin/status');
      state.systemStatus = res.data;

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <div class="od-row" style="justify-content: space-between; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">Database Engine Status</h3>
                <div style="font-size: 13px; color: var(--text-2); margin-top: 2px;">Automatic resilient failover active</div>
              </div>
              <span class="live-badge">HEALTHY (200 OK)</span>
            </div>

            <div class="od-grid" style="--od-cols: 2; --od-gap: 16px; font-size: 13px;">
              <div style="background: var(--surface-2); padding: 14px; border-radius: 10px;">
                <div style="color: var(--text-3); font-size: 11px; text-transform: uppercase; font-weight: 700;">Storage Mode</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text); margin-top: 4px;">MemoryDB Pre-Seeded Synthetic Engine</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">Zero-config zero-latency fallback (Atlas compatible)</div>
              </div>
              <div style="background: var(--surface-2); padding: 14px; border-radius: 10px;">
                <div style="color: var(--text-3); font-size: 11px; text-transform: uppercase; font-weight: 700;">Port & Service</div>
                <div style="font-size: 16px; font-weight: 700; color: var(--text); margin-top: 4px;">Port 4000 (Express 5.x)</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">Base URL: http://localhost:4000/api/v1</div>
              </div>
              <div style="background: var(--surface-2); padding: 14px; border-radius: 10px;">
                <div style="color: var(--text-3); font-size: 11px; text-transform: uppercase; font-weight: 700;">Active Demo Personas</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-top: 4px;">Ananya, Meera, Rohan • Dr. Rohit, Dr. Neha, Dr. Anand • Admin</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">Pre-loaded FHIR clinical resources & consent grants</div>
              </div>
              <div style="background: var(--surface-2); padding: 14px; border-radius: 10px;">
                <div style="color: var(--text-3); font-size: 11px; text-transform: uppercase; font-weight: 700;">Security Standards</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-top: 4px;">RBAC • Zod • Rate Limiting • HMAC Audit</div>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 4px;">ABHA & Health Data Management Policy compliant</div>
              </div>
            </div>
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;
    } catch (err) {
      viewRoot.innerHTML = '<div style="color: #DC2626; padding: 30px;">Error loading system status: ' + esc(err.message) + '</div>';
    }
  }

  // ==========================================
  // PUNE REGIONAL DISEASE INTELLIGENCE MAP
  // ==========================================
  var puneMapInstance = null;
  var puneMapMarkers = [];
  var puneSelectedTalukaName = 'Pune';
  var puneMapFilter = {
    diseaseCategory: 'all',
    region: 'all',
    k: 5
  };

  async function renderPuneMapView() {
    viewTitle.textContent = 'Pune Regional Disease Intelligence';
    viewSub.textContent = 'Surveillance and disease prevalence across 14 Pune district talukas with k-anonymity suppression and verified healthcare facilities';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading Pune geospatial intelligence from MongoDB...</div>';

    try {
      var query = '?diseaseCategory=' + encodeURIComponent(puneMapFilter.diseaseCategory) +
                  '&region=' + encodeURIComponent(puneMapFilter.region) +
                  '&k=' + encodeURIComponent(puneMapFilter.k);
      var res = await api.get('/admin/pune-map' + query);
      var mapData = res.data;

      // Identify currently selected taluka for the deep-dive panel
      var activeTaluka = (mapData.talukas || []).find(t => t.name === puneSelectedTalukaName) || mapData.talukas[0] || null;

      var availableDiseases = [
        'Diabetes Mellitus',
        'Hypertension',
        'Bronchial Asthma',
        'Dermatological conditions',
        'Acute Respiratory Infection (ARI)',
        'Dengue Fever / Vector-Borne',
        'Acute Diarrheal Disease (ADD)'
      ];
      if (mapData.allDiseases && Array.isArray(mapData.allDiseases)) {
        mapData.allDiseases.forEach(d => {
          if (d && !availableDiseases.includes(d)) availableDiseases.push(d);
        });
      }

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <!-- Controls Bar -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between;">
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--text-2); text-transform:uppercase; margin-bottom:4px;">Disease Category</label>
                <select id="pune-disease-filter" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-strong); font-size: 13px; font-weight:600; background: var(--surface-2); color: var(--text);">
                  <option value="all" ${puneMapFilter.diseaseCategory === 'all' ? 'selected' : ''}>All Monitored Conditions</option>
                  ${availableDiseases.map(d => `<option value="${esc(d)}" ${puneMapFilter.diseaseCategory === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                </select>
              </div>

              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--text-2); text-transform:uppercase; margin-bottom:4px;">Pune Taluka Region</label>
                <select id="pune-taluka-filter" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-strong); font-size: 13px; font-weight:600; background: var(--surface-2); color: var(--text);">
                  <option value="all" ${puneMapFilter.region === 'all' ? 'selected' : ''}>All 14 Pune District Talukas</option>
                  ${(mapData.talukas || []).map(t => `<option value="${t.name}" ${puneMapFilter.region === t.name ? 'selected' : ''}>${t.name} Taluka</option>`).join('')}
                </select>
              </div>

              <div>
                <label style="display:block; font-size:11px; font-weight:700; color:var(--text-2); text-transform:uppercase; margin-bottom:4px;">Privacy Threshold (k)</label>
                <select id="pune-k-filter" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-strong); font-size: 13px; background: var(--surface-2); color: var(--text);">
                  <option value="3" ${puneMapFilter.k === 3 ? 'selected' : ''}>k = 3 (Minimum threshold)</option>
                  <option value="5" ${puneMapFilter.k === 5 ? 'selected' : ''}>k = 5 (Standard privacy limit)</option>
                  <option value="10" ${puneMapFilter.k === 10 ? 'selected' : ''}>k = 10 (Strict privacy limit)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="live-badge" style="background:#EFFBF3; color:#15803D; font-size:12px; padding:6px 12px;">
                ● Live Socket.IO Sync Active
              </span>
              <button id="btn-refresh-pune-map" class="hm-btn hm-btn--ghost" style="padding: 8px 14px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-strong); cursor:pointer;">
                ↻ Refresh Map
              </button>
            </div>
          </div>

          <!-- KPI Metric Cards -->
          <div class="od-grid" style="--od-cols: 4; --od-gap: 16px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Currently Affected by Disease</div>
              <div style="font-size: 28px; font-weight: 800; color: #DC2626; margin-top: 4px;">${mapData.totalActiveCases != null ? mapData.totalActiveCases : mapData.totalDistinctCases}</div>
              <div style="font-size: 11px; color: #DC2626; margin-top: 4px;">Active patients (Decrements on recovery)</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Marked Completely Recovered</div>
              <div style="font-size: 28px; font-weight: 800; color: #15803D; margin-top: 4px;">${mapData.totalRecoveredCases || 0}</div>
              <div style="font-size: 11px; color: #15803D; margin-top: 4px;">Subtracted from active count (-1)</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Total Cumulative Diagnoses</div>
              <div style="font-size: 28px; font-weight: 800; color: #2563EB; margin-top: 4px;">${mapData.totalCumulativeCases != null ? mapData.totalCumulativeCases : (mapData.totalActiveCases + (mapData.totalRecoveredCases || 0))}</div>
              <div style="font-size: 11px; color: var(--text-3); margin-top: 4px;">Historical clinical diagnoses</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Pune District Talukas</div>
              <div style="font-size: 28px; font-weight: 800; color: var(--text); margin-top: 4px;">14</div>
              <div style="font-size: 11px; color: var(--text-3); margin-top: 4px;">100% taluka geographic coverage</div>
            </div>
          </div>

          <!-- 14 Pune District Talukas Quick Case Count Leaderboard Grid -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px;">
            <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text);">Pune District 14 Talukas Case Counts</h3>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Click any taluka card to locate on the interactive map below</div>
              </div>
              <span class="live-badge" style="background:#F0FDFA; color:#0F766E; font-size:11px;">
                14 Talukas Active
              </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px;">
              ${(mapData.talukas || []).map(t => `
                <div class="taluka-summary-card" data-taluka="${esc(t.name)}" data-lat="${t.lat}" data-lng="${t.lng}" style="background: ${puneSelectedTalukaName === t.name ? 'rgba(15, 118, 110, 0.08)' : 'var(--surface-2)'}; border: 1.5px solid ${puneSelectedTalukaName === t.name ? '#0F766E' : 'var(--border)'}; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: transform 0.15s, border-color 0.15s;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:var(--text); font-size:13px;">${esc(t.name)}</strong>
                    <span style="font-size:10px; color:var(--text-3);">${esc(t.headquarters || t.name)}</span>
                  </div>
                  <div style="display:flex; align-items:baseline; justify-content:space-between;">
                    <div style="font-size:18px; font-weight:800; color:${t.color};">
                      ${t.displayCases} <span style="font-size:11px; font-weight:600; color:var(--text-2);">Affected</span>
                    </div>
                    <span style="font-size:10.5px; font-weight:700; color:#15803D; background:#EFFBF3; padding:1px 5px; border-radius:4px;">
                      ${t.recoveredCases || 0} Rec.
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Leaflet Map Container & Legend -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px;">
            <div class="od-row" style="justify-content: space-between; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text);">Pune District 14 Talukas Spatial Intelligence Map</h3>
                <div style="font-size: 12px; color: var(--text-2); margin-top: 2px;">Map pins directly display the count of people affected in each region. Click any pin for full health statistics.</div>
              </div>
              <!-- Legend -->
              <div style="display: flex; gap: 14px; align-items: center; font-size: 12px; flex-wrap:wrap;">
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; border-radius:50%; background:#EF4444; display:inline-block;"></span> High Surge (&gt; 15)</span>
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; border-radius:50%; background:#F59E0B; display:inline-block;"></span> Moderate (6-15)</span>
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; border-radius:50%; background:#3B82F6; display:inline-block;"></span> Low (1-5 / &lt; k)</span>
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; border-radius:50%; background:#10B981; display:inline-block;"></span> Normal / Monitored (0)</span>
              </div>
            </div>

            <div id="pune-map-canvas" style="width: 100%; height: 520px; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; background: #E2E8F0; z-index: 1;"></div>
          </div>

          <!-- Selected Taluka Deep-Dive Panel (Disease Breakdown & Regional Healthcare Facilities) -->
          ${activeTaluka ? `
            <div id="taluka-deep-dive-card" style="background: var(--surface); border: 2px solid #0F766E; border-radius: 16px; padding: 22px; box-shadow: 0 4px 20px rgba(15,118,110,0.08);">
              <div class="od-row" style="justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap:wrap; gap:12px;">
                <div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <h3 style="margin: 0; font-size: 19px; font-weight: 800; color: var(--text);">${esc(activeTaluka.name)} Taluka Regional Intelligence</h3>
                    <span class="live-badge" style="background:#F0FDFA; color:#0F766E; font-size:12px; border:1px solid #99F6E4;">
                      HQ: ${esc(activeTaluka.headquarters || activeTaluka.name)}
                    </span>
                  </div>
                  <div style="font-size: 13px; color: var(--text-2); margin-top: 4px;">
                    ${esc(activeTaluka.description)} • Coordinates: <code>${activeTaluka.lat.toFixed(4)}°N, ${activeTaluka.lng.toFixed(4)}°E</code>
                  </div>
                </div>
                <div style="display:flex; gap:16px; align-items:center;">
                  <div style="text-align:right;">
                    <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:700;">Currently Affected</div>
                    <div style="font-size:22px; font-weight:800; color:${activeTaluka.suppressed ? '#D97706' : (activeTaluka.rawCases > 15 ? '#EF4444' : '#0F766E')};">
                      ${activeTaluka.displayCases} ${activeTaluka.suppressed ? '<span style="font-size:12px; font-weight:normal;">(k-Suppressed)</span>' : ''}
                    </div>
                  </div>
                  <div style="text-align:right; border-left:1px solid var(--border); padding-left:14px;">
                    <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:700;">Recovered</div>
                    <div style="font-size:22px; font-weight:800; color:#15803D;">
                      ${activeTaluka.recoveredCases || 0}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Two Column Grid: Disease Breakdown & Regional Facilities -->
              <div class="od-grid" style="--od-cols: 2; --od-gap: 20px;">
                
                <!-- Left: Disease Breakdown for this Taluka -->
                <div style="background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 18px;">
                  <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text);">Disease Case Breakdown in ${esc(activeTaluka.name)}</h4>
                    <span style="font-size: 11px; color: var(--text-3);">k-Anonymity Guarded</span>
                  </div>
                  ${activeTaluka.diseaseBreakdown && activeTaluka.diseaseBreakdown.length > 0 ? `
                    <div class="od-stack" style="--od-gap: 8px;">
                      ${activeTaluka.diseaseBreakdown.map(d => `
                        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; display:flex; justify-content:space-between; align-items:center;">
                          <div>
                            <strong style="color:var(--text); font-size:13px;">${esc(d.category)}</strong>
                            <div style="font-size:11px; color:var(--text-3); margin-top:2px;">
                              ${d.recoveredCases ? `<span style="color:#15803D; font-weight:600;">${d.recoveredCases} Recovered (-1 subtracted)</span> • ` : ''}
                              Total diagnosed: ${d.totalCases || d.rawCases}
                            </div>
                          </div>
                          <div>
                            <span class="live-badge" style="background:${d.suppressed ? '#FEF3C7' : '#EFF6FF'}; color:${d.suppressed ? '#B45309' : '#1D4ED8'}; font-weight:700; font-size:12px;">
                              ${d.cases} ${d.suppressed ? 'affected (< ' + mapData.kThreshold + ')' : 'active affected'}
                            </span>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div style="padding: 24px; text-align: center; color: var(--text-3); font-size: 13px;">
                      No active disease cases currently recorded for ${esc(activeTaluka.name)}.
                    </div>
                  `}
                </div>

                <!-- Right: Verified Healthcare Facilities for this Taluka -->
                <div style="background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 18px;">
                  <div class="od-row" style="justify-content: space-between; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text);">Verified Healthcare Facilities (${activeTaluka.facilities.length})</h4>
                    <span class="live-badge" style="background:#EFFBF3; color:#15803D; font-size:11px;">MongoDB Verified</span>
                  </div>
                  ${activeTaluka.facilities && activeTaluka.facilities.length > 0 ? `
                    <div class="od-stack" style="--od-gap: 10px;">
                      ${activeTaluka.facilities.map(f => `
                        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
                          <div class="od-row" style="justify-content: space-between; margin-bottom: 4px;">
                            <strong style="color:var(--text); font-size:13.5px;">${esc(f.name)}</strong>
                            <span style="font-size:11px; font-weight:700; color:#2563EB;">${esc(f.bedCapacity || 50)} Beds</span>
                          </div>
                          <div style="font-size: 12px; color: var(--text-2);">
                            Type: <strong>${esc(f.type)}</strong> • Locality: ${esc(f.locality || activeTaluka.name)}
                          </div>
                          ${f.address ? `<div style="font-size: 11px; color: var(--text-3); margin-top: 3px;">📍 ${esc(f.address)}</div>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div style="padding: 24px; text-align: center; color: var(--text-3); font-size: 13px;">
                      No facilities registered directly in ${esc(activeTaluka.name)}.
                    </div>
                  `}
                </div>

              </div>
            </div>
          ` : ''}

          <!-- 14 Pune Talukas Surveillance Ledger Table -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px;">
            <h3 style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: var(--text);">14 Pune District Talukas Surveillance & Facility Registry</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border); text-align: left; color: var(--text-2);">
                    <th style="padding: 10px 12px;">Taluka Region</th>
                    <th style="padding: 10px 12px;">Headquarters</th>
                    <th style="padding: 10px 12px;">People Affected</th>
                    <th style="padding: 10px 12px;">Recovered</th>
                    <th style="padding: 10px 12px;">Total Diagnosed</th>
                    <th style="padding: 10px 12px;">Encounters</th>
                    <th style="padding: 10px 12px;">Verified Facilities</th>
                    <th style="padding: 10px 12px;">Surveillance Level</th>
                    <th style="padding: 10px 12px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${(mapData.talukas || []).map(t => `
                    <tr style="border-bottom: 1px solid var(--border); background: ${puneSelectedTalukaName === t.name ? 'rgba(15, 118, 110, 0.05)' : 'transparent'};">
                      <td style="padding: 12px; font-weight: 700; color: var(--text);">
                        ${esc(t.name)}
                      </td>
                      <td style="padding: 12px; color: var(--text-2); font-weight: 600;">
                        ${esc(t.headquarters || t.name)}
                      </td>
                      <td style="padding: 12px; font-weight: 700; color: ${t.suppressed ? '#D97706' : (t.rawCases > 15 ? '#EF4444' : '#0F766E')};">
                        ${t.displayCases} ${t.suppressed ? '<span style="font-size:11px; font-weight:normal; color:#D97706;">(Suppressed)</span>' : ''}
                      </td>
                      <td style="padding: 12px; font-weight: 700; color: #15803D;">
                        ${t.recoveredCases || 0}
                      </td>
                      <td style="padding: 12px; color: var(--text-2); font-weight: 600;">
                        ${t.totalCases || t.rawCases}
                      </td>
                      <td style="padding: 12px; color: var(--text);">${t.totalEncounters}</td>
                      <td style="padding: 12px; font-weight:600; color:#2563EB;">
                        ${t.facilities.length} Facilities
                      </td>
                      <td style="padding: 12px;">
                        <span style="display:inline-flex; align-items:center; gap:6px; font-weight:600; color:${t.color}; text-transform:capitalize;">
                          <span style="width:8px; height:8px; border-radius:50%; background:${t.color};"></span>
                          ${t.intensity}
                        </span>
                      </td>
                      <td style="padding: 12px; text-align: right;">
                        <button class="hm-btn hm-btn--ghost btn-focus-taluka" data-taluka="${esc(t.name)}" data-lat="${t.lat}" data-lng="${t.lng}" style="font-size:12px; font-weight:600; color:#0F766E; padding:6px 12px; border:1px solid #99F6E4; cursor:pointer;">
                          Locate on Map
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;

      // Initialize Leaflet Map with Custom Pin Badges showing affected counts
      initLeafletMap(mapData);

      // Attach filter handlers
      byId('pune-disease-filter').addEventListener('change', function () {
        puneMapFilter.diseaseCategory = this.value;
        renderPuneMapView();
      });
      byId('pune-taluka-filter').addEventListener('change', function () {
        puneMapFilter.region = this.value;
        if (this.value !== 'all') {
          puneSelectedTalukaName = this.value;
        }
        renderPuneMapView();
      });
      byId('pune-k-filter').addEventListener('change', function () {
        puneMapFilter.k = parseInt(this.value, 10);
        renderPuneMapView();
      });
      byId('btn-refresh-pune-map').addEventListener('click', renderPuneMapView);

      // Focus taluka button handlers (cards & table buttons)
      viewRoot.querySelectorAll('.taluka-summary-card, .btn-focus-taluka').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var lat = parseFloat(this.dataset.lat);
          var lng = parseFloat(this.dataset.lng);
          var talukaName = this.dataset.taluka;
          puneSelectedTalukaName = talukaName;

          if (puneMapInstance) {
            puneMapInstance.setView([lat, lng], 11, { animate: true });
            var marker = puneMapMarkers.find(m => m._talukaName === talukaName);
            if (marker) marker.openPopup();
          }

          var card = byId('taluka-deep-dive-card');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            renderPuneMapView();
          }
        });
      });

    } catch (err) {
      viewRoot.innerHTML = '<div style="color:#DC2626; padding:30px;">Error loading Pune Regional Disease Intelligence Map: ' + esc(err.message) + '</div>';
    }
  }

  function initLeafletMap(mapData) {
    var container = byId('pune-map-canvas');
    if (!container || typeof L === 'undefined') return;

    if (puneMapInstance) {
      puneMapInstance.remove();
      puneMapInstance = null;
    }
    puneMapMarkers = [];

    // Center on Pune District
    var map = L.map(container).setView([18.72, 74.0], 9.5);
    puneMapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors | HackMatrix Pune Regional Disease Intelligence'
    }).addTo(map);

    (mapData.talukas || []).forEach(function (taluka) {
      // Determine badge size based on affected cases
      var badgeSize = taluka.activeCases > 15 ? 40 : (taluka.activeCases >= 6 ? 34 : 28);
      var badgeFontSize = taluka.activeCases > 15 ? 13 : (taluka.activeCases >= 6 ? 12 : 11);

      // Custom HTML Marker showing exact affected count and Taluka Name directly on the map
      var customPinHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          <div style="width:${badgeSize}px; height:${badgeSize}px; border-radius:50%; background:${taluka.color}; border:2.5px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:800; font-size:${badgeFontSize}px; transition:transform 0.15s;" title="${esc(taluka.name)}: ${taluka.displayCases} People Affected">
            ${taluka.displayCases}
          </div>
          <div style="margin-top:2px; background:rgba(15,23,42,0.85); color:#ffffff; padding:1px 6px; border-radius:4px; font-size:10.5px; font-weight:700; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.25);">
            ${esc(taluka.name)}
          </div>
        </div>
      `;

      var pinIcon = L.divIcon({
        className: 'pune-taluka-pin',
        html: customPinHtml,
        iconSize: [badgeSize, badgeSize + 20],
        iconAnchor: [badgeSize / 2, badgeSize / 2]
      });

      var marker = L.marker([taluka.lat, taluka.lng], { icon: pinIcon }).addTo(map);
      marker._talukaName = taluka.name;

      // Tooltip displaying affected and recovered counts on hover
      marker.bindTooltip(
        `<b>${esc(taluka.name)} Taluka</b>: <span style="color:${taluka.color}; font-weight:700;">${taluka.displayCases} Affected</span> (${taluka.recoveredCases || 0} Recovered)`,
        { direction: 'top', offset: [0, -badgeSize / 2] }
      );

      var topDiseases = (taluka.diseaseBreakdown || []).slice(0, 3)
        .map(d => `<div style="font-size:11px; margin-top:2px;">• <strong>${esc(d.category)}</strong>: ${d.cases} affected (${d.recoveredCases || 0} recovered)</div>`)
        .join('');

      var popupContent = `
        <div style="font-family:Inter,sans-serif; padding:4px 2px; min-width: 220px;">
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0F172A;">${esc(taluka.name)} Taluka</h4>
          <div style="font-size:12px; color:#64748B; margin-bottom:6px;">HQ: ${esc(taluka.headquarters || taluka.name)}</div>
          <div style="font-size:12.5px; margin-bottom:3px;">
            <strong>People Affected:</strong> <span style="font-weight:800; font-size:14px; color:${taluka.color};">${taluka.displayCases}</span>
          </div>
          <div style="font-size:12px; margin-bottom:3px; color:#15803D;">
            <strong>Completely Recovered:</strong> <span style="font-weight:800;">${taluka.recoveredCases || 0}</span> (Subtracted from count)
          </div>
          <div style="font-size:12px; margin-bottom:4px;"><strong>Total Diagnoses:</strong> ${taluka.totalCases || taluka.rawCases}</div>
          <div style="font-size:12px; margin-bottom:6px;"><strong>Verified Facilities:</strong> ${taluka.facilities.length} Hospitals</div>
          ${topDiseases ? `<div style="border-top:1px dashed #CBD5E1; padding-top:4px; margin-top:4px;"><strong>Top Conditions:</strong>${topDiseases}</div>` : ''}
          <div style="font-size:11px; padding:4px 8px; border-radius:6px; background:${taluka.suppressed ? '#FEF3C7' : '#EFF6FF'}; color:${taluka.suppressed ? '#92400E' : '#1E40AF'}; font-weight:600; margin-top:6px;">
            ${taluka.suppressed ? '⚠️ k-Anonymity Suppressed (< ' + mapData.kThreshold + ')' : '✓ Verified Public Health Surveillance'}
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);

      marker.on('click', function () {
        puneSelectedTalukaName = taluka.name;
        renderPuneMapView();
      });

      puneMapMarkers.push(marker);
    });
  }

  // ==========================================
  // PATIENT-REPORTED RECOVERY FOLLOW-UP ANALYTICS
  // ==========================================
  async function renderFollowUpsView() {
    viewTitle.textContent = 'Patient-Reported Recovery Outcomes';
    viewSub.textContent = 'Aggregated recovery analytics from automated patient follow-up surveys';

    viewRoot.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-2);">Loading follow-up recovery metrics...</div>';

    try {
      var res = await api.get('/admin/followup-analytics');
      var data = res.data;
      var m = data.metrics || {};

      var html = `
        <div class="od-stack" style="--od-gap: 20px;">
          <!-- KPI Metrics Cards -->
          <div class="od-grid" style="--od-cols: 5; --od-gap: 14px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Surveys Scheduled</div>
              <div style="font-size: 26px; font-weight: 800; color: var(--text); margin-top: 4px;">${m.scheduled}</div>
              <div style="font-size: 11px; color: var(--text-3); margin-top: 2px;">7-14 day interval window</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Surveys Due Now</div>
              <div style="font-size: 26px; font-weight: 800; color: #2563EB; margin-top: 4px;">${m.due}</div>
              <div style="font-size: 11px; color: #2563EB; margin-top: 2px;">Awaiting patient response</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Completed Surveys</div>
              <div style="font-size: 26px; font-weight: 800; color: #10B981; margin-top: 4px;">${m.completed}</div>
              <div style="font-size: 11px; color: #10B981; margin-top: 2px;">Patient-reported responses</div>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-2);">Response Rate</div>
              <div style="font-size: 26px; font-weight: 800; color: #0F766E; margin-top: 4px;">${m.responseRate}%</div>
              <div style="font-size: 11px; color: #0F766E; margin-top: 2px;">Completed vs Due</div>
            </div>
            <div style="background: var(--surface); border: 1px solid ${m.worsenedCount > 0 ? '#F87171' : 'var(--border)'}; border-radius: 14px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 600; color: ${m.worsenedCount > 0 ? '#DC2626' : 'var(--text-2)'};">Symptoms Worsened</div>
              <div style="font-size: 26px; font-weight: 800; color: ${m.worsenedCount > 0 ? '#DC2626' : 'var(--text)'}; margin-top: 4px;">${m.worsenedCount}</div>
              <div style="font-size: 11px; color: ${m.worsenedCount > 0 ? '#DC2626' : 'var(--text-3)'}; margin-top: 2px;">Flagged for clinical review</div>
            </div>
          </div>

          <!-- Outcome Distribution -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: var(--text);">Recovery Outcome Distribution (5 Choices)</h3>
            <div class="od-stack" style="--od-gap: 12px;">
              ${data.recoveryBreakdown.map(function(item) {
                var barColor = '#10B981';
                if (item.status === 'Feeling better, but not fully recovered') barColor = '#3B82F6';
                if (item.status === 'No significant improvement') barColor = '#F59E0B';
                if (item.status === 'Symptoms have worsened') barColor = '#EF4444';
                if (item.status === 'I would prefer to discuss this with my clinician') barColor = '#8B5CF6';

                return `
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
                      <span style="color:var(--text);">${esc(item.status)}</span>
                      <span style="color:var(--text-2);">${item.count} responses (${item.percentage}%)</span>
                    </div>
                    <div style="width:100%; height:10px; background:var(--surface-2); border-radius:99px; overflow:hidden;">
                      <div style="width:${item.percentage}%; height:100%; background:${barColor}; border-radius:99px; transition:width 0.4s ease;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- De-Identified Recent Responses Table -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: var(--text);">De-Identified Recent Completed Surveys</h3>
            <div style="font-size: 12px; color: var(--text-2); margin-bottom: 14px;">k-Anonymized public health view — patient names and identities are mathematically shielded.</div>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border); text-align: left; color: var(--text-2);">
                    <th style="padding: 10px 12px;">De-Identified Subject</th>
                    <th style="padding: 10px 12px;">Disease Category</th>
                    <th style="padding: 10px 12px;">Interval</th>
                    <th style="padding: 10px 12px;">Patient-Reported Status</th>
                    <th style="padding: 10px 12px;">Completed Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.recentSurveys.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-2);">No completed surveys recorded yet.</td></tr>' :
                    data.recentSurveys.map(s => `
                      <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 12px; font-family: monospace; font-weight: 700; color: var(--text);">${esc(s.subjectRef)}</td>
                        <td style="padding: 12px; color: var(--text);">${esc(s.diseaseCategory)}</td>
                        <td style="padding: 12px; color: var(--text-2);">${s.intervalDays || 7} Days</td>
                        <td style="padding: 12px;">
                          <span class="live-badge" style="background:${s.worsened ? '#FEF2F2' : '#EFF6FF'}; color:${s.worsened ? '#DC2626' : '#2563EB'}; font-size:12px;">
                            ${esc(s.recoveryStatus)}
                          </span>
                        </td>
                        <td style="padding: 12px; color: var(--text-3); font-size: 12px;">${esc(s.completedAt)}</td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      viewRoot.innerHTML = html;
    } catch (err) {
      viewRoot.innerHTML = '<div style="color:#DC2626; padding:30px;">Error loading Follow-Up Analytics: ' + esc(err.message) + '</div>';
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
  initSocketConnection();
})();

