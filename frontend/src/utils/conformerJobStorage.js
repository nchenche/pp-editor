/**
 * Conformer job localStorage helpers.
 * Persisted per db + owner scope.
 */

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

function getLegacyConformerJobStorageKey({ dbName = 'pepedit', ownerId = null } = {}) {
  const scope = ownerId ? String(ownerId).trim() : 'anonymous';
  return `pp-conformer-job:${String(dbName || 'pepedit')}:${scope}`;
}

export function getConformerJobStorageKey({ dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  const scope = ownerId ? String(ownerId).trim() : 'anonymous';
  const backend = normalizeBackendScope(baseUrlOverride);
  return `pp-conformer-job:v2:${String(dbName || 'pepedit')}:${scope}:${backend}`;
}

function normalizeJobId(jobId) {
  const v = String(jobId ?? '').trim();
  return v || null;
}

export function setConformerJobIdInStorage(jobId, { dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  const normalized = normalizeJobId(jobId);
  if (!normalized) return null;

  try {
    window?.localStorage?.setItem(getConformerJobStorageKey({ dbName, ownerId, baseUrlOverride }), normalized);
    // Ensure legacy key can't auto-resume stale jobs after deploy/API base changes.
    window?.localStorage?.removeItem(getLegacyConformerJobStorageKey({ dbName, ownerId }));
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

export function clearConformerJobIdFromStorage({ dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  try {
    window?.localStorage?.removeItem(getConformerJobStorageKey({ dbName, ownerId, baseUrlOverride }));
    window?.localStorage?.removeItem(getLegacyConformerJobStorageKey({ dbName, ownerId }));
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(CONFORMER_JOB_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function getConformerJobIdFromStorage({ dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  try {
    const v = window?.localStorage?.getItem(getConformerJobStorageKey({ dbName, ownerId, baseUrlOverride }));
    return normalizeJobId(v);
  } catch {
    return null;
  }
}
