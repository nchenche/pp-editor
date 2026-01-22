// src/hooks/useGenerate3D.js
import { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';
import { useOwnerId } from './useOwnerId';
import { useConformerJob } from './useConformerJob';

function toErrorMessage(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === 'object' && typeof value.message === 'string') return value.message;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function mapResultRefToLegacyResult(resultRef) {
    const props = resultRef?.properties || {};
    return {
        ...props,
        pdb: props.PDB || props.pdb || '',
        PDB: props.PDB || props.pdb || '',
        smiles: props.SMILES || props.smiles || '',
        SMILES: props.SMILES || props.smiles || '',
        sdf: props.SDF || props.sdf || '',
        SDF: props.SDF || props.sdf || '',
        biln: props.BILN || props.biln || '',
        BILN: props.BILN || props.biln || '',
    };
}

export function useGenerate3D(baseUrlOverride) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const ownerId = useOwnerId();
    const dbName = 'pepedit';
    const {
        jobId,
        state: jobState,
        progress,
        progressMessage,
        mappingMessage,
        mappingRaw,
        progressLog,
        resultRef,
        error: jobError,
        errorType,
        isActive: isJobActive,
        isStarting,
        isCanceling,
        start: startJob,
        cancel: cancelJob,
        retry: retryJob,
        clear: clearJob,
    } = useConformerJob({ dbName, ownerId, baseUrlOverride: baseUrlOverride ?? API_BASE_URL });

    // Mirror job state into legacy { result, error, loading } shape.
    const jobDerivedResult = useMemo(() => {
        if (jobState !== 'success') return null;
        return {
            ...mapResultRefToLegacyResult(resultRef),
            jobId: jobId || null,
        };
    }, [jobId, jobState, resultRef]);

    useLayoutEffect(() => {
        if (!jobDerivedResult) return;
        setResult((prev) => {
            const prevObj = (prev && typeof prev === 'object') ? prev : null;
            const prevPdb = prevObj?.pdb || prevObj?.PDB || '';
            const nextPdb = jobDerivedResult?.pdb || jobDerivedResult?.PDB || '';
            const sameJob = !!jobId && String(prevObj?.jobId || '') === String(jobId);

            // If the job status payload omits large fields (like PDB), don't clobber an already-loaded
            // structure for the same job.
            if (sameJob && prevPdb && !nextPdb) {
                return {
                    ...jobDerivedResult,
                    pdb: prevPdb,
                    PDB: prevPdb,
                };
            }

            return jobDerivedResult;
        });
        setError(null);
    }, [jobDerivedResult, jobId]);

    useEffect(() => {
        // Keep legacy error in sync with the job system.
        // Important: clear the previous error when the job transitions to canceled/success
        // and the job hook clears its error.
        if (!jobError) {
            setError(null);
            return;
        }
        setError(toErrorMessage(jobError));
    }, [jobError]);

    useEffect(() => {
        // Preserve previously loaded structures on cancel so users can keep interacting with Mol*.
        // (A canceled re-run should not clobber the last successful result.)
        if (jobState === 'failed') {
            setResult(null);
        }
    }, [jobState]);

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
                clearJob();
                return;
            }

            const isTemplateEndpoint = endpoint.includes('generate_3d_from_template');
            const isAsyncConformer = !isTemplateEndpoint && endpoint.includes('generate_conformer');
            const isAsyncTemplate = isTemplateEndpoint;

            if (isAsyncConformer || isAsyncTemplate) {
                // Delegate to job system.
                const body = extraBody && typeof extraBody === 'object' ? { ...extraBody } : {};
                if (!body.biln) body.biln = bilnValue;

                if (hasConstraints) {
                    const isCoiled = ssConstraints.every(seq => seq.every(ch => ch === '-'));
                    body.ss_constraints = isCoiled ? null : ssConstraints;
                }

                // embed_params is optional; allow callers to supply it.
                const embedParams = body.embed_params || body.embedParams || undefined;

                // Template endpoint requires owner_id key even when null.
                if (isAsyncTemplate && !Object.prototype.hasOwnProperty.call(body, 'owner_id')) {
                    body.owner_id = ownerId ?? null;
                }

                setLoading(true);
                try {
                    await startJob({
                        biln: body.biln,
                        ssConstraints: body.ss_constraints ?? null,
                        embedParams,
                        requestParams,
                        ownerId: Object.prototype.hasOwnProperty.call(body, 'owner_id') ? body.owner_id : (ownerId ?? undefined),
                        endpoint,
                        extraBody: body,
                    });
                } finally {
                    // loading state for async jobs is derived from isJobActive/isStarting; keep legacy true while start runs.
                    setLoading(false);
                }
                return;
            }

            // Cancel previous request (sync/template)
            if (ctrlRef.current) {
                ctrlRef.current.abort();
                ctrlRef.current = null;
            }
            const controller = new AbortController();
            ctrlRef.current = controller;

            // set up body from extraBody and defaults (sync/template)
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
                // Build URL the same way as `useFetchDepiction`:
                // - allow base prefix like '' or '/api' (prod behind nginx)
                // - allow base absolute like 'https://host' or 'https://host/api'
                // - preserve base path even when endpoint starts with '/'
                const base = baseUrlOverride ?? API_BASE_URL ?? '';
                const urlObj = (() => {
                    if (typeof endpoint === 'string' && endpoint.startsWith('http')) {
                        return new URL(endpoint);
                    }

                    // If base is absolute (http...), concatenate directly.
                    if (typeof base === 'string' && base.startsWith('http')) {
                        return new URL(`${base}${endpoint}`);
                    }

                    // base is '' or a relative prefix like '/api'
                    return new URL(`${base}${endpoint}`, window.location.origin);
                })();

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
        [clearJob, ownerId, startJob],
    );

    // Important: don't report "loading" purely based on a queued/running state unless we actually
    // have an active job id. Otherwise a failed start request can leave the UI spinning forever.
    const hasJob = !!jobId;
    const derivedLoading = loading
        || isStarting
        || (hasJob && (isJobActive || jobState === 'queued' || jobState === 'running'));
    const derivedError = error || (jobError ? toErrorMessage(jobError) : null);

    return {
        result,
        error: derivedError,
        loading: derivedLoading,
        generate3D,
        setResult,

        // Async job extras (safe to ignore by old call sites)
        jobId,
        jobState,
        progress,
        progressMessage,
        mappingMessage,
        mappingRaw,
        progressLog,
        errorType,
        isCanceling,
        cancelJob,
        retryJob,
        clearJob,
    };
}