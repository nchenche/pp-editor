import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  startConformerJob,
  getConformerJob,
  cancelConformerJob,
} from '../utils/conformerJobsApi';

import {
  CONFORMER_JOB_CHANGED_EVENT,
  clearConformerJobIdFromStorage,
  getConformerJobIdFromStorage,
  setConformerJobIdInStorage,
  getConformerJobStorageKey,
} from '../utils/conformerJobStorage';

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
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const POLL_INTERVAL_MS = 1000;

/**
 * Hook that manages an async conformer job lifecycle.
 *
 * @param {{dbName?: string, ownerId?: (string|null), baseUrlOverride?: (string|undefined)}} params
 */
export function useConformerJob({ dbName = 'pepedit', ownerId = null, baseUrlOverride } = {}) {
  const storageKey = useMemo(() => getConformerJobStorageKey({ dbName, ownerId }), [dbName, ownerId]);

  const [jobId, setJobId] = useState(() => getConformerJobIdFromStorage({ dbName, ownerId }));
  const jobIdRef = useRef(jobId);
  const [state, setState] = useState(jobId ? 'queued' : 'idle');
  const [progress, setProgress] = useState(null);
  const [lastEmbeddingProgress, setLastEmbeddingProgress] = useState(null);
  const [resultRef, setResultRef] = useState(null);

  // errorType: 'network' (transport/non-2xx) | 'job' (backend state=failed)
  const [errorType, setErrorType] = useState(null);
  const [error, setError] = useState(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const mountedRef = useRef(true);

  const lastStartPayloadRef = useRef(null);

  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (inFlightRef.current) {
      inFlightRef.current.abort();
      inFlightRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorType(null);
    setError(null);
  }, []);

  const setJobIdAndPersist = useCallback(
    (nextJobId) => {
      const normalized = nextJobId ? String(nextJobId).trim() : '';
      if (!normalized) {
        jobIdRef.current = null;
        clearConformerJobIdFromStorage({ dbName, ownerId });
        setJobId(null);
        setState('idle');
        setProgress(null);
        setLastEmbeddingProgress(null);
        setResultRef(null);
        clearError();
        return;
      }

      // Update ref before emitting the storage change event to avoid duplicate poll loops.
      jobIdRef.current = normalized;
      setConformerJobIdInStorage(normalized, { dbName, ownerId });
      setJobId(normalized);
      setState('queued');
      clearError();
    },
    [dbName, ownerId, clearError],
  );

  const fetchStatusOnce = useCallback(
    async (id) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return null;

      abortInFlight();
      const controller = new AbortController();
      inFlightRef.current = controller;

      try {
        const res = await getConformerJob({ jobId: effectiveId, dbName, baseUrlOverride, signal: controller.signal });
        if (!res.ok) {
          let msg = `Status request failed (${res.status})`;
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
        const data = json?.data || {};
        const nextState = normalizeState(data?.state);

        setState(nextState);
        setProgress(data?.progress ?? null);
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
          setError(toErrorMessage(data?.error) || 'Job failed');
        } else {
          // Clear errors if job progresses again.
          setErrorType(null);
          setError(null);
        }

        return data;
      } catch (e) {
        if (e?.name === 'AbortError') return null;
        setErrorType('network');
        setError(toErrorMessage(e) || 'Network error');
        return null;
      } finally {
        if (inFlightRef.current === controller) {
          inFlightRef.current = null;
        }
      }
    },
    [abortInFlight, baseUrlOverride, dbName, jobId],
  );

  const pollLoop = useCallback(
    async (id) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return;

      const data = await fetchStatusOnce(effectiveId);
      const nextState = normalizeState(data?.state || state);

      if (!mountedRef.current) return;
      if (!effectiveId) return;

      if (isTerminal(nextState)) {
        cleanupTimer();
        return;
      }

      const delay = POLL_INTERVAL_MS;
      cleanupTimer();
      timerRef.current = setTimeout(() => {
        pollLoop(effectiveId);
      }, delay);
    },
    [cleanupTimer, fetchStatusOnce, jobId, state],
  );

  const start = useCallback(
    async ({ biln, ssConstraints, embedParams, requestParams, ownerId: ownerIdOverride } = {}) => {
      if (!biln || !String(biln).trim()) {
        setJobIdAndPersist(null);
        return null;
      }

      cleanupTimer();
      abortInFlight();
      clearError();

      // Important: starting a new job should not display progress from a previous job.
      setState('queued');
      setProgress(null);
      setLastEmbeddingProgress(null);
      setResultRef(null);

      setIsStarting(true);

      const payload = {
        biln,
        ssConstraints: ssConstraints ?? null,
        embedParams: embedParams ?? undefined,
        requestParams: requestParams ?? undefined,
        ownerId: ownerIdOverride ?? ownerId ?? undefined,
      };
      lastStartPayloadRef.current = payload;

      try {
        const res = await startConformerJob({
          biln: payload.biln,
          ssConstraints: payload.ssConstraints,
          embedParams: payload.embedParams,
          requestParams: payload.requestParams,
          ownerId: payload.ownerId,
          dbName,
          baseUrlOverride,
        });

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
        if (!id) {
          setErrorType('network');
          setError('Backend did not return job_id');
          return null;
        }

        setJobIdAndPersist(id);
        setState('queued');
        setProgress(null);
        setLastEmbeddingProgress(null);
        setResultRef(null);

        // Start polling immediately
        pollLoop(id);
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
    [abortInFlight, baseUrlOverride, cleanupTimer, clearError, dbName, ownerId, pollLoop, setJobIdAndPersist],
  );

  const cancel = useCallback(
    async (id) => {
      const effectiveId = id || jobId;
      if (!effectiveId) return false;

      cleanupTimer();
      abortInFlight();
      setIsCanceling(true);

      try {
        const res = await cancelConformerJob({ jobId: effectiveId, dbName, baseUrlOverride });
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

        // Refresh status once, then stop polling if terminal.
        const data = await fetchStatusOnce(effectiveId);
        const next = normalizeState(data?.state || state);
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
    [abortInFlight, baseUrlOverride, cleanupTimer, dbName, fetchStatusOnce, jobId, pollLoop, state],
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
    abortInFlight();
    setJobIdAndPersist(null);
  }, [abortInFlight, cleanupTimer, setJobIdAndPersist]);

  // On mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimer();
      abortInFlight();
    };
  }, [abortInFlight, cleanupTimer]);

  // Keep hook in sync if another component updates the persisted job id.
  useEffect(() => {
    const updateFromStorage = () => {
      const next = getConformerJobIdFromStorage({ dbName, ownerId });

      // Ignore no-op updates (prevents duplicate polling intervals).
      if ((next || null) === (jobIdRef.current || null)) return;

      setJobId(next);
      setState(next ? 'queued' : 'idle');
      if (next) {
        pollLoop(next);
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
  }, [abortInFlight, cleanupTimer, dbName, ownerId, pollLoop, storageKey]);

  // If we have a persisted jobId, fetch once on mount.
  useEffect(() => {
    if (!jobId) return;
    pollLoop(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressMessage = progress?.message ? String(progress.message) : null;
  const mappingMessage = lastEmbeddingProgress?.message ? String(lastEmbeddingProgress.message) : null;
  const mappingRaw = lastEmbeddingProgress?.raw ?? null;
  const isActive = !!jobId && (state === 'queued' || state === 'running');

  return {
    jobId,
    state,
    progress,
    progressMessage,
    mappingMessage,
    mappingRaw,
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
