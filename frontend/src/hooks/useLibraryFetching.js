import { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';


// Simple in-memory cache (per session)
const CACHE = new Map(); // key -> { data, ts }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

function makeKey(baseUrl, paramsObj) {
  // Use the full URL including normalized params to key the cache
  const params = new URLSearchParams();
  if (paramsObj.search) params.append('search', paramsObj.search);
  if (paramsObj.caps) params.append('filter', 'm_type:cap');
  if (paramsObj.natural) params.append('filter', 'm_subtype:natural');
  if (paramsObj.nonNatural) params.append('filter', 'm_subtype:non-natural');
  return `${baseUrl}&${params.toString()}`;
}

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  // naive LRU eviction (drop oldest insertion)
  if (CACHE.size > CACHE_MAX_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
}

// Optional: allow manual cache clear from devtools/tests
export function clearLibraryFetchCache() {
  CACHE.clear();
}

export function useLibraryFetching({ search = '', caps = false, natural = false, nonNatural = false }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevDataRef = useRef([]);

  const baseUrl = `${API_BASE_URL}/api/db/monomers/images?efields=m_id,sdf,smiles`;
  const cacheKey = useMemo(() => makeKey(baseUrl, { search, caps, natural, nonNatural }),
    [baseUrl, search, caps, natural, nonNatural]
  );

  useEffect(() => {
    const controller = new AbortController();
    const url = cacheKey; // already includes params
    setError(null);

    // Serve from cache immediately if present
    const cached = getCached(cacheKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await apiFetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const json = await res.json();
        const next = (json?.data || []);  // .slice(0, 200)

        if (cancelled) return;
        setCached(cacheKey, next);
        setData(next);
        setIsLoading(false);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        if (cancelled) return;
        setError(err?.message || 'Fetch error');
        setIsLoading(false);
      }
    }

    // Always revalidate in background (stale-while-revalidate)
    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey]);

  // remember last good data to avoid flicker while loading
  useEffect(() => {
    if (!isLoading && Array.isArray(data) && data.length) {
      prevDataRef.current = data;
    }
  }, [isLoading, data]);

  // Use previous data while loading
  const displayData = isLoading && prevDataRef.current.length > 0 ? prevDataRef.current : data;

  return { data: displayData, isLoading, error };
}