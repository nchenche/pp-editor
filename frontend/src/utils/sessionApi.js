/**
 * Session API utilities for shareable anonymous sessions.
 *
 * Convention: session_id == owner_id (same identifier string).
 * The session_id is the share token and is also used as owner_id for monomer endpoints.
 */

import { API_BASE_URL, DB_NAME } from '../config';

export const SESSION_ID_STORAGE_KEY = 'pp-editor:session-id:v1';
export const SESSION_ID_CHANGED_EVENT = 'pp-session-id-changed';
export const SESSION_META_CHANGED_EVENT = 'pp-session-meta-changed';
export const SESSION_ID_URL_PARAM = 'session_id';

// Local-only aliases for session metadata (ownership-safe fallback).
// Stored as a map: { [sessionId]: { name?: string|null, description?: string|null } }
export const SESSION_META_STORAGE_KEY = 'pp-editor:session-meta:v1';

// Default session TTL is 30 days on the server; we touch on each load to extend.
export const SESSION_TTL_DAYS = 30;

function normalizeSessionId(value) {
  const v = String(value ?? '').trim();
  return v || null;
}

/**
 * Get session ID from URL query parameter.
 * @returns {string|null}
 */
export function getSessionIdFromUrl() {
  try {
    const params = new URLSearchParams(window?.location?.search ?? '');
    const sid = params.get(SESSION_ID_URL_PARAM);
    return normalizeSessionId(sid);
  } catch {
    return null;
  }
}

/**
 * Build a share URL with the session ID as query param.
 * @param {string} sessionId
 * @param {string} [basePath] - defaults to current origin (Design page is at /)
 * @returns {string}
 */
export function buildShareUrl(sessionId, basePath) {
  const base = basePath ?? `${window?.location?.origin ?? ''}`;
  const url = new URL(base, window?.location?.origin);
  url.searchParams.set(SESSION_ID_URL_PARAM, sessionId);
  return url.toString();
}

/**
 * Remove session_id from the current URL (clean up after adopting).
 */
export function clearSessionIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(SESSION_ID_URL_PARAM)) {
      url.searchParams.delete(SESSION_ID_URL_PARAM);
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Format session ID for display (short form).
 * Shows first 4 and last 2 characters.
 * @param {string} sessionId
 * @returns {string}
 */
export function formatSessionIdShort(sessionId) {
  if (!sessionId) return '';
  if (sessionId.length <= 10) return sessionId;
  return `${sessionId.slice(0, 4)}…${sessionId.slice(-2)}`;
}

/**
 * Store session ID in localStorage and dispatch change event.
 */
export function setSessionIdInStorage(sessionId) {
  const normalized = normalizeSessionId(sessionId);
  if (!normalized) return null;

  try {
    window?.localStorage?.setItem(SESSION_ID_STORAGE_KEY, normalized);
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(SESSION_ID_CHANGED_EVENT));
  } catch {
    // ignore
  }

  return normalized;
}

/**
 * Clear session ID from localStorage and dispatch change event.
 */
