import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';
import { normalizeMoleculeSvgQueryParams } from '../utils/moleculeRendering';


export const useFetchMolecule = (smiles, queryParams) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const stableStringify = (value) => {
        try {
            if (!value || typeof value !== 'object') return JSON.stringify(value);
            if (Array.isArray(value)) return JSON.stringify(value);
            const keys = Object.keys(value).sort();
            const out = {};
            for (const k of keys) out[k] = value[k];
            return JSON.stringify(out);
        } catch {
            return '';
        }
    };

    const formatRdkitSmilesError = (rawMessage) => {
        const text = String(rawMessage || '').trim();
        if (!text) return 'Request failed';

        // If backend returns an HTML error page or a Python stack trace, do not expose it.
        if (
            /^<!doctype\s+html/i.test(text) ||
            /^<html\b/i.test(text) ||
            /Boost\.Python\.ArgumentError/i.test(text) ||
            /Traceback\s*\(most\s+recent\s+call\s+last\)/i.test(text)
        ) {
            return 'Ensure your SMILES is valid.';
        }

        // Strip RDKit timestamps like: [15:16:39]
        const withoutTimestamps = text.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/gm, '').trim();

        // If this looks like RDKit SMILES Parse Error, return a simple message.
        if (/SMILES\s+Parse\s+Error/i.test(withoutTimestamps)) {
            return 'Ensure your SMILES is valid.';
        }

        // Otherwise, keep it compact.
        const singleLine = withoutTimestamps.replace(/\s+/g, ' ').trim();
        return singleLine.length > 220 ? `${singleLine.slice(0, 220)}…` : singleLine;
    };

    const extractResponseErrorMessage = async (response, inputSmiles) => {
        try {
            const contentType = response?.headers?.get?.('content-type') || '';
            if (contentType.toLowerCase().includes('application/json')) {
                const json = await response.json();
                const msg =
                    json?.error ||
                    json?.message ||
                    json?.detail ||
                    json?.msg ||
                    (typeof json === 'string' ? json : null);
                if (msg) return formatRdkitSmilesError(msg);
                return `Request failed (${response.status})`;
            }

            const text = await response.text();
            if (text) return formatRdkitSmilesError(text);
            return `Request failed (${response.status})`;
        } catch {
            return `Request failed (${response?.status || 'unknown'})`;
        }
    };

    const smilesKey = (() => {
        try {
            if (typeof smiles === 'string') return smiles;
            return JSON.stringify(smiles ?? null);
        } catch {
            return String(smiles ?? '');
        }
    })();

    const rawQueryKey = stableStringify(queryParams || {});

    const normalizedQueryParams = useMemo(
        () => normalizeMoleculeSvgQueryParams(queryParams, smiles),
        [rawQueryKey, smilesKey],
    );

    

    const queryKey = stableStringify(normalizedQueryParams || {});

    useEffect(() => {
        const isEmpty =
            smiles == null ||
            (typeof smiles === 'string' && smiles.trim().length === 0) ||
            (Array.isArray(smiles) && smiles.length === 0);
        if (isEmpty) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const baseURL = `${API_BASE_URL}/api/molecules/svg-rendering`;
        const params = new URLSearchParams();

        // Append query parameters
        Object.entries(normalizedQueryParams || {}).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(val => params.append(key, val));
            } else if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        });

        const url = `${baseURL}?${params.toString()}`;
        const payload = JSON.stringify({ smiles });

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiFetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: payload,
                    signal,
                });

                if (!response.ok) {
                    const msg = await extractResponseErrorMessage(response, smiles);
                    throw new Error(msg);
                }

                const result = await response.json();
                setData(() => result);
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [smilesKey, queryKey]);

    return { data, isLoading, error };
};


export const useFetchData = ( url, payload ) => {

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await apiFetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: payload,
                    signal,
                });
                
                if (!response.ok) {
                    throw new Error(`Error fetching data to ${url}`);
                }

                const json = await response.json();
                setData(json);
                setError(null);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [url, payload]);

    return { data, isLoading, error };
};


export const useGetData = (url) => {
    const [data, setData] = useState(null); // null so we can store objects
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      if (!url) return;
  
      const controller = new AbortController();
  
      const fetchData = async () => {
        setIsLoading(true);
        try {
                    const response = await apiFetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`Error fetching data: ${response.status}`);
          }
          const json = await response.json();
          // Set the entire response object (which includes data, meta, status)
          setData(json);
          setError(null);
        } catch (err) {
          if (err.name !== 'AbortError') {
            setError(err.message);
          }
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchData();
  
      // Abort fetch on unmount
      return () => controller.abort();
    }, [url]);
  
    return { data, isLoading, error };
  };
