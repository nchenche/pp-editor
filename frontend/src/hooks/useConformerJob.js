import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  startConformerJob,
  startAsyncJob,
  getConformerJob,
  getConformerJobByUrl,
  cancelConformerJob,
  cancelConformerJobByUrl,
  buildApiUrlFromServerUrl,
} from '../utils/conformerJobsApi';

import {
  CONFORMER_JOB_CHANGED_EVENT,
  clearConformerJobIdFromStorage,
  getConformerJobIdFromStorage,
  setConformerJobIdInStorage,
  getConformerJobStorageKey,
} from '../utils/conformerJobStorage';

import { setConformerJobInputsInStorage } from '../utils/conformerJobInputsStorage';

import { getSessionId } from '../utils/sessionApi';

import { formatConformerJobProgressMessage } from '../utils/conformerJobProgress';

const TERMINAL_STATES = new Set(['success', 'failed', 'canceled']);

function isTerminal(state) {
  return TERMINAL_STATES.has(state);
}

function normalizeState(state) {
  const v = String(state ?? '').trim().toLowerCase();
  if (v === 'queued' || v === 'running' || v === 'success' || v === 'failed' || v === 'canceled') return v;
  return 'queued';
}

function toErrorMessage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || String(value);
  if (typeof value === 'object' && typeof value.message === 'string') return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const POLL_INTERVAL_MS = 1000;
const POLL_QUEUED_INTERVAL_MS = 500;
const POLL_RUNNING_INTERVAL_MS = 250;
const POLL_NETWORK_ERROR_INTERVAL_MS = 1500;

const JOB_POLL_TIMEOUT_MS = 10 * 60 * 1000;

function getPollIntervalMs(state, { hasNetworkError } = {}) {
  if (hasNetworkError) return POLL_NETWORK_ERROR_INTERVAL_MS;
  if (state === 'running') return POLL_RUNNING_INTERVAL_MS;
  if (state === 'queued') return POLL_QUEUED_INTERVAL_MS;
  return POLL_INTERVAL_MS;
}

// Cross-instance (same tab) in-flight dedupe for status GETs.
// If multiple components mount `useConformerJob()` for the same job id, they can otherwise
// generate back-to-back GETs within milliseconds (each hook instance has its own timer).
const GLOBAL_STATUS_IN_FLIGHT = new Map();

function getGlobalStatusKey({ jobId, statusUrl, dbName, baseUrlOverride }) {
  const base = baseUrlOverride ?? '';
  const status = statusUrl ? String(statusUrl) : '';
  return `${String(dbName || 'pepedit')}::${String(base)}::${String(jobId || '')}::${status}`;
}

async function fetchConformerJobStatusShared({ jobId, sessionId, statusUrl, dbName, baseUrlOverride, minIntervalMs, force } = {}) {
  const key = getGlobalStatusKey({ jobId, statusUrl, dbName, baseUrlOverride });
  const existing = GLOBAL_STATUS_IN_FLIGHT.get(key);
  if (existing?.promise) return existing.promise;

  // Cross-instance throttle (same tab): during cooldown, reuse last result instead of firing another GET.
  // Implemented via timers (not Date.now) so it behaves deterministically under fake timers.
  if (!force && minIntervalMs && existing?.cooldown && existing?.lastResult) {
    return existing.lastResult;
  }

  const promise = (async () => {
    const res = statusUrl
      ? await getConformerJobByUrl({ statusUrl, sessionId, dbName, baseUrlOverride })
      : await getConformerJob({ jobId, sessionId, dbName, baseUrlOverride });
    let json = null;
    try {
      json = await res.json();
    } catch {
      // ignore
    }
    return { ok: !!res.ok, status: res.status, json };
  })();

  GLOBAL_STATUS_IN_FLIGHT.set(key, { ...existing, promise });

  try {
    const result = await promise;

    const cur = GLOBAL_STATUS_IN_FLIGHT.get(key);
    const nextEntry = { ...cur, lastResult: result, promise: null };

    if (!force && minIntervalMs && minIntervalMs > 0) {
      nextEntry.cooldown = true;
      GLOBAL_STATUS_IN_FLIGHT.set(key, nextEntry);
      setTimeout(() => {
        const latest = GLOBAL_STATUS_IN_FLIGHT.get(key);
        if (!latest) return;
        // Only clear the cooldown flag; keep cached lastResult for late subscribers.
        if (latest.cooldown) {
          GLOBAL_STATUS_IN_FLIGHT.set(key, { ...latest, cooldown: false });
        }
      }, minIntervalMs);
    } else {
      nextEntry.cooldown = false;
      GLOBAL_STATUS_IN_FLIGHT.set(key, nextEntry);
    }

    return result;
  } finally {
    const cur = GLOBAL_STATUS_IN_FLIGHT.get(key);
    if (cur?.promise === promise) {
      GLOBAL_STATUS_IN_FLIGHT.set(key, { ...cur, promise: null });
    }
  }
}