export function clearSessionIdFromStorage() {
  try {
    window?.localStorage?.removeItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(SESSION_ID_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

/**
 * Get session ID from localStorage (or env override).
 */
export function getSessionId() {
  // Allow env override for testing/development
  const envSession = import.meta?.env?.VITE_SESSION_ID;
  if (envSession && String(envSession).trim()) return String(envSession).trim();

  try {
    const lsSession = window?.localStorage?.getItem(SESSION_ID_STORAGE_KEY);
    if (lsSession && String(lsSession).trim()) return String(lsSession).trim();
  } catch {
    // ignore
  }

  return null;
}

/**
 * Create a new session on the server.
 * Uses POST /api/db/owners with auto_generate=true.
 *
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, sessionId?: string, error?: string}>}
 */
export async function createSession({ dbName = DB_NAME, baseUrlOverride } = {}) {
  const base = baseUrlOverride ?? API_BASE_URL ?? '';

  try {
    const res = await fetch(`${base}/api/db/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_name: dbName, auto_generate: true }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Failed to create session (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    const sessionId = json?.owner_id || json?.data?.owner_id;
    if (!sessionId) {
      return { ok: false, error: 'Server did not return a session ID' };
    }

    return { ok: true, sessionId: String(sessionId) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Validate and touch a session (extends TTL).
 * Uses GET /api/db/sessions/<session_id>?touch=true.
 *
 * Response includes: email, email_verified, email_verified_at
 *
 * @param {string} sessionId
 * @param {{dbName?: string, touch?: boolean, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, session?: object, error?: string}>}
 */
export async function getSession(sessionId, { dbName = DB_NAME, touch = true, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}?db_name=${encodeURIComponent(dbName)}&touch=${touch}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Session validation failed (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    const data = json?.data || json;
    return { ok: true, session: data };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Update session metadata (name, description).
 * Uses PATCH /api/db/sessions/<session_id>
 *
 * Only the session owner (current session) can update their own session name.
 * Include X-Session-Id header to prove ownership.
 *
 * @param {string} sessionId
 * @param {{name?: string|null, description?: string|null}} updates
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, session?: object, error?: string}>}
 */
export async function patchSession(sessionId, updates, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}?db_name=${encodeURIComponent(dbName)}`;

  // Only include fields that are explicitly provided
  const body = {};
  if (updates?.name !== undefined) body.name = updates.name;
  if (updates?.description !== undefined) body.description = updates.description;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Include session ID header to prove ownership
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Failed to update session (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    const data = json?.data || json;
    return { ok: true, session: data };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

function readSessionMetaMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window?.localStorage?.getItem(SESSION_META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionMetaMap(next) {
  if (typeof window === 'undefined') return;
  try {
    window?.localStorage?.setItem(SESSION_META_STORAGE_KEY, JSON.stringify(next || {}));
  } catch {
    // ignore
  }
}

/**
 * Get locally stored session metadata (name/description) for a session.
 * This is an ownership-safe alias (works even if server doesn't support PATCH).
 */
export function getLocalSessionMeta(sessionId) {
  const sid = String(sessionId ?? '').trim();
  if (!sid) return null;
  const map = readSessionMetaMap();
  const v = map?.[sid];
  if (!v || typeof v !== 'object') return null;
  return {
    name: v?.name ?? null,
    description: v?.description ?? null,
  };
}

/**
 * Set locally stored session metadata (name/description) for a session.
 * Passing empty-string values is normalized to null.
 */
export function setLocalSessionMeta(sessionId, updates) {
  const sid = String(sessionId ?? '').trim();
  if (!sid) return null;

  const map = readSessionMetaMap();
  const prev = map?.[sid] && typeof map[sid] === 'object' ? map[sid] : {};

  const nextEntry = {
    ...prev,
    ...(updates?.name !== undefined
      ? { name: String(updates.name ?? '').trim() || null }
      : null),
    ...(updates?.description !== undefined
      ? { description: String(updates.description ?? '').trim() || null }
      : null),
  };

  const nextMap = { ...(map || {}), [sid]: nextEntry };
  writeSessionMetaMap(nextMap);

  // Dispatch event so other components can react to meta changes
  try {
    window?.dispatchEvent?.(new CustomEvent(SESSION_META_CHANGED_EVENT, { detail: { sessionId: sid, ...nextEntry } }));
  } catch {
    // ignore
  }

  return nextEntry;
}

// =====================================================
// Email verification flow API functions
// =====================================================

/**
 * Normalize email: trim + lowercase.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/**
 * Get email status for a session (including pending verification info).
 * Uses GET /api/db/sessions/<session_id>/email/status
 *
 * @param {string} sessionId
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function getEmailStatus(sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/status?db_name=${encodeURIComponent(dbName)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Failed to get email status (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    const data = json?.data || json;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Request to attach an email to a session (when no email is set).
 * Triggers a verification email to the target address.
 * Uses POST /api/db/sessions/<session_id>/email/attach/request
 *
 * @param {string} sessionId
 * @param {string} email
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, status?: string, error?: string, errorCode?: string}>}
 */
export async function requestEmailAttach(sessionId, email, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, error: 'Email is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/attach/request`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 202) {
      return { ok: true, status: 'pending', message: json?.message || 'Verification email sent' };
    }

    if (res.status === 409) {
      return { ok: false, error: json?.message || 'Email already set', errorCode: 'EMAIL_ALREADY_SET' };
    }

    if (res.status === 429) {
      return { ok: false, error: json?.message || 'Too many attempts. Please wait.', errorCode: 'RATE_LIMIT_EXCEEDED' };
    }

    const msg = json?.message || json?.error || `Request failed (status ${res.status})`;
    return { ok: false, error: String(msg) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Request to change email (requires verified current email).
 * Triggers a verification email to the CURRENT email first.
 * Uses POST /api/db/sessions/<session_id>/email/change/request
 *
 * @param {string} sessionId
 * @param {string} newEmail
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, status?: string, error?: string, errorCode?: string}>}
 */
export async function requestEmailChange(sessionId, newEmail, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };
  const normalizedEmail = normalizeEmail(newEmail);
  if (!normalizedEmail) return { ok: false, error: 'New email is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/change/request`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: normalizedEmail, db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 202) {
      return { ok: true, status: 'pending', message: json?.message || 'Verification email sent to current address' };
    }

    if (res.status === 400) {
      const code = json?.code || json?.error_code;
      return { ok: false, error: json?.message || 'Invalid request', errorCode: code };
    }

    if (res.status === 429) {
      return { ok: false, error: json?.message || 'Too many attempts. Please wait.', errorCode: 'RATE_LIMIT_EXCEEDED' };
    }

    const msg = json?.message || json?.error || `Request failed (status ${res.status})`;
    return { ok: false, error: String(msg) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Resend verification email for pending attach request.
 * Uses POST /api/db/sessions/<session_id>/email/attach/resend
 *
 * @param {string} sessionId
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, error?: string, errorCode?: string}>}
 */
export async function resendEmailAttach(sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/attach/resend`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 202) {
      return { ok: true, message: json?.message || 'Verification email resent' };
    }

    if (res.status === 404) {
      return { ok: false, error: json?.message || 'No pending verification', errorCode: 'NO_PENDING_REQUEST' };
    }

    if (res.status === 429) {
      return { ok: false, error: json?.message || 'Too many attempts. Please wait.', errorCode: 'RATE_LIMIT_EXCEEDED' };
    }

    const msg = json?.message || json?.error || `Request failed (status ${res.status})`;
    return { ok: false, error: String(msg) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Resend verification email for pending change request.
 * Uses POST /api/db/sessions/<session_id>/email/change/resend
 *
 * @param {string} sessionId
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, error?: string, errorCode?: string}>}
 */
export async function resendEmailChange(sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/change/resend`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 202) {
      return { ok: true, message: json?.message || 'Verification email resent' };
    }

    if (res.status === 404) {
      return { ok: false, error: json?.message || 'No pending verification', errorCode: 'NO_PENDING_REQUEST' };
    }

    if (res.status === 429) {
      return { ok: false, error: json?.message || 'Too many attempts. Please wait.', errorCode: 'RATE_LIMIT_EXCEEDED' };
    }

    const msg = json?.message || json?.error || `Request failed (status ${res.status})`;
    return { ok: false, error: String(msg) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Cancel pending email verification request.
 * Uses POST /api/db/sessions/<session_id>/email/pending/cancel
 *
 * @param {string} sessionId
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function cancelEmailVerification(sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/${encodeURIComponent(sessionId)}/email/pending/cancel`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (res.ok) {
      return { ok: true, message: json?.message || 'Verification cancelled' };
    }

    const msg = json?.message || json?.error || `Request failed (status ${res.status})`;
    return { ok: false, error: String(msg) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Share a session via email (sends session ID to recipient).
 * Uses POST /api/db/sessions/recover with session_id param.
 *
 * @param {string} recipientEmail
 * @param {string} sessionId - The session ID to share
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function shareSessionByEmail(recipientEmail, sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  const normalizedEmail = normalizeEmail(recipientEmail);
  if (!normalizedEmail) return { ok: false, error: 'Recipient email is required' };
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/recover`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, session_id: sessionId, db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Share request failed (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    return { ok: true, message: json?.message || 'Session shared via email' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Recover sessions by email (sends email with all verified session IDs linked to that email).
 * Uses POST /api/db/sessions/recover (without session_id).
 * Note: Only sessions with email_verified=true are eligible.
 *
 * @param {string} email
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function recoverSessionsByEmail(email, { dbName = DB_NAME, baseUrlOverride } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, error: 'Email is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';
  const url = `${base}/api/db/sessions/recover`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, db_name: dbName }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Recovery request failed (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    return { ok: true, message: json?.message || 'Recovery email sent' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

/**
 * Generate a local session ID candidate (client-side, before server confirmation).
 * Format: pep-<32 hex chars>
 */
export function generateLocalSessionId() {
  const bytes = new Uint8Array(16);
  if (window?.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pep-${hex}`;
}

/**
 * Create a session with a specific client-provided ID.
 * Uses POST /api/db/owners with owner_id set.
 *
 * @param {string} sessionId
 * @param {{dbName?: string, baseUrlOverride?: string}} options
 * @returns {Promise<{ok: boolean, sessionId?: string, error?: string}>}
 */
export async function createSessionWithId(sessionId, { dbName = DB_NAME, baseUrlOverride } = {}) {
  if (!sessionId) return { ok: false, error: 'Session ID is required' };

  const base = baseUrlOverride ?? API_BASE_URL ?? '';

  try {
    const res = await fetch(`${base}/api/db/owners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_name: dbName, owner_id: sessionId, auto_generate: false }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.error || `Failed to create session (status ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    const returnedId = json?.owner_id || json?.data?.owner_id;
    return { ok: true, sessionId: String(returnedId || sessionId) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}
