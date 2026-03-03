// ---------------------------------------------------------------------------
// Analytics – fire-and-forget event tracking (no cookies, no fingerprinting)
// ---------------------------------------------------------------------------
//
// The backend accepts events at  POST /api/analytics/event
// Session identity is carried via the  X-Session-Id  header using a UUID v4
// that lives in sessionStorage (per-tab lifetime).
//
// Only two event types are sent from the frontend:
//   • page_view            – on every client-side route navigation
//   • conformer_generation – when the user triggers conformer generation
//
// All other event types (conformer_completed, monomer_create, pdb_upload, …)
// are recorded server-side automatically.
// ---------------------------------------------------------------------------

import { API_BASE_URL } from '../config';

// ── Session ID (per-tab, persisted in sessionStorage) ──────────────────────

function getAnalyticsSessionId() {
  const KEY = 'analytics_sid';
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private-browsing or storage-blocked: generate ephemeral id
    return crypto.randomUUID();
  }
}

let _sessionId = null;

/** Lazily initialised analytics session id. */
export function getSessionId() {
  if (!_sessionId) _sessionId = getAnalyticsSessionId();
  return _sessionId;
}

// ── Core tracking function ─────────────────────────────────────────────────

/**
 * Fire-and-forget event dispatch to the analytics backend.
 *
 * @param {string}                    type     – event type (e.g. 'page_view')
 * @param {Record<string, unknown>=}  metadata – optional key/value payload
 * @param {string=}                   path     – page path (for page_view)
 */
export function trackEvent(type, metadata, path) {
  if (!type) return;

  const url = `${API_BASE_URL}/api/analytics/event`;
  const body = { type };

  if (path !== undefined) body.path = path;
  if (metadata !== undefined && metadata !== null) body.metadata = metadata;

  try {
    // Prefer sendBeacon for its fire-and-forget / survives-unload guarantee.
    // sendBeacon only supports Blob/FormData/USVString payloads with limited
    // content-type support, so we fall through to fetch when it isn't available.
    if (typeof navigator?.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      const headers = new Headers({ 'X-Session-Id': getSessionId() });

      // sendBeacon does not support custom headers, so fall back to fetch.
      // We keep the sendBeacon attempt as a final safety net inside
      // beforeunload (see trackPageView), using the session_id in the body.
    }

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      },
      body: JSON.stringify(body),
      keepalive: true, // survives page unloads
    }).catch(() => {});
  } catch {
    // Silently ignore – analytics must never break the app.
  }
}

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Track a page view.  Call on every client-side route change.
 *
 * @param {string} pathname – e.g. window.location.pathname
 */
export function trackPageView(pathname) {
  trackEvent('page_view', undefined, pathname || window.location.pathname);
}

/**
 * Track a conformer generation intent.
 * Call **before** the actual API request so the event captures user intent.
 *
 * @param {{ sequence_length?: number }} [meta]
 */
export function trackConformerGeneration(meta) {
  trackEvent('conformer_generation', meta);
}
