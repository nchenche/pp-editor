import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';

import { API_BASE_URL } from '../../config';
import { useSessionId } from '../../hooks/useSessionId';
import { useConformerJobsList } from '../../hooks/useConformerJobsList';
import { setConformerJobIdInStorage } from '../../utils/conformerJobStorage';
import { formatConformerJobProgressMessage } from '../../utils/conformerJobProgress';
import { getConformerJobInputsFromStorage } from '../../utils/conformerJobInputsStorage';
import { getConformerJob } from '../../utils/conformerJobsApi';

export const CONFORMER_JOB_RESUME_EVENT = 'pp-conformer-job-resume';

function formatIsoTimestamp(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    try {
        return d.toLocaleString();
    } catch {
        return d.toISOString();
    }
}

function formatBilnPreview(biln) {
    const v = String(biln || '').trim();
    if (!v) return '';
    return v.length > 48 ? `${v.slice(0, 48)}…` : v;
}

function formatState(state) {
    const v = String(state || '').toLowerCase();
    if (!v) return 'unknown';
    return v;
}

function stateColor(state) {
    const v = String(state || '').toLowerCase();
    if (v === 'success') return 'success';
    if (v === 'failed') return 'error';
    if (v === 'canceled') return 'warning';
    if (v === 'running') return 'info';
    if (v === 'queued') return 'default';
    return 'default';
}

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasMeaningfulSsConstraints(ssConstraints) {
    if (!Array.isArray(ssConstraints) || ssConstraints.length === 0) return false;
    for (const seq of ssConstraints) {
        if (!Array.isArray(seq)) continue;
        for (const ch of seq) {
            const v = String(ch || '-').toUpperCase();
            if (v && v !== '-') return true;
        }
    }
    return false;
}

function normalizeScaffoldMappings(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (isPlainObject(value) && Array.isArray(value.mappings)) return value.mappings;
    return null;
}

function toRawScaffoldMapping(value) {
    if (!isPlainObject(value)) return null;

    const enabled = value.enabled != null ? !!value.enabled : true;
    const chainId = value.chainId ?? value.chain_id ?? null;
    const start = value.start ?? null;
    const end = value.end ?? null;
    const offset = Number.isFinite(Number(value.offset)) ? Number(value.offset) : 0;
    const manualMasks = Array.isArray(value.manualMasks)
        ? value.manualMasks
        : (Array.isArray(value.manual_masks) ? value.manual_masks : []);

    return {
        enabled,
        chainId,
        start,
        end,
        offset,
        manualMasks,
        disabledByUser: !!value.disabledByUser,
    };
}

function extractResumeInputsFromStored(stored) {
    const doc = stored && typeof stored === 'object' ? stored : null;
    const inputs = doc?.inputs && typeof doc.inputs === 'object' ? doc.inputs : null;
    const payload = inputs?.payload && typeof inputs.payload === 'object' ? inputs.payload : null;
    const queryParams = inputs?.query_params && typeof inputs.query_params === 'object' ? inputs.query_params : null;

    const ssConstraints = payload?.ss_constraints ?? null;
    const templateId = payload?.template_id ?? null;

    const scaffoldMappingsRaw = (() => {
        const list = normalizeScaffoldMappings(payload?.scaffold_mappings ?? payload?.scaffoldMappings ?? null);
        if (!Array.isArray(list)) return null;
        const out = [];
        for (const m of list) {
            const raw = toRawScaffoldMapping(m);
            if (!raw) continue;
            const seqIdx = m?.seq_idx ?? m?.seqIdx ?? null;
            const idxNum = Number(seqIdx);
            if (Number.isFinite(idxNum)) {
                out[idxNum] = raw;
            } else {
                out.push(raw);
            }
        }
        return out.length ? out : null;
    })();

    return {
        ssConstraints: Array.isArray(ssConstraints) ? ssConstraints : null,
        templateId: templateId != null ? String(templateId).trim() : null,
        scaffoldMappings: scaffoldMappingsRaw,
        queryParams,
    };
}

