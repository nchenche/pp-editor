import { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';
import { useSessionId } from './useSessionId';


// Simple in-memory cache (per session)
const CACHE = new Map(); // key -> { data, ts }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

const LIBRARY_UPDATED_EVENT = 'pp-editor:library-updated';
let libraryCacheNonce = 0;

function makeRequestUrl(baseUrl, paramsObj) {
  // Build the request URL without owner_id.
  // apiFetch is responsible for injecting owner_id consistently across the app.
  const params = new URLSearchParams();
  if (paramsObj.search) params.append('search', paramsObj.search);
  if (paramsObj.caps) params.append('filter', 'm_type:cap');
  if (paramsObj.natural) params.append('filter', 'm_subtype:natural');
  if (paramsObj.nonNatural) params.append('filter', 'm_subtype:non-natural');
  const suffix = params.toString();
  return suffix ? `${baseUrl}&${suffix}` : baseUrl;
}

function makeCacheKey(requestUrl, ownerKey) {
  // Cache is owner-scoped, even though owner_id isn't added to requestUrl.
  return `${requestUrl}::owner=${ownerKey || 'anon'}`;
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

// Call this after adding/updating monomers so the design-page library refetches.
export function invalidateLibraryFetching(reason = 'updated') {
  clearLibraryFetchCache();
  libraryCacheNonce += 1;
  if (typeof window !== 'undefined' && window?.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(LIBRARY_UPDATED_EVENT, { detail: { reason, nonce: libraryCacheNonce } }));
  }
}

export function useLibraryFetching({ search = '', caps = false, natural = false, nonNatural = false }) {
  // Use sessionId for cache scoping (apiFetch will inject owner_id from session via getOwnerId())
  const sessionId = useSessionId();

  const [nonce, setNonce] = useState(libraryCacheNonce);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevDataRef = useRef([]);

  // Use unified monomers endpoint; server returns images as JSON-safe base64 when include_images=true.
  // Keep apiFetch() so owner_id/user_id is still injected and public+personal behavior stays unchanged.
  const baseUrl = `${API_BASE_URL}/api/db/monomers?include_images=true&efields=m_id,sdf,smiles`;
  const requestUrl = useMemo(
    () => makeRequestUrl(baseUrl, { search, caps, natural, nonNatural }),
    [baseUrl, search, caps, natural, nonNatural]
  );
  const cacheKey = useMemo(
    () => makeCacheKey(requestUrl, sessionId || ''),
    [requestUrl, sessionId]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window?.addEventListener) return;
    const handler = (e) => {
      const nextNonce = e?.detail?.nonce;
      setNonce(typeof nextNonce === 'number' ? nextNonce : (v) => v + 1);
    };
    window.addEventListener(LIBRARY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(LIBRARY_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const url = requestUrl;
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
        const payload = json?.data ?? json;
        const list = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload?.monomers) ? payload.monomers : []);

        // Back-compat: some UIs expect `image_url` to contain a base64 png string.
        const next = (list || []).map((m) => {
          if (!m || typeof m !== 'object') return m;
          if (m.image_url) return m;
          if (m.image_binary) return { ...m, image_url: m.image_binary };
          if (m.image_base64) return { ...m, image_url: m.image_base64 };
          return m;
        });

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

    // Only fetch when cache is empty (or stale, since getCached prunes stale entries)
    if (!cached) run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, requestUrl, nonce]);

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