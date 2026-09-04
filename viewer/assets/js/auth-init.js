/**
 * Shared Supabase auth initialization for all landing pages.
 *
 * Usage:
 *   <script src="assets/js/auth-init.js"></script>
 *   <script>
 *     const supabaseClient = window.RecursiveAuth.init();
 *     // or with kiosk mode:
 *     const supabaseClient = window.RecursiveAuth.init({ kiosk: true });
 *   </script>
 *
 * Provides:
 *   window.RecursiveAuth.init(options)  → supabaseClient
 *   window.RecursiveAuth.getClient()    → existing client or null
 *   window.supabaseClient              → same client (for signin-modal.js compat)
 */
(function () {
  'use strict';

  let _client = null;

  // ── Base64url decode (matches @supabase/ssr encoding) ──

  function base64urlDecode(str) {
    // Convert base64url alphabet to standard base64
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (b64.length % 4) b64 += '=';
    return atob(b64);
  }

  // ── Environment helpers ──

  function getEnvConfig() {
    var envUrl = window.ENV?.SUPABASE_URL;
    var envKey = window.ENV?.SUPABASE_ANON_KEY;
    var isEnvValid = envUrl && !envUrl.startsWith('%') && envKey && !envKey.startsWith('%');

    return {
      supabaseUrl: isEnvValid ? envUrl : 'https://evixjvagwjmjdjpbazuj.supabase.co',
      supabaseAnonKey: isEnvValid
        ? envKey
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXhqdmFnd2ptamRqcGJhenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3Mjc5NDIsImV4cCI6MjA2OTMwMzk0Mn0.d7rp6xs9KswI7mGnw7V5XTARiJD4L9pAcEooI0zZg0E',
      authCookieDomain: window.ENV?.AUTH_COOKIE_DOMAIN || '.recursive.eco',
      isEnvValid: isEnvValid,
    };
  }

  // ── Cookie storage for cross-subdomain auth ──
  // Compatible with @supabase/ssr's base64url encoding format

  function createCookieStorage(cookieDomain) {
    return {
      getItem: function (key) {
        var cookies = document.cookie.split(';');
        // First: try exact match (unchunked cookie)
        for (var i = 0; i < cookies.length; i++) {
          var parts = cookies[i].trim().split('=');
          var name = parts[0];
          if (name === key) {
            var value = parts.slice(1).join('=');
            var decoded = decodeURIComponent(value);
            if (decoded.startsWith('base64-')) {
              try {
                return base64urlDecode(decoded.substring(7));
              } catch (e) {
                return null;
              }
            }
            return decoded;
          }
        }
        // Second: try chunked cookies (key.0, key.1, ...)
        var combined = '';
        for (var idx = 0; idx < 20; idx++) {
          var chunkName = key + '.' + idx;
          var found = false;
          for (var j = 0; j < cookies.length; j++) {
            var cParts = cookies[j].trim().split('=');
            if (cParts[0] === chunkName) {
              combined += decodeURIComponent(cParts.slice(1).join('='));
              found = true;
              break;
            }
          }
          if (!found) break;
        }
        if (combined) {
          if (combined.startsWith('base64-')) {
            try {
              return base64urlDecode(combined.substring(7));
            } catch (e) {
              return null;
            }
          }
          return combined;
        }
        return null;
      },
      setItem: function (key, value) {
        var maxAge = 60 * 60 * 24 * 365;
        var encoded = 'base64-' + btoa(value);
        document.cookie =
          key +
          '=' +
          encodeURIComponent(encoded) +
          '; path=/; domain=' +
          cookieDomain +
          '; max-age=' +
          maxAge +
          '; SameSite=Lax; Secure';
      },
      removeItem: function (key) {
        document.cookie =
          key +
          '=; path=/; domain=' +
          cookieDomain +
          '; max-age=0; SameSite=Lax; Secure';
      },
    };
  }

  var noopStorage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {},
  };

  // ── Public API ──

  /**
   * Initialize Supabase client with shared auth configuration.
   *
   * @param {Object} [options]
   * @param {boolean} [options.kiosk=false] - Kiosk mode: no cookies, no auth persistence
   * @returns {Object} supabaseClient
   */
  function init(options) {
    if (_client) return _client;

    var opts = options || {};
    var isKiosk = opts.kiosk || document.documentElement.classList.contains('kiosk-mode');
    var env = getEnvConfig();

    // Set hCaptcha sitekey for sign-in modal
    if (!isKiosk) {
      var envHcaptcha = window.ENV?.HCAPTCHA_SITEKEY;
      if (envHcaptcha && !envHcaptcha.startsWith('%')) {
        window.HCAPTCHA_SITEKEY = envHcaptcha;
      }
    }

    var createClient = window.supabase?.createClient;
    if (!createClient) {
      console.error('RecursiveAuth: window.supabase not loaded');
      return null;
    }

    _client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: !isKiosk,
        autoRefreshToken: !isKiosk,
        detectSessionInUrl: !isKiosk,
        storageKey: 'recursive-eco-auth',
        storage: isKiosk ? noopStorage : createCookieStorage(env.authCookieDomain),
      },
    });

    // Expose globally for signin-modal.js and other shared components
    window.supabaseClient = _client;

    // Initialize grammar loader if available
    if (window.GrammarLoader) {
      window.GrammarLoader.init(_client);
    }

    return _client;
  }

  function getClient() {
    return _client;
  }

  /**
   * Create a simple Supabase client without auth (for newsletter, thumbnails, etc.)
   * Reuses the main client if already initialized, otherwise creates a lightweight one.
   */
  function getSimpleClient() {
    if (_client) return _client;

    var env = getEnvConfig();
    var createClient = window.supabase?.createClient;
    if (!createClient) return null;

    return createClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  /**
   * Read the current user from shared auth cookies without creating a Supabase client.
   * Used by the landing header to show email without initializing a full client.
   */
  function readSessionFromCookies() {
    var storageKey = 'recursive-eco-auth';
    var cookies = document.cookie.split(';');
    var combined = '';

    // First try unchunked cookie
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].trim().split('=');
      if (parts[0] === storageKey) {
        combined = decodeURIComponent(parts.slice(1).join('='));
        break;
      }
    }

    // If not found, try chunked
    if (!combined) {
      for (var idx = 0; idx < 20; idx++) {
        var chunkName = storageKey + '.' + idx;
        var found = false;
        for (var j = 0; j < cookies.length; j++) {
          var cParts = cookies[j].trim().split('=');
          if (cParts[0] === chunkName) {
            combined += decodeURIComponent(cParts.slice(1).join('='));
            found = true;
            break;
          }
        }
        if (!found) break;
      }
    }

    if (!combined) return null;

    try {
      var decoded = combined;
      if (combined.startsWith('base64-')) {
        decoded = base64urlDecode(combined.substring(7));
      }
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }

  window.RecursiveAuth = {
    init: init,
    getClient: getClient,
    getSimpleClient: getSimpleClient,
    getEnvConfig: getEnvConfig,
    readSessionFromCookies: readSessionFromCookies,
  };
})();
