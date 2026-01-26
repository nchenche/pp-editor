/**
 * Conformer job localStorage helpers.
 * Persisted per db + session scope (session_id == owner_id convention).
 */

import { getSessionId } from './sessionApi';

export const CONFORMER_JOB_CHANGED_EVENT = 'pp-conformer-job-changed';

function normalizeBackendScope(baseUrlOverride) {
  const raw = String(baseUrlOverride ?? '').trim();
  if (!raw) return 'default';
  // If it's an absolute URL, only keep origin + pathname for stability.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      return `${u.origin}${u.pathname}`;
    } catch {
      return raw;
    }
  }
  // Relative values like '' or '/api' are fine (localStorage is already origin-scoped).
  return raw;
}

// Legacy key format (for migration/cleanup)
function getLegacyConformerJobStorageKey({ dbName = 'pepedit', ownerId = null } = {}) {
  const scope = ownerId ? String(ownerId).trim() : 'anonymous';
  return `pp-conformer-job:${String(dbName || 'pepedit')}:${scope}`;
}

// v2 key format using ownerId (for migration/cleanup)
function getV2ConformerJobStorageKey({ dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  const scope = ownerId ? String(ownerId).trim() : 'anonymous';
  const backend = normalizeBackendScope(baseUrlOverride);
  return `pp-conformer-job:v2:${String(dbName || 'pepedit')}:${scope}:${backend}`;
}

/**
 * Get the storage key for conformer job persistence.
 * Uses sessionId for scoping (preferred) or falls back to ownerId for migration.
 */
export function getConformerJobStorageKey({ dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
  // Prefer sessionId; fall back to ownerId for backwards compatibility
  const effectiveScope = sessionId || ownerId || getSessionId();
  const scope = effectiveScope ? String(effectiveScope).trim() : 'anonymous';
  const backend = normalizeBackendScope(baseUrlOverride);
  return `pp-conformer-job:v3:${String(dbName || 'pepedit')}:${scope}:${backend}`;
}

function normalizeJobId(jobId) {
  const v = String(jobId ?? '').trim();
  return v || null;
}

export function setConformerJobIdInStorage(jobId, { dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
  const normalized = normalizeJobId(jobId);
  if (!normalized) return null;

  // Prefer sessionId; fall back to ownerId for backwards compatibility
  const effectiveSessionId = sessionId || ownerId || getSessionId();

  try {
    window?.localStorage?.setItem(getConformerJobStorageKey({ dbName, sessionId: effectiveSessionId, baseUrlOverride }), normalized);
    // Clean up legacy keys to prevent stale job resumption
    window?.localStorage?.removeItem(getLegacyConformerJobStorageKey({ dbName, ownerId: effectiveSessionId }));
    window?.localStorage?.removeItem(getV2ConformerJobStorageKey({ dbName, ownerId: effectiveSessionId, baseUrlOverride }));
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(CONFORMER_JOB_CHANGED_EVENT));
  } catch {
    // ignore
  }

  return normalized;
}

export function clearConformerJobIdFromStorage({ dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
  // Prefer sessionId; fall back to ownerId for backwards compatibility
  const effectiveSessionId = sessionId || ownerId || getSessionId();

  try {
    window?.localStorage?.removeItem(getConformerJobStorageKey({ dbName, sessionId: effectiveSessionId, baseUrlOverride }));
    // Also clean up legacy keys
    window?.localStorage?.removeItem(getLegacyConformerJobStorageKey({ dbName, ownerId: effectiveSessionId }));
    window?.localStorage?.removeItem(getV2ConformerJobStorageKey({ dbName, ownerId: effectiveSessionId, baseUrlOverride }));
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(CONFORMER_JOB_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function getConformerJobIdFromStorage({ dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
  // Prefer sessionId; fall back to ownerId for backwards compatibility
  const effectiveSessionId = sessionId || ownerId || getSessionId();

  try {
    // Try v3 key first (session-based)
    let v = window?.localStorage?.getItem(getConformerJobStorageKey({ dbName, sessionId: effectiveSessionId, baseUrlOverride }));
    if (normalizeJobId(v)) return normalizeJobId(v);

    // Fall back to v2 key (owner-based, for migration)
    v = window?.localStorage?.getItem(getV2ConformerJobStorageKey({ dbName, ownerId: effectiveSessionId, baseUrlOverride }));
    if (normalizeJobId(v)) return normalizeJobId(v);

    return null;
  } catch {
    return null;
  }
}