export function ConformerJobsPanel({ dbName = 'pepedit' }) {
    const sessionId = useSessionId();
    const { items, loading, error, refresh } = useConformerJobsList(sessionId, { dbName, limit: 50 });

    // Cache per-job server details (includes inputs.payload) to drive constraints display.
    // This avoids relying exclusively on localStorage keys, which can drift across API_BASE_URL scopes.
    const [jobDetailsById, setJobDetailsById] = useState({});
    const jobDetailsRef = useRef(jobDetailsById);
    useEffect(() => {
        jobDetailsRef.current = jobDetailsById;
    }, [jobDetailsById]);

    const detailsFetchCtrlRef = useRef(null);
    useEffect(() => {
        if (!Array.isArray(items) || items.length === 0) return;

        const ids = items
            .map((j) => (j?.job_id || j?.id || '') ? String(j?.job_id || j?.id || '').trim() : '')
            .filter(Boolean);
        if (ids.length === 0) return;

        // Only fetch details for jobs we don't already have.
        const missing = ids.filter((id) => !jobDetailsRef.current?.[id]);
        if (missing.length === 0) return;

        // Cancel any in-flight details fetch when the list changes.
        if (detailsFetchCtrlRef.current) {
            try { detailsFetchCtrlRef.current.abort(); } catch { /* ignore */ }
        }
        const controller = new AbortController();
        detailsFetchCtrlRef.current = controller;

        const maxConcurrency = 6;
        const queue = missing.slice();

        const worker = async () => {
            while (queue.length > 0 && !controller.signal.aborted) {
                const jobId = queue.shift();
                if (!jobId) continue;
                // Avoid duplicate fetches if another worker already filled it.
                if (jobDetailsRef.current?.[jobId]) continue;
                try {
                    const res = await getConformerJob({
                        jobId,
                        sessionId: sessionId || undefined,
                        dbName,
                        baseUrlOverride: API_BASE_URL,
                        signal: controller.signal,
                    });
                    if (!res.ok) continue;
                    const json = await res.json().catch(() => null);
                    const data = json?.data && typeof json.data === 'object' ? json.data : null;
                    if (!data) continue;

                    jobDetailsRef.current = { ...(jobDetailsRef.current || {}), [jobId]: data };
                    setJobDetailsById((prev) => ({ ...(prev || {}), [jobId]: data }));
                } catch (e) {
                    if (e?.name === 'AbortError') return;
                    // best-effort: ignore failures; fall back to localStorage/None
                }
            }
        };

        const workers = Array.from({ length: Math.min(maxConcurrency, queue.length) }, () => worker());
        Promise.allSettled(workers).finally(() => {
            if (detailsFetchCtrlRef.current === controller) detailsFetchCtrlRef.current = null;
        });

        return () => {
            try { controller.abort(); } catch { /* ignore */ }
            if (detailsFetchCtrlRef.current === controller) detailsFetchCtrlRef.current = null;
        };
    }, [items, sessionId, dbName]);

    const title = useMemo(() => (sessionId ? 'My conformer jobs' : 'Session conformer jobs'), [sessionId]);

    return (
        <Paper
            sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                height: '100%',
                minHeight: 0,
                width: '100%',
                minWidth: 0,
                flex: '1 1 auto',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {title} ({(items || []).length})
                </Typography>
                <Button size="small" onClick={refresh} disabled={loading}>
                    Refresh
                </Button>
            </Box>

            <Divider />

            {error && (
                <Typography variant="body2" sx={{ color: 'error.main', whiteSpace: 'pre-wrap' }}>
                    {String(error)}
                </Typography>
            )}

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <TableContainer sx={{ height: '100%', overflowX: 'auto' }}>
                    <Table
                        size="small"
                        stickyHeader
                        aria-label="conformer jobs"
                        sx={{ tableLayout: 'fixed' }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 72, px: 1, py: 0.5 }}>State</TableCell>
                                <TableCell sx={{ width: 160, px: 1, py: 0.5 }}>BILN</TableCell>
                                <TableCell sx={{ width: 120, px: 1, py: 0.5 }}>Constraints</TableCell>
                                <TableCell sx={{ width: 140, px: 1, py: 0.5 }}>Status / Time</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        width: 76,
                                        px: 1,
                                        py: 0.5,
                                        position: 'sticky',
                                        right: 0,
                                        zIndex: 3,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {(items || []).map((job) => {
                                const jobId = job?.job_id || job?.id || '';
                                const state = formatState(job?.state);
                                const progressMsg =
                                    formatConformerJobProgressMessage(job?.progress, { compact: true }) ||
                                    job?.progress?.message ||
                                    job?.progress_message ||
                                    '';
                                const biln = job?.result_ref?.properties?.BILN || job?.biln || job?.properties?.BILN || '';
                                const bilnPreview = formatBilnPreview(biln);
                                const pdb = job?.result_ref?.properties?.PDB || job?.result_ref?.properties?.pdb || '';

                                // Prefer server-provided inputs (job detail includes inputs.payload).
                                // Fall back to localStorage inputs if present.
                                const serverDetails = jobId ? (jobDetailsById?.[jobId] || null) : null;
                                const storedInputs = jobId
                                    ? getConformerJobInputsFromStorage(jobId, {
                                        dbName,
                                        sessionId: sessionId || undefined,
                                        baseUrlOverride: API_BASE_URL,
                                    })
                                    : null;
                                const inputsSource = serverDetails || (job?.inputs ? job : null) || storedInputs;
                                const extracted = inputsSource
                                    ? extractResumeInputsFromStored(inputsSource)
                                    : { ssConstraints: null, templateId: null, scaffoldMappings: null, queryParams: null };

                                const is3D = !!extracted.templateId || Array.isArray(extracted.scaffoldMappings);
                                const isSS = !is3D && hasMeaningfulSsConstraints(extracted.ssConstraints);
                                const constraintLabel = is3D ? '3D' : isSS ? 'Secondary structure' : 'None';

                                const updatedAt = job?.updated_at || job?.meta?.timestamp || '';
                                const createdAt = job?.created_at || '';
                                const ts = formatIsoTimestamp(updatedAt || createdAt);

                                const progressText = progressMsg ? String(progressMsg) : '';
                                const hideDone = progressText.trim().toLowerCase() === 'done';
                                const statusOrTime = (!hideDone && progressText) ? progressText : (ts || '');

                                const onResume = () => {
                                    if (!jobId) return;
                                    setConformerJobIdInStorage(jobId, { dbName, sessionId, baseUrlOverride: API_BASE_URL });

                                    window.dispatchEvent(new CustomEvent(CONFORMER_JOB_RESUME_EVENT, {
                                        detail: {
                                            jobId,
                                            biln: biln || '',
                                            pdb: pdb || '',
                                            ssConstraints: extracted.ssConstraints ?? null,
                                            templateId: extracted.templateId ?? null,
                                            scaffoldMappings: extracted.scaffoldMappings ?? null,
                                            requestParams: extracted.queryParams ?? null,
                                            resumeNonce: Date.now(),
                                        },
                                    }));
                                };

                                return (
                                    <TableRow key={jobId || Math.random()} hover>
                                        <TableCell sx={{ px: 1, py: 0.5 }}>
                                            <Chip label={state} size="small" color={stateColor(state)} variant="outlined" />
                                        </TableCell>

                                        <TableCell sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                                            {bilnPreview ? (
                                                <Tooltip title={biln} placement="top" arrow>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontSize: 12,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {bilnPreview}
                                                    </Typography>
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell sx={{ px: 1, py: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: constraintLabel === 'None' ? 'text.secondary' : 'text.primary',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {constraintLabel}
                                            </Typography>
                                        </TableCell>

                                        <TableCell sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                                            <Tooltip title={statusOrTime || ''} placement="top" arrow>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: 'block',
                                                    }}
                                                >
                                                    {statusOrTime || '—'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            sx={{
                                                px: 1,
                                                py: 0.5,
                                                position: 'sticky',
                                                right: 0,
                                                zIndex: 2,
                                                bgcolor: 'background.paper',
                                            }}
                                        >
                                            <Button size="small" onClick={onResume} disabled={!jobId || state === 'failed'}>
                                                Resume
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!loading && (!items || items.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                                            No jobs found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}

                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                                            Loading…
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Paper>
    );
}
