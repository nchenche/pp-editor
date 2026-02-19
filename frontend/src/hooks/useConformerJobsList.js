import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listConformerJobs, listSessionConformerJobs } from '../utils/conformerJobsApi';
import { CONFORMER_JOB_CHANGED_EVENT } from '../utils/conformerJobStorage';
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
export function useConformerJobsList(sessionId, { dbName = 'pepedit', limit = 50, baseUrlOverride, ownerId } = {}) {
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
      // Immediate refresh + staggered follow-ups so the new job appears even if the
      // backend takes a moment to become consistent.
      refresh();
      const t1 = setTimeout(refresh, 500);
      const t2 = setTimeout(refresh, 1600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    };

    window.addEventListener(CONFORMER_JOB_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CONFORMER_JOB_CHANGED_EVENT, handler);
  }, [dbName, effectiveSessionId, refresh]);

  // Auto-poll the list while any jobs are in a non-terminal state (queued / running).
  // This ensures the panel reflects status transitions without requiring a manual refresh.
  const LIST_POLL_INTERVAL_MS = 2000;
  const TERMINAL_STATES = new Set(['success', 'failed', 'canceled']);

  const hasActiveJobs = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return false;
    return items.some((job) => {
      const st = String(job?.state || '').toLowerCase();
      return st && !TERMINAL_STATES.has(st);
    });
  }, [items]);

  useEffect(() => {
    if (!hasActiveJobs) return;

    const id = setInterval(() => {
      refresh();
    }, LIST_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [hasActiveJobs, refresh]);

  return { items, loading, error, refresh, loadMore, updateItem };
}
