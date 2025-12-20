// src/hooks/useGenerate3D.js
import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';

export function useGenerate3D(baseUrlOverride) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const ctrlRef = useRef(null);
    const reqIdRef = useRef(0);

    const generate3D = useCallback(
        async (bilnValue, ssConstraints, options = {}) => {
            const {
                endpoint = '/api/core/molecules/generate_conformer',
                extraBody = null,
                requestParams = null,
            } = options;

            const hasConstraints = ssConstraints !== null && Array.isArray(ssConstraints) && ssConstraints.length > 0;

            // If sequence is empty, clear and bail fast
            if (!bilnValue || !bilnValue.trim()) {
                if (ctrlRef.current) { ctrlRef.current.abort(); ctrlRef.current = null; }
                setResult({ pdb: '' });
                setError(null);
                setLoading(false);
                return;
            }

            // Cancel previous request
            if (ctrlRef.current) {
                ctrlRef.current.abort();
                ctrlRef.current = null;
            }
            const controller = new AbortController();
            ctrlRef.current = controller;

            // set up body from extraBody and defaults
            const body = extraBody && typeof extraBody === 'object'
                ? { ...extraBody }
                : {};

            // default body for plain generation
            if (!body.biln) {
                body.biln = bilnValue;
                // body.embed_params = { use_random_coords: true, timeout: 80};
            }

            if (hasConstraints) {
                const isCoiled = ssConstraints.every(seq => seq.every(ch => ch === '-'));
                body.ss_constraints = isCoiled ? null : ssConstraints;
            }

            const myReqId = ++reqIdRef.current;
            setLoading(true);
            try {
                const base = baseUrlOverride ?? API_BASE_URL ?? '';
                const originBase = typeof base === 'string' && base.startsWith('http')
                    ? base
                    : `${window.location.origin}${base}`;

                const urlObj = new URL(endpoint, originBase);

                const effectiveParams = {
                    no_hydrogens: false,
                    is_protonated: true,
                    ph_value: 7.4,
                    ...(requestParams && typeof requestParams === 'object' ? requestParams : {}),
                };
                for (const [k, v] of Object.entries(effectiveParams)) {
                    if (v == null) continue;
                    urlObj.searchParams.set(k, String(v));
                }

                const url = urlObj.toString();
                const response = await apiFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                if (reqIdRef.current !== myReqId) return;
                if (!response.ok) {
                    let msg = 'Request failed';
                    try { const j = await response.json(); msg = j?.message || msg; } catch { }
                    setError(msg);
                    setResult({ pdb: '' });
                    setLoading(false);
                    return;
                }
                const json = await response.json();
                if (reqIdRef.current !== myReqId) return;

                const data = json?.data || {};
                // Special case: template endpoint returned no PDB
                if (
                    endpoint.includes('generate_3d_from_template') &&
                    (! data || !data.pdb || !String(data.pdb).trim())
                ) {
                    setError('Failed to generate a 3D conformer from the selected template.');
                    setResult({ pdb: '' });
                    setLoading(false);
                    return;
                }

                setResult(data);
                setError(null);
            } catch (e) {
                if (e?.name === 'AbortError') return;
                setError(e);
                setResult({ pdb: '' });
            } finally {
                if (reqIdRef.current === myReqId) {
                    setLoading(false);
                    ctrlRef.current = null;
                }
            }
        },
        [],
    );

    return { result, error, loading, generate3D, setResult };
}