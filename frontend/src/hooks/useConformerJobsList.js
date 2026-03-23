import { useCallback, useEffect, useRef, useState } from 'react';

import { listConformerJobs, listSessionConformerJobs } from '../utils/conformerJobsApi';
import { DB_NAME } from '../config';
import { CONFORMER_JOB_CHANGED_EVENT, CONFORMER_JOB_TERMINAL_EVENT } from '../utils/conformerJobStorage';
import { getSessionId } from '../utils/sessionApi';

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

/**
 * Hook for listing conformer jobs, scoped by session ID.
 *
 * @param {(string|null)} sessionId - The session ID to filter by (preferred over ownerId)
 * @param {{dbName?: string, limit?: number, baseUrlOverride?: string, ownerId?: string}} options
 */
export function useConformerJobsList(sessionId, { dbName = DB_NAME, limit = 50, baseUrlOverride, ownerId } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [before, setBefore] = useState(null);

  const ctrlRef = useRef(null);

  // Use provided sessionId, fall back to ownerId (for backwards compat), or get current session
  const effectiveSessionId = sessionId || ownerId || getSessionId();

  const fetchPage = useCallback(
    async ({ before: beforeIso, append } = {}) => {
      if (ctrlRef.current) ctrlRef.current.abort();
      const controller = new AbortController();
      ctrlRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await (async () => {
          if (effectiveSessionId) {
            try {
              const r = await listSessionConformerJobs({
                sessionId: effectiveSessionId,
                dbName,
                limit,
                before: beforeIso || undefined,
                baseUrlOverride,
                signal: controller.signal,
              });
              // If the endpoint exists but returns an error, fall back to the legacy list.
              if (r?.ok) return r;
            } catch {
              // fall back
            }
          }

          return listConformerJobs({
            dbName,
            sessionId: effectiveSessionId || undefined,
            limit,
            before: beforeIso || undefined,
            baseUrlOverride,
            signal: controller.signal,
          });
        })();

        if (!res.ok) {
          let msg = `List request failed (${res.status})`;
          try {
            const j = await res.json();
            msg = j?.message || j?.error || msg;
          } catch {
            // ignore
          }
          setError(msg);
          return;
        }

        const json = await res.json();
        const data = json?.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

        setItems((prev) => (append ? prev.concat(list) : list));

        // best-effort pagination cursor
        const last = list[list.length - 1];
        const cursor = last?.updated_at || last?.created_at || last?.meta?.timestamp || null;
        setBefore(cursor);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setError(toErrorMessage(e) || 'Network error');
      } finally {
        setLoading(false);
        ctrlRef.current = null;
      }
    },
    [baseUrlOverride, dbName, effectiveSessionId, limit],
  );

  const refresh = useCallback(() => fetchPage({ before: null, append: false }), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!before) return;
    fetchPage({ before, append: true });
  }, [before, fetchPage]);

  /**
   * Optimistically update a job item in the list.
   * @param {string} jobId - The job ID to update
   * @param {object} updates - Partial job data to merge (e.g., { name, description })
   */
  const updateItem = useCallback((jobId, updates) => {
    if (!jobId || !updates) return;
    setItems((prev) =>
      prev.map((job) => {
        const id = job?.job_id || job?.id;
        if (id === jobId) {
          return { ...job, ...updates };
        }
        return job;
      }),
    );
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      if (ctrlRef.current) ctrlRef.current.abort();
      ctrlRef.current = null;
    };
  }, [refresh]);

  // Auto-refresh when a conformer job is created or cleared in this session/db scope
  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail;
      // If the event carries scope info, only refresh when it matches
      if (d) {
        if (d.dbName && d.dbName !== dbName) return;
        if (d.sessionId && d.sessionId !== effectiveSessionId) return;
      }
      // Single immediate refresh when a job is submitted or cleared.
      // A delayed follow-up (500 ms) covers eventual-consistency lag on the backend.
      refresh();
      const t1 = setTimeout(refresh, 500);
      return () => { clearTimeout(t1); };
    };

    window.addEventListener(CONFORMER_JOB_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CONFORMER_JOB_CHANGED_EVENT, handler);
  }, [dbName, effectiveSessionId, refresh]);

  // Event-driven refresh: when any single-job poller detects a terminal state (success/failed/canceled),
  // it dispatches CONFORMER_JOB_TERMINAL_EVENT. We refresh once so the panel shows the updated status
  // without needing a continuous polling loop.
  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail;
      if (d) {
        if (d.dbName && d.dbName !== dbName) return;
        if (d.sessionId && d.sessionId !== effectiveSessionId) return;
      }
      refresh();
    };

    window.addEventListener(CONFORMER_JOB_TERMINAL_EVENT, handler);
    return () => window.removeEventListener(CONFORMER_JOB_TERMINAL_EVENT, handler);
  }, [dbName, effectiveSessionId, refresh]);

  return { items, loading, error, refresh, loadMore, updateItem };
}
