import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listConformerJobs } from '../utils/conformerJobsApi';
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
        const res = await listConformerJobs({
          dbName,
          sessionId: effectiveSessionId || undefined,
          limit,
          before: beforeIso || undefined,
          baseUrlOverride,
          signal: controller.signal,
        });

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

  useEffect(() => {
    refresh();
    return () => {
      if (ctrlRef.current) ctrlRef.current.abort();
      ctrlRef.current = null;
    };
  }, [refresh]);

  return { items, loading, error, refresh, loadMore };
}
