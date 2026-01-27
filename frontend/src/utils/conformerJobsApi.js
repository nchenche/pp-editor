import { API_BASE_URL } from '../config';
import { apiFetch, apiFetchNoOwner } from './api';
import { getSessionId } from './sessionApi';

/**
 * @typedef {'queued'|'running'|'success'|'failed'|'canceled'} ConformerJobState
 */

/**
 * @typedef {{stage?: string, message?: string, raw?: any}} ConformerJobProgress
 */

/**
 * @typedef {{properties?: {BILN?: string, SMILES?: string, PDB?: string, SDF?: string, [k: string]: any}}} ConformerJobResultRef
 */

/**
 * @typedef {{job_id: string, state: ConformerJobState, progress: (ConformerJobProgress|null), result_ref: (ConformerJobResultRef|null), error: (any|null)}} ConformerJobDoc
 */

function buildApiUrl(endpoint, { baseUrlOverride, query } = {}) {
  const base = baseUrlOverride ?? API_BASE_URL ?? '';

  const urlObj = (() => {
    if (typeof endpoint === 'string' && endpoint.startsWith('http')) return new URL(endpoint);
    if (typeof base === 'string' && base.startsWith('http')) return new URL(`${base}${endpoint}`);
    return new URL(`${base}${endpoint}`, window.location.origin);
  })();

  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      urlObj.searchParams.set(k, String(v));
    }
  }

  return urlObj.toString();
}

function buildApiUrlFromServerUrl(serverUrl, { baseUrlOverride, query } = {}) {
  const base = baseUrlOverride ?? API_BASE_URL ?? '';

  const urlObj = (() => {
    if (typeof serverUrl === 'string' && serverUrl.startsWith('http')) return new URL(serverUrl);
    if (typeof base === 'string' && base.startsWith('http')) return new URL(`${base}${serverUrl}`);
    return new URL(`${base}${serverUrl}`, window.location.origin);
  })();

  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v == null) continue;
      urlObj.searchParams.set(k, String(v));
    }
  }

  return urlObj.toString();
}

export async function startAsyncJob({
  endpoint,
  body,
  dbName = 'pepedit',
  sessionId,
  requestParams,
  baseUrlOverride,
  signal,
} = {}) {
  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const url = buildApiUrl(endpoint, {
    baseUrlOverride,
    query: { db_name: dbName, ...(requestParams || {}) },
  });

  // Include session_id in the body for conformer job endpoints
  const bodyWithSession = {
    ...(body ?? {}),
    ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
  };

  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyWithSession),
    signal,
  });
}

export async function startConformerJob({
  biln,
  ssConstraints,
  embedParams,
  ownerId,
  sessionId,
  dbName = 'pepedit',
  requestParams,
  baseUrlOverride,
  signal,
} = {}) {
  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const body = {
    biln,
    ss_constraints: ssConstraints ?? null,
    embed_params: embedParams ?? undefined,
    ...(ownerId ? { owner_id: ownerId } : {}),
    ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
  };

  return startAsyncJob({
    endpoint: '/api/core/molecules/generate_conformer',
    body,
    dbName,
    sessionId: effectiveSessionId,
    requestParams,
    baseUrlOverride,
    signal,
  });
}

export async function getConformerJob({ jobId, sessionId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const url = buildApiUrl(`/api/core/molecules/conformer_jobs/${encodeURIComponent(jobId)}`, {
    baseUrlOverride,
    query: {
      db_name: dbName,
      ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
    },
  });
  // Use apiFetchNoOwner since we're explicitly providing session_id in query
  return apiFetchNoOwner(url, { method: 'GET', signal });
}

export async function getConformerJobByUrl({ statusUrl, sessionId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  if (!statusUrl) throw new Error('Missing statusUrl');

  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const url = buildApiUrlFromServerUrl(statusUrl, {
    baseUrlOverride,
    query: {
      db_name: dbName,
      ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
    },
  });
  // Use apiFetchNoOwner since we're explicitly providing session_id in query
  return apiFetchNoOwner(url, { method: 'GET', signal });
}

export async function cancelConformerJob({ jobId, sessionId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const url = buildApiUrl(`/api/core/molecules/conformer_jobs/${encodeURIComponent(jobId)}/cancel`, {
    baseUrlOverride,
    query: {
      db_name: dbName,
      ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
    },
  });
  return apiFetchNoOwner(url, { method: 'POST', signal });
}

export async function cancelConformerJobByUrl({ cancelUrl, sessionId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  if (!cancelUrl) throw new Error('Missing cancelUrl');

  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  const url = buildApiUrlFromServerUrl(cancelUrl, {
    baseUrlOverride,
    query: {
      db_name: dbName,
      ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
    },
  });
  return apiFetchNoOwner(url, { method: 'POST', signal });
}

export async function listConformerJobs({
  dbName = 'pepedit',
  sessionId,
  ownerId,
  scope,
  limit = 50,
  before,
  baseUrlOverride,
  signal,
} = {}) {
  // Use provided sessionId or fall back to current session
  const effectiveSessionId = sessionId ?? getSessionId();

  // If we have a session, use session_id filter; otherwise fall back to legacy owner_id/scope
  const query = {
    db_name: dbName,
    limit,
    before,
  };

  if (effectiveSessionId) {
    // Session-based filtering (preferred)
    query.session_id = effectiveSessionId;
  } else if (ownerId) {
    // Legacy owner-based filtering
    query.owner_id = ownerId;
  } else if (scope) {
    // Legacy scope-based filtering
    query.scope = scope;
  } else {
    // No session, no owner: anonymous scope fallback
    query.scope = 'anonymous';
  }

  const url = buildApiUrl('/api/core/molecules/conformer_jobs', {
    baseUrlOverride,
    query,
  });

  // Use apiFetchNoOwner since we're explicitly providing session_id/owner_id in query
  return apiFetchNoOwner(url, { method: 'GET', signal });
}

export async function listSessionConformerJobs({
  sessionId,
  dbName = 'pepedit',
  limit = 50,
  before,
  baseUrlOverride,
  signal,
} = {}) {
  const sid = sessionId != null ? String(sessionId).trim() : '';
  if (!sid) throw new Error('Missing sessionId');

  const url = buildApiUrl(`/api/db/sessions/${encodeURIComponent(sid)}/conformer_jobs`, {
    baseUrlOverride,
    query: {
      // Some deployments still expect db_name.
      ...(dbName ? { db_name: dbName } : {}),
      limit,
      before,
    },
  });

  // session_id is in the path; use apiFetchNoOwner to avoid legacy owner handling.
  return apiFetchNoOwner(url, { method: 'GET', signal });
}
