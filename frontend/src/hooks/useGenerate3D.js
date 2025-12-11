// src/hooks/useGenerate3D.js
import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';

export function useGenerate3D() {
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const ctrlRef = useRef(null);
    const reqIdRef = useRef(0);

    const generate3D = useCallback(
        async (bilnValue, ssConstraints, options = {}) => {
            const {
                endpoint = '/api/core/molecules/generate_3d',
                extraBody = null,
            } = options;

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

            const hasConstraints = typeof ssConstraints === 'string' && ssConstraints.length > 0;
            const allDash = hasConstraints && /^-+$/.test(ssConstraints);
            const withoutSS = hasConstraints ? (allDash ? 'true' : 'false') : 'false';

            const body = extraBody && typeof extraBody === 'object'
                ? { ...extraBody }
                : {};

            // default body for plain generation
            if (!body.sequence && !body.biln) {
                body.sequence = bilnValue;
            }

            if (hasConstraints && !allDash) {
                // keep old key for legacy endpoint
                if (endpoint.endsWith('generate_3d')) {
                    body.secstruct = ssConstraints;
                }
                // for template endpoint you can also add secstruct if needed later
            }

            const myReqId = ++reqIdRef.current;
            setLoading(true);
            try {
                const url = `${API_BASE_URL}${endpoint}?without_ss=${withoutSS}&no_hydrogens=false&is_protonated=true&ph_value=7.4`;
                const response = await fetch(url, {
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
                setResult(json.data);
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