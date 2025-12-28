/**
 * Conformer job localStorage helpers.
 * Persisted per db + owner scope.
 */

export const CONFORMER_JOB_CHANGED_EVENT = 'pp-conformer-job-changed';

export function getConformerJobStorageKey({ dbName = 'pepedit', ownerId = null } = {}) {
  const scope = ownerId ? String(ownerId).trim() : 'anonymous';
  return `pp-conformer-job:${String(dbName || 'pepedit')}:${scope}`;
}

function normalizeJobId(jobId) {
  const v = String(jobId ?? '').trim();
  return v || null;
}

export function setConformerJobIdInStorage(jobId, { dbName = 'pepedit', ownerId = null } = {}) {
  const normalized = normalizeJobId(jobId);
  if (!normalized) return null;

  try {
    window?.localStorage?.setItem(getConformerJobStorageKey({ dbName, ownerId }), normalized);
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

export function clearConformerJobIdFromStorage({ dbName = 'pepedit', ownerId = null } = {}) {
  try {
    window?.localStorage?.removeItem(getConformerJobStorageKey({ dbName, ownerId }));
  } catch {
    // ignore
  }

  try {
    window?.dispatchEvent?.(new Event(CONFORMER_JOB_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function getConformerJobIdFromStorage({ dbName = 'pepedit', ownerId = null } = {}) {
  try {
    const v = window?.localStorage?.getItem(getConformerJobStorageKey({ dbName, ownerId }));
    return normalizeJobId(v);
  } catch {
    return null;
  }
}
