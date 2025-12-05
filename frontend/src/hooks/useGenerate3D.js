// src/hooks/useGenerate3D.js
import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';

import { decomposeBiln } from '../utils/bilnUtils';

export function useGenerate3D() {

    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // Abort stale requests and ignore late responses
    const ctrlRef = useRef(null);
    const reqIdRef = useRef(0);

    const generate3D = useCallback(async (bilnValue, ssConstraints) => {
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

        // Determine URL param from provided constraints
        const hasConstraints = typeof ssConstraints === 'string' && ssConstraints.length > 0;
        const allDash = hasConstraints && /^-+$/.test(ssConstraints);
        const withoutSS = hasConstraints ? (allDash ? 'true' : 'false') : 'false';

        // Build request body: include secstruct only when constraints are provided and not all '-'
        const body = { sequence: bilnValue };
        if (hasConstraints && !allDash) body.secstruct = ssConstraints;
        console.log('3D generation request body:', ssConstraints);

        const myReqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/core/molecules/generate_3d?without_ss=${withoutSS}&no_hydrogens=false&is_protonated=true&ph_value=7.4`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
            if (reqIdRef.current !== myReqId) return; // ignore if superseded
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
            if (e?.name === 'AbortError') {
                // Swallow aborts; a newer request is in flight
                return;
            }
            setError(e);
            setResult({ pdb: '' });
        } finally {
            if (reqIdRef.current === myReqId) {
                setLoading(false);
                ctrlRef.current = null;
            }
        }
    }, []);

    return { result, error, loading, generate3D, setResult };
}
