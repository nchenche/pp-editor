import { API_BASE_URL } from '../config';
import { apiFetch, apiFetchNoOwner } from './api';

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

export async function startConformerJob({
  biln,
  ssConstraints,
  embedParams,
  ownerId,
  dbName = 'pepedit',
  requestParams,
  baseUrlOverride,
  signal,
} = {}) {
  const url = buildApiUrl('/api/core/molecules/generate_conformer', {
    baseUrlOverride,
    query: { db_name: dbName, ...(requestParams || {}) },
  });

  const body = {
    biln,
    ss_constraints: ssConstraints ?? null,
    embed_params: embedParams ?? undefined,
    ...(ownerId ? { owner_id: ownerId } : {}),
  };

  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

export async function getConformerJob({ jobId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  const url = buildApiUrl(`/api/core/molecules/conformer_jobs/${encodeURIComponent(jobId)}`, {
    baseUrlOverride,
    query: { db_name: dbName },
  });
  // Do not inject owner_id into job status URL by default.
  return apiFetchNoOwner(url, { method: 'GET', signal });
}

export async function cancelConformerJob({ jobId, dbName = 'pepedit', baseUrlOverride, signal } = {}) {
  const url = buildApiUrl(`/api/core/molecules/conformer_jobs/${encodeURIComponent(jobId)}/cancel`, {
    baseUrlOverride,
    query: { db_name: dbName },
  });
  return apiFetchNoOwner(url, { method: 'POST', signal });
}

export async function listConformerJobs({
  dbName = 'pepedit',
  ownerId,
  scope,
  limit = 50,
  before,
  baseUrlOverride,
  signal,
} = {}) {
  const effectiveScope = scope || (ownerId ? undefined : 'anonymous');

  const url = buildApiUrl('/api/core/molecules/conformer_jobs', {
    baseUrlOverride,
    query: {
      db_name: dbName,
      ...(ownerId ? { owner_id: ownerId } : {}),
      ...(effectiveScope ? { scope: effectiveScope } : {}),
      limit,
      before,
    },
  });

  // Keep list call deterministic: don't auto-inject owner_id.
  return apiFetchNoOwner(url, { method: 'GET', signal });
}
