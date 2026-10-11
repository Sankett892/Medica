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

    // Generous session timeout (30 days in ms) so sessions never unexpectedly drop
    SESSION_TIMEOUT_MS: 30 * 24 * 60 * 60 * 1000,

    touchSession: function () {
      try {
        var now = String(Date.now());
        if (this.prefix) {
          var roleKey = this.prefix.replace(/^_/, '').toLowerCase();
          localStorage.setItem('hmx_' + roleKey + '_last_active', now);
        }
        localStorage.setItem('hmx_last_active', now);
      } catch (e) {}
    },

    isSessionValid: function () {
      try {
        var roleKey = this.prefix ? this.prefix.replace(/^_/, '').toLowerCase() : '';
        var lastActiveStr = roleKey ? localStorage.getItem('hmx_' + roleKey + '_last_active') : localStorage.getItem('hmx_last_active');
        if (lastActiveStr) {
          var lastActive = parseInt(lastActiveStr, 10);
          if (!isNaN(lastActive) && (Date.now() - lastActive > this.SESSION_TIMEOUT_MS)) {
            return false; // Expired
          }
        }
      } catch (e) {}
      return true;
    },

    getToken: function () {
      if (!this.isSessionValid()) {
        this.clearSession();
        return null;
      }
      this.touchSession();
      if (this.prefix) {
        var roleKey = this.prefix.replace(/^_/, '').toLowerCase();
        return localStorage.getItem('hmx_' + roleKey + '_token') || null;
      }
      return localStorage.getItem('hmx_token') || null;
    },

    getUser: function () {
      try {
        if (!this.isSessionValid()) {
          this.clearSession();
          return null;
        }
        if (this.prefix) {
          var roleKey = this.prefix.replace(/^_/, '').toLowerCase();
          var rawRole = localStorage.getItem('hmx_' + roleKey + '_user');
          return rawRole ? JSON.parse(rawRole) : null;
        }
        var u = localStorage.getItem('hmx_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setSession: function (token, user) {
      try {
        // Purge old cached data so new user always loads fresh MongoDB data
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('hmx_cache_') === 0) {
            localStorage.removeItem(keys[i]);
          }
        }
      } catch (e) {}

      var now = String(Date.now());
      if (token) {
        localStorage.setItem('hmx_token', token);
        localStorage.setItem('hmx_last_active', now);
      }
      if (user) {
        var str = JSON.stringify(user);
        localStorage.setItem('hmx_user', str);
        var r = (user.role || '').toLowerCase();
        if (r) {
          localStorage.setItem('hmx_' + r + '_token', token);
          localStorage.setItem('hmx_' + r + '_user', str);
          localStorage.setItem('hmx_' + r + '_last_active', now);
        }
      }
    },

    clearSession: function () {
      try {
        // Scoped clear: if called from a role-specific portal (e.g., api.forRole('admin')),
        // only clear THAT portal's session so other portals stay logged in!
        if (this.prefix) {
          var roleKey = this.prefix.replace(/^_/, '').toLowerCase();
          localStorage.removeItem('hmx_' + roleKey + '_token');
          localStorage.removeItem('hmx_' + roleKey + '_user');
          localStorage.removeItem('hmx_' + roleKey + '_last_active');
          return;
        }
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('hmx_') === 0) {
            localStorage.removeItem(keys[i]);
          }
        }
      } catch (e) {}
    },

    clearAllSessions: function () {
      try {
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('hmx_') === 0) {
            localStorage.removeItem(keys[i]);
          }
        }
      } catch (e) {}
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
          errObj.status = resp.status;
          throw errObj;
        }

        return data;
      } catch (networkError) {
        // Authoritative server error (401, 403, 404, etc.) - throw directly!
        if (networkError && (networkError.code || networkError.message)) {
          throw networkError;
        }
        console.warn('Network request failed for ' + endpoint, networkError);
        throw networkError;
      }
    },

    getOfflineFallback: function(endpoint, options) {
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
      } else if (password !== undefined) {
        body = { email: emailOrPersona, password: password };
        if (personaRole) {
          body.role = personaRole.toUpperCase();
        }
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