/**
 * Hook that manages an async conformer job lifecycle.
 *
 * @param {{dbName?: string, sessionId?: (string|null), ownerId?: (string|null), baseUrlOverride?: (string|undefined)}} params
 */
export function useConformerJob({ dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
  // Prefer sessionId; fall back to ownerId for backwards compatibility
  // Convention: session_id == owner_id
  const effectiveSessionId = sessionId || ownerId || getSessionId();

  const storageKey = useMemo(
    () => getConformerJobStorageKey({ dbName, sessionId: effectiveSessionId, baseUrlOverride }),
    [dbName, effectiveSessionId, baseUrlOverride],
  );

  const [jobId, setJobId] = useState(() => getConformerJobIdFromStorage({ dbName, sessionId: effectiveSessionId, baseUrlOverride }));
  const jobIdRef = useRef(jobId);
  const [state, setState] = useState(jobId ? 'queued' : 'idle');
  const [progress, setProgress] = useState(null);
  const [lastEmbeddingProgress, setLastEmbeddingProgress] = useState(null);
  const [resultRef, setResultRef] = useState(null);

  // Client-side rolling log of distinct progress messages (not a server log stream).
  const [progressLog, setProgressLog] = useState([]);
  const lastLoggedMsgRef = useRef('');

  // errorType: 'network' (transport/non-2xx) | 'job' (backend state=failed)
  const [errorType, setErrorType] = useState(null);
  const [error, setError] = useState(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  const inFlightRef = useRef(null);
  const mountedRef = useRef(true);

  // Some backends can briefly return 404 immediately after job submission (eventual consistency).
  // Track short-lived 404s so we can retry a few times before declaring the job gone.
  const notFoundRef = useRef({ jobId: null, firstTs: 0, count: 0 });

  const eventSourceRef = useRef(null);
  const jobEndpointsRef = useRef({ statusUrl: null, cancelUrl: null, streamUrl: null });

  // Some backends can respond to a successful cancel request with a terminal state of "failed"
  // (e.g., task revoked/terminated with an error payload), while still indicating cancel_requested=true.
  // For UX, treat those cases as a normal cancel.
  const cancelAcknowledgedJobIdRef = useRef(null);

  // Track the most recent successful job id so we can restore it if a re-run is canceled.
  const lastSuccessfulJobIdRef = useRef(null);
  const rollbackJobIdRef = useRef(null);

  const lastStartPayloadRef = useRef(null);

  // If a job stays queued/running for a long time, it's often an infra issue (e.g. Celery worker down).
  // Warn without changing behavior.
  const staleWarnedJobIdRef = useRef(null);
  useEffect(() => {
    if (!jobId) return;
    if (state !== 'queued' && state !== 'running') return;
    if (staleWarnedJobIdRef.current === jobId) return;

    const warnAfterMs = 2 * 60 * 1000;
    const capturedId = String(jobId);
    const capturedState = state;

    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      if (String(jobIdRef.current || '') !== capturedId) return;
      if (state !== 'queued' && state !== 'running') return;
      staleWarnedJobIdRef.current = capturedId;
      // eslint-disable-next-line no-console
      console.warn(
        `[pp-editor] Conformer job ${capturedId} still ${capturedState} after 2 minutes. Celery worker/broker may be offline, or the job queue is stuck.`,
      );
    }, warnAfterMs);

    return () => clearTimeout(t);
  }, [jobId, state]);

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch { /* ignore */ }
      eventSourceRef.current = null;
    }
  }, []);

  const armTimeout = useCallback(() => {
    cleanupTimeout();
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      cleanupTimer();
      setErrorType('network');
      setError('Job polling timed out');
    }, JOB_POLL_TIMEOUT_MS);
  }, [cleanupTimeout, cleanupTimer]);

  const abortInFlight = useCallback(() => {
    const current = inFlightRef.current;
    if (!current) return;
    try {
      current.controller?.abort?.();
    } catch {
      // ignore
    }
    inFlightRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setErrorType(null);
    setError(null);
  }, []);

  const clearProgressLog = useCallback(() => {
    lastLoggedMsgRef.current = '';
    setProgressLog([]);
  }, []);

  const setJobIdAndPersist = useCallback(
    (nextJobId) => {
      const normalized = nextJobId ? String(nextJobId).trim() : '';
      if (!normalized) {
        jobIdRef.current = null;
        jobEndpointsRef.current = { statusUrl: null, cancelUrl: null, streamUrl: null };
        cleanupSSE();
        clearConformerJobIdFromStorage({ dbName, sessionId: effectiveSessionId, baseUrlOverride });
        setJobId(null);
        setState('idle');
        setProgress(null);
        setLastEmbeddingProgress(null);
        setResultRef(null);
        clearProgressLog();
        clearError();
        cleanupTimeout();
        return;
      }

      // Important: when resuming/restoring a job id from storage, we typically do NOT have
      // a valid status_url/cancel_url for that job (those are only returned by the start call).
      // If we keep a stale statusUrl from a previous job, polling will keep hitting that old URL
      // regardless of the new job id, which looks like "resume always uses the same job".
      jobEndpointsRef.current = { statusUrl: null, cancelUrl: null, streamUrl: null };
      cleanupSSE();

      // Update ref before emitting the storage change event to avoid duplicate poll loops.
      jobIdRef.current = normalized;
      setConformerJobIdInStorage(normalized, { dbName, sessionId: effectiveSessionId, baseUrlOverride });
      setJobId(normalized);
      setState('queued');
      clearProgressLog();
      clearError();
    },
    [baseUrlOverride, cleanupSSE, dbName, effectiveSessionId, clearError, clearProgressLog, cleanupTimeout],
  );

  const fetchStatusOnce = useCallback(
    async (id, { minIntervalMs, force } = {}) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return null;

      const statusUrl = jobEndpointsRef.current?.statusUrl || null;

      // Deduplicate in-flight status requests for the same job id.
      // This prevents rapid back-to-back GETs when pollLoop() gets invoked multiple times
      // (e.g., multiple hook instances listening to the same storage key).
      const existing = inFlightRef.current;
      if (existing?.jobId === effectiveId && existing?.promise) {
        return existing.promise;
      }

      const promise = (async () => {
        try {
          const { ok, status, json } = await fetchConformerJobStatusShared({
            jobId: effectiveId,
            sessionId: effectiveSessionId,
            statusUrl,
            dbName,
            baseUrlOverride,
            minIntervalMs,
            force,
          });
          if (!ok) {
            let msg = `Status request failed (${status})`;
            msg = json?.message || json?.error || msg;
            setErrorType('network');
            setError(msg);

            if (status === 404) {
              const now = Date.now();
              const cur = notFoundRef.current;
              const same = String(cur?.jobId || '') === String(effectiveId);
              const firstTs = same ? (cur.firstTs || now) : now;
              const count = same ? ((cur.count || 0) + 1) : 1;
              notFoundRef.current = { jobId: effectiveId, firstTs, count };

              // Grace window: retry a few times for a freshly-started job.
              const elapsed = now - firstTs;
              const withinGrace = elapsed < 3000 && count <= 5;
              if (!withinGrace) {
                // Persisted/stale job id (or backend never created it): stop polling and clear.
                setJobIdAndPersist(null);
              }
            }

            return null;
          }

          // Reset 404 tracking on any successful response.
          if (notFoundRef.current?.jobId) {
            notFoundRef.current = { jobId: null, firstTs: 0, count: 0 };
          }

          const data = json?.data || {};

          // If the backend indicates a cancel was requested, treat the job as canceled even if it
          // reports state=failed with an error payload.
          const cancelRequested = data?.cancel_requested === true;
          if (cancelRequested) {
            cancelAcknowledgedJobIdRef.current = String(data?.job_id || effectiveId);
          }

          const rawNextState = normalizeState(data?.state);
          const cancelAck = cancelRequested || (
            cancelAcknowledgedJobIdRef.current && String(cancelAcknowledgedJobIdRef.current) === String(effectiveId)
          );
          const nextState = cancelAck ? 'canceled' : rawNextState;

          if (nextState === 'success') {
            lastSuccessfulJobIdRef.current = String(data?.job_id || effectiveId);
          }

          // If job id changed while awaiting the network, ignore stale results.
          if ((jobIdRef.current || null) !== (effectiveId || null)) {
            return data;
          }

          setState(nextState);
          setProgress(
            cancelAck
              ? { stage: 'canceled', message: 'Canceled by user' }
              : (data?.progress ?? null),
          );
          setResultRef(data?.result_ref ?? null);

          // Track last embedding/mapping progress so the UI can surface mapping ratios even after success.
          const p = data?.progress;
          const raw = p?.raw;
          const stage = String(p?.stage || raw?.stage || '').toLowerCase();
          const hasMappingRatio = raw && (raw.mapping_ratio != null || raw.mappingRatio != null);
          const msg = p?.message ? String(p.message) : '';
          const hasRatioInMessage = msg.includes('ratio=') || msg.includes('mapping_ratio');
          if (stage === 'embedding' || hasMappingRatio || hasRatioInMessage) {
            setLastEmbeddingProgress(p);
          }

          if (nextState === 'failed') {
            setErrorType('job');
            const progressMsg = data?.progress?.message ? String(data.progress.message) : '';
            setError(toErrorMessage(data?.error) || progressMsg || 'Job failed');
          } else {
            // Clear errors if job progresses again.
            setErrorType(null);
            setError(null);
          }

          return data;
        } catch (e) {
          setErrorType('network');
          setError(toErrorMessage(e) || 'Network error');
          return null;
        } finally {
          const cur = inFlightRef.current;
          if (cur?.jobId === effectiveId && cur?.promise === promise) inFlightRef.current = null;
        }
      })();

      inFlightRef.current = { jobId: effectiveId, promise };

      return promise;
    },
    [baseUrlOverride, dbName, jobId, setJobIdAndPersist],
  );

  const pollLoop = useCallback(
    async (id) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return;

      const cancelAck = cancelAcknowledgedJobIdRef.current && String(cancelAcknowledgedJobIdRef.current) === String(effectiveId);
      if (cancelAck) {
        // Stop polling and treat as canceled.
        cleanupTimer();
        cleanupTimeout();
        setState('canceled');
        setProgress({ stage: 'canceled', message: 'Canceled by user' });
        setErrorType(null);
        setError(null);
        return;
      }

      // Ensure we have a timeout armed while actively polling.
      armTimeout();

      // Global throttle is only a safety net across multiple hook instances.
      // Keep it small so it never blocks the per-instance polling cadence
      // (in-flight promise dedupe already prevents request bursts).
      const desiredMinIntervalMs = 100;

      const data = await fetchStatusOnce(effectiveId, { minIntervalMs: desiredMinIntervalMs });

      // If job id changed/cleared while awaiting the network (e.g. 404 cleanup), stop polling.
      if ((jobIdRef.current || null) !== (effectiveId || null)) {
        cleanupTimer();
        cleanupTimeout();
        return;
      }
      const nextState = normalizeState(data?.state || state);

      if (!mountedRef.current) return;
      if (!effectiveId) return;

      if (isTerminal(nextState)) {
        cleanupTimer();
        cleanupTimeout();
        return;
      }

      const delay = getPollIntervalMs(nextState, { hasNetworkError: errorType === 'network' });
      cleanupTimer();
      timerRef.current = setTimeout(() => {
        pollLoop(effectiveId);
      }, delay);
    },
    [cleanupTimer, errorType, fetchStatusOnce, jobId, state],
  );

  // ---------------------------------------------------------------------------
  // SSE – prefer a real-time event stream when the backend provides stream_url.
  // Falls back to pollLoop() on any error or if the server sends a timeout event.
  // ---------------------------------------------------------------------------
  const connectSSE = useCallback(
    (id, streamUrl) => {
      if (!id || !streamUrl) return false;

      cleanupSSE();
      cleanupTimer();

      const fullUrl = buildApiUrlFromServerUrl(streamUrl, {
        baseUrlOverride,
        query: {
          db_name: dbName,
          ...(effectiveSessionId ? { session_id: effectiveSessionId } : {}),
        },
      });

      let es;
      try {
        es = new EventSource(fullUrl);
      } catch {
        // EventSource construction failed; fall back to polling.
        pollLoop(id);
        return false;
      }
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!mountedRef.current) { es.close(); eventSourceRef.current = null; return; }
        if (String(jobIdRef.current || '') !== String(id)) { es.close(); eventSourceRef.current = null; return; }

        let data;
        try {
          const parsed = JSON.parse(event.data);
          data = parsed?.data ?? parsed;
        } catch { return; }

        // Handle timeout / stream_timeout — fall back to polling via status_url.
        const rawServerState = String(data?.state ?? '').trim().toLowerCase();
        if (rawServerState === 'timeout' || rawServerState === 'stream_timeout') {
          es.close();
          eventSourceRef.current = null;
          pollLoop(id);
          return;
        }

        // Mirror the state-update logic from fetchStatusOnce.
        const cancelRequested = data?.cancel_requested === true;
        if (cancelRequested) {
          cancelAcknowledgedJobIdRef.current = String(data?.job_id || id);
        }

        const rawNextState = normalizeState(data?.state);
        const cancelAck = cancelRequested || (
          cancelAcknowledgedJobIdRef.current && String(cancelAcknowledgedJobIdRef.current) === String(id)
        );
        const nextState = cancelAck ? 'canceled' : rawNextState;

        if (nextState === 'success') {
          lastSuccessfulJobIdRef.current = String(data?.job_id || id);
        }

        // If the server reports success but omits result_ref, defer the
        // terminal state so the UI never flashes "no data to display".
        // A confirmatory GET will set state=success with the full payload.
        const deferTerminal = nextState === 'success' && !data?.result_ref;

        if (!deferTerminal) {
          setState(nextState);
        }
        setProgress(
          cancelAck
            ? { stage: 'canceled', message: 'Canceled by user' }
            : (data?.progress ?? null),
        );
        if (!deferTerminal) {
          setResultRef(data?.result_ref ?? null);
        }

        // Append to progress log directly from SSE so fast-arriving events
        // are not lost to React 18 auto-batching (the useEffect-based log
        // only sees the final rendered progressMessage).
        const progressPayload = cancelAck
          ? { stage: 'canceled', message: 'Canceled by user' }
          : (data?.progress ?? null);
        const sseProgressMsg = formatConformerJobProgressMessage(progressPayload);
        if (sseProgressMsg) {
          const trimmed = String(sseProgressMsg).trim();
          if (trimmed && trimmed !== lastLoggedMsgRef.current) {
            lastLoggedMsgRef.current = trimmed;
            setProgressLog((prev) => {
              const arr = Array.isArray(prev) ? prev : [];
              const next = [...arr, { ts: Date.now(), message: trimmed }];
              return next.length > 120 ? next.slice(next.length - 120) : next;
            });
          }
        }

        // Track last embedding/mapping progress.
        const p = data?.progress;
        const raw = p?.raw;
        const stage = String(p?.stage || raw?.stage || '').toLowerCase();
        const hasMappingRatio = raw && (raw.mapping_ratio != null || raw.mappingRatio != null);
        const msg = p?.message ? String(p.message) : '';
        const hasRatioInMessage = msg.includes('ratio=') || msg.includes('mapping_ratio');
        if (stage === 'embedding' || hasMappingRatio || hasRatioInMessage) {
          setLastEmbeddingProgress(p);
        }

        if (nextState === 'failed') {
          setErrorType('job');
          const progressMsg = data?.progress?.message ? String(data.progress.message) : '';
          setError(toErrorMessage(data?.error) || progressMsg || 'Job failed');
        } else {
          setErrorType(null);
          setError(null);
        }

        // Close SSE on terminal state.
        if (isTerminal(nextState)) {
          eventSourceRef.current = null;
          es.close();
          cleanupTimeout();
          // If we deferred setting the terminal state (success without
          // result_ref), fetch the complete record now.  fetchStatusOnce
          // will transition the state with the full payload.
          if (deferTerminal) {
            fetchStatusOnce(id, { force: true });
          }
        }
      };

      es.onerror = () => {
        // If onmessage already handled a terminal state it will have cleared
        // eventSourceRef. In that case the server simply closed the connection
        // after its last event — no need to fall back to polling.
        if (eventSourceRef.current !== es) {
          try { es.close(); } catch { /* ignore */ }
          return;
        }
        es.close();
        eventSourceRef.current = null;
        // Fall back to polling on genuine SSE errors.
        if (mountedRef.current && String(jobIdRef.current || '') === String(id)) {
          pollLoop(id);
        }
      };

      armTimeout();
      return true;
    },
    [armTimeout, baseUrlOverride, cleanupSSE, cleanupTimer, cleanupTimeout, dbName, effectiveSessionId, fetchStatusOnce, pollLoop],
  );

  const start = useCallback(
    async ({ biln, ssConstraints, embedParams, requestParams, ownerId: ownerIdOverride, sessionId: sessionIdOverride, endpoint, extraBody } = {}) => {
      if (!biln || !String(biln).trim()) {
        setJobIdAndPersist(null);
        return null;
      }

      // If we already have a successful job, keep it around as the rollback target.
      if (state === 'success' && jobIdRef.current) {
        lastSuccessfulJobIdRef.current = String(jobIdRef.current);
      }
      rollbackJobIdRef.current = lastSuccessfulJobIdRef.current;
      cancelAcknowledgedJobIdRef.current = null;

      cleanupTimer();
      cleanupSSE();
      abortInFlight();
      clearError();

      // Important: starting a new job should not display progress from a previous job.
      setState('queued');
      setProgress(null);
      setLastEmbeddingProgress(null);
      setResultRef(null);
      clearProgressLog();

      setIsStarting(true);

      // Use override or effective session ID (convention: session_id == owner_id)
      const startSessionId = sessionIdOverride ?? effectiveSessionId;

      const payload = {
        biln,
        ssConstraints: ssConstraints ?? null,
        embedParams: embedParams ?? undefined,
        requestParams: requestParams ?? undefined,
        ownerId: ownerIdOverride ?? startSessionId ?? undefined,
        sessionId: startSessionId ?? undefined,
        endpoint: endpoint || '/api/core/molecules/generate_conformer',
        extraBody: extraBody && typeof extraBody === 'object' ? { ...extraBody } : null,
      };
      lastStartPayloadRef.current = payload;

      try {
        const isTemplate = String(payload.endpoint || '').includes('generate_3d_from_template');

        // Canonicalized representation of backend-stored inputs.
        // Backend stores `inputs={ payload: <task_payload>, query_params: <query_params> }`,
        // but does not return it on job GET; keep it client-side for resuming.
        const inputsPayload = (() => {
          if (!isTemplate && String(payload.endpoint || '').includes('generate_conformer')) {
            return {
              biln: payload.biln,
              ss_constraints: payload.ssConstraints ?? null,
              embed_params: payload.embedParams ?? undefined,
              owner_id: payload.ownerId ?? undefined,
              session_id: payload.sessionId ?? undefined,
            };
          }

          const body = payload.extraBody && typeof payload.extraBody === 'object' ? { ...payload.extraBody } : {};
          if (!('biln' in body) || !body.biln) body.biln = payload.biln;
          return body;
        })();

        const res = await (() => {
          if (!isTemplate && String(payload.endpoint || '').includes('generate_conformer')) {
            return startConformerJob({
              biln: payload.biln,
              ssConstraints: payload.ssConstraints,
              embedParams: payload.embedParams,
              requestParams: payload.requestParams,
              ownerId: payload.ownerId,
              sessionId: payload.sessionId,
              dbName,
              baseUrlOverride,
            });
          }

          const body = payload.extraBody && typeof payload.extraBody === 'object' ? { ...payload.extraBody } : {};
          if (!('biln' in body) || !body.biln) body.biln = payload.biln;

          // Include session_id in the body
          if (payload.sessionId && !Object.prototype.hasOwnProperty.call(body, 'session_id')) {
            body.session_id = payload.sessionId;
          }

          // For template generation, owner_id MUST be present even if null.
          if (isTemplate) {
            if (!Object.prototype.hasOwnProperty.call(body, 'owner_id')) {
              body.owner_id = ownerIdOverride ?? startSessionId ?? null;
            }
            if (body.owner_id == null) body.owner_id = null;
          } else {
            if (!Object.prototype.hasOwnProperty.call(body, 'owner_id') && payload.ownerId) {
              body.owner_id = payload.ownerId;
            }
          }

          if (!Object.prototype.hasOwnProperty.call(body, 'embed_params') && payload.embedParams !== undefined) {
            body.embed_params = payload.embedParams;
          }

          return startAsyncJob({
            endpoint: payload.endpoint,
            body,
            dbName,
            sessionId: payload.sessionId,
            requestParams: payload.requestParams,
            baseUrlOverride,
          });
        })();

        if (!res.ok && res.status !== 202) {
          let msg = `Start request failed (${res.status})`;
          try {
            const j = await res.json();
            msg = j?.message || j?.error || msg;
          } catch {
            // ignore
          }
          setErrorType('network');
          setError(msg);
          return null;
        }

        const json = await res.json();
        const id = json?.data?.job_id;
        const statusUrl = json?.data?.status_url || null;
        const cancelUrl = json?.data?.cancel_url || null;
        const streamUrl = json?.data?.stream_url || null;
        if (!id) {
          setErrorType('network');
          setError('Backend did not return job_id');
          return null;
        }

        // Persist inputs best-effort for restoration (does not affect backend behavior).
        try {
          const stored = setConformerJobInputsInStorage(
            id,
            {
              endpoint: payload.endpoint,
              inputs: {
                payload: inputsPayload,
                query_params: payload.requestParams ?? undefined,
              },
            },
            { dbName, sessionId: payload.sessionId || undefined, baseUrlOverride },
          );
          // eslint-disable-next-line no-console
          if (!stored) console.warn('[useConformerJob] Failed to persist job inputs for', id);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[useConformerJob] Error persisting job inputs', e);
        }

        setJobIdAndPersist(id);
        // Restore endpoints *after* setJobIdAndPersist (which clears them for
        // the storage-restore case). start() has fresh URLs from the 202 response.
        jobEndpointsRef.current = { statusUrl, cancelUrl, streamUrl };
        setState('queued');
        setProgress(null);
        setLastEmbeddingProgress(null);
        setResultRef(null);

        // Prefer SSE if stream_url is available; fall back to polling.
        if (streamUrl) {
          connectSSE(id, streamUrl);
        } else {
          pollLoop(id);
        }
        return id;
      } catch (e) {
        if (e?.name === 'AbortError') return null;
        setErrorType('network');
        setError(toErrorMessage(e) || 'Network error');
        return null;
      } finally {
        if (mountedRef.current) setIsStarting(false);
      }
    },
    [abortInFlight, baseUrlOverride, cleanupSSE, cleanupTimer, clearError, clearProgressLog, connectSSE, dbName, effectiveSessionId, pollLoop, setJobIdAndPersist, state],
  );

  const cancel = useCallback(
    async (id) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return false;

      cleanupTimer();
      cleanupSSE();
      abortInFlight();
      setIsCanceling(true);

      try {
        const cancelUrl = jobEndpointsRef.current?.cancelUrl || null;
        const res = cancelUrl
          ? await cancelConformerJobByUrl({ cancelUrl, sessionId: effectiveSessionId, dbName, baseUrlOverride })
          : await cancelConformerJob({ jobId: effectiveId, sessionId: effectiveSessionId, dbName, baseUrlOverride });
        if (!res.ok) {
          // 409 is expected when already finished; treat as non-fatal.
          if (res.status !== 409) {
            let msg = `Cancel request failed (${res.status})`;
            try {
              const j = await res.json();
              msg = j?.message || j?.error || msg;
            } catch {
              // ignore
            }
            setErrorType('network');
            setError(msg);
            return false;
          }
        }

        // If backend explicitly acknowledges the cancel request, treat it as a successful cancel
        // even if it reports state=failed/error in the payload.
        let cancelJson = null;
        try {
          cancelJson = await res.json();
        } catch {
          // ignore
        }
        const cancelData = cancelJson?.data || null;
        if (cancelData?.cancel_requested === true) {
          const rollbackId = rollbackJobIdRef.current;

          // If we had a prior successful job, restore it so refresh/navigation keeps showing the last structure.
          if (rollbackId && String(rollbackId) !== String(effectiveId)) {
            cancelAcknowledgedJobIdRef.current = null;
            cleanupTimer();
            cleanupTimeout();
            setProgress(null);
            setLastEmbeddingProgress(null);
            setResultRef(null);
            setErrorType(null);
            setError(null);
            setJobIdAndPersist(rollbackId);
            pollLoop(rollbackId);
            return true;
          }

          cancelAcknowledgedJobIdRef.current = String(cancelData?.job_id || effectiveId);
          cleanupTimer();
          cleanupTimeout();
          setState('canceled');
          setProgress({ stage: 'canceled', message: 'Canceled by user' });
          setResultRef(null);
          setErrorType(null);
          setError(null);
          return true;
        }

        // Refresh status once, then stop polling if terminal.
        const data = await fetchStatusOnce(effectiveId, { force: true });
        const next = normalizeState(data?.state || state);

        // If the job ended up canceled and we have a prior successful job, restore it.
        if (next === 'canceled') {
          const rollbackId = rollbackJobIdRef.current;
          if (rollbackId && String(rollbackId) !== String(effectiveId)) {
            cancelAcknowledgedJobIdRef.current = null;
            cleanupTimer();
            cleanupTimeout();
            setProgress(null);
            setLastEmbeddingProgress(null);
            setResultRef(null);
            setErrorType(null);
            setError(null);
            setJobIdAndPersist(rollbackId);
            pollLoop(rollbackId);
            return true;
          }
        }

        if (!isTerminal(next)) pollLoop(effectiveId);

        return true;
      } catch (e) {
        if (e?.name === 'AbortError') return false;
        setErrorType('network');
        setError(toErrorMessage(e) || 'Network error');
        return false;
      } finally {
        if (mountedRef.current) setIsCanceling(false);
      }
    },
    [abortInFlight, baseUrlOverride, cleanupSSE, cleanupTimer, cleanupTimeout, dbName, effectiveSessionId, fetchStatusOnce, jobId, pollLoop, setJobIdAndPersist, state],
  );

  const retry = useCallback(async () => {
    const payload = lastStartPayloadRef.current;
    if (!payload) return null;
    return start(payload);
  }, [start]);

  const resume = useCallback(
    (id) => {
      if (!id) return;
      setJobIdAndPersist(id);
      pollLoop(id);
    },
    [pollLoop, setJobIdAndPersist],
  );

  const clear = useCallback(() => {
    cleanupTimer();
    cleanupSSE();
    cleanupTimeout();
    abortInFlight();
    setJobIdAndPersist(null);
  }, [abortInFlight, cleanupSSE, cleanupTimer, cleanupTimeout, setJobIdAndPersist]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimer();
      cleanupSSE();
      cleanupTimeout();
      abortInFlight();
    };
  }, [abortInFlight, cleanupSSE, cleanupTimer, cleanupTimeout]);

  // Keep hook in sync if another component updates the persisted job id.
  useEffect(() => {
    const updateFromStorage = () => {
      const next = getConformerJobIdFromStorage({ dbName, sessionId: effectiveSessionId, baseUrlOverride });

      // Ignore no-op updates (prevents duplicate polling intervals).
      if ((next || null) === (jobIdRef.current || null)) return;

      // Same rationale as in setJobIdAndPersist(): storage-driven job id updates do not carry
      // status_url/cancel_url, so never keep stale URLs across job switches.
      jobEndpointsRef.current = { statusUrl: null, cancelUrl: null, streamUrl: null };
      cleanupSSE();

      setJobId(next);
      setState(next ? 'queued' : 'idle');
      if (next) {
        // If start() already opened an SSE/poll for this id, the
        // CONFORMER_JOB_CHANGED_EVENT from setJobIdAndPersist will fire
        // synchronously and land here.  Avoid a duplicate pollLoop by
        // checking whether an SSE connection or poll timer is already
        // active for this job.
        if (!eventSourceRef.current && !timerRef.current) {
          pollLoop(next);
        }
      } else {
        cleanupTimer();
        abortInFlight();
      }
    };

    const onEvent = () => updateFromStorage();
    window.addEventListener(CONFORMER_JOB_CHANGED_EVENT, onEvent);

    const onStorage = (e) => {
      if (e?.key === storageKey) updateFromStorage();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(CONFORMER_JOB_CHANGED_EVENT, onEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, [abortInFlight, baseUrlOverride, cleanupSSE, cleanupTimer, dbName, effectiveSessionId, pollLoop, storageKey]);

  // If we have a persisted jobId, fetch once on mount.
  useEffect(() => {
    if (!jobId) return;
    pollLoop(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressMessage = useMemo(() => formatConformerJobProgressMessage(progress), [progress]);
  const mappingMessage = useMemo(() => formatConformerJobProgressMessage(lastEmbeddingProgress), [lastEmbeddingProgress]);
  const mappingRaw = lastEmbeddingProgress?.raw ?? null;
  const isActive = !!jobId && (state === 'queued' || state === 'running');

  useEffect(() => {
    if (!jobId) return;
    if (!progressMessage) return;

    const msg = String(progressMessage).trim();
    if (!msg) return;
    if (msg === lastLoggedMsgRef.current) return;

    lastLoggedMsgRef.current = msg;
    setProgressLog((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      const next = [...arr, { ts: Date.now(), message: msg }];
      return next.length > 120 ? next.slice(next.length - 120) : next;
    });
  }, [jobId, progressMessage]);

  return {
    jobId,
    state,
    progress,
    progressMessage,
    mappingMessage,
    mappingRaw,
    progressLog,
    resultRef,
    error,
    errorType,
    isActive,
    isStarting,
    isCanceling,
    start,
    cancel,
    retry,
    resume,
    clear,
  };
}
