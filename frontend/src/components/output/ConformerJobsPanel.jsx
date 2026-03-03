import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

import { API_BASE_URL } from '../../config';
import { useSessionId } from '../../hooks/useSessionId';
import { useConformerJobsList } from '../../hooks/useConformerJobsList';
import { getLocalSessionMeta, formatSessionIdShort, SESSION_META_CHANGED_EVENT } from '../../utils/sessionApi';
import { setConformerJobIdInStorage } from '../../utils/conformerJobStorage';
import { formatConformerJobProgressMessage } from '../../utils/conformerJobProgress';
import { getConformerJobInputsFromStorage } from '../../utils/conformerJobInputsStorage';
import { getConformerJob, patchConformerJob, deleteConformerJob, bulkDeleteConformerJobs } from '../../utils/conformerJobsApi';
import { InlineJobNameEditor } from './InlineJobNameEditor';
import { JobDetailsDialog } from './JobDetailsDialog';

export const CONFORMER_JOB_RESUME_EVENT = 'pp-conformer-job-resume';

// LocalStorage keys for column/view preferences
const JOBS_COLUMNS_STORAGE_KEY = 'pp-editor:jobs-columns:v1';
const JOBS_SHOW_DESCRIPTIONS_KEY = 'pp-editor:jobs-show-descriptions:v1';

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

// Default column visibility
const DEFAULT_VISIBLE_COLUMNS = {
    biln: true,
    date: true,
    state: true,
};

function loadColumnPrefs() {
    try {
        const raw = window?.localStorage?.getItem(JOBS_COLUMNS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_VISIBLE_COLUMNS, ...parsed };
        }
    } catch { /* ignore */ }
    return { ...DEFAULT_VISIBLE_COLUMNS };
}

function saveColumnPrefs(prefs) {
    try {
        window?.localStorage?.setItem(JOBS_COLUMNS_STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
}

function loadShowDescriptions() {
    try {
        const raw = window?.localStorage?.getItem(JOBS_SHOW_DESCRIPTIONS_KEY);
        return raw === 'true' || raw === '1';
    } catch { /* ignore */ }
    return false;
}

function saveShowDescriptions(value) {
    try {
        window?.localStorage?.setItem(JOBS_SHOW_DESCRIPTIONS_KEY, value ? '1' : '0');
    } catch { /* ignore */ }
}

export function ConformerJobsPanel({ dbName = 'pepedit' }) {
    const sessionId = useSessionId();
    const { items, loading, error, refresh, updateItem } = useConformerJobsList(sessionId, { dbName, limit: 50 });

    // Session metadata state - reactive to changes via event
    const [sessionMeta, setSessionMeta] = useState(() => {
        if (!sessionId) return null;
        return getLocalSessionMeta(sessionId);
    });

    // Listen for session meta changes (e.g., when user renames session in Header)
    useEffect(() => {
        // Re-read on sessionId change
        setSessionMeta(sessionId ? getLocalSessionMeta(sessionId) : null);

        const handleMetaChange = (e) => {
            const detail = e?.detail;
            // Only update if it's for our session
            if (detail?.sessionId === sessionId) {
                setSessionMeta({ name: detail?.name ?? null, description: detail?.description ?? null });
            }
        };

        window.addEventListener(SESSION_META_CHANGED_EVENT, handleMetaChange);
        return () => window.removeEventListener(SESSION_META_CHANGED_EVENT, handleMetaChange);
    }, [sessionId]);

    const shortSessionId = useMemo(() => formatSessionIdShort(sessionId), [sessionId]);

    // Column visibility state
    const [visibleColumns, setVisibleColumns] = useState(loadColumnPrefs);
    const [showDescriptions, setShowDescriptions] = useState(loadShowDescriptions);

    // Column menu anchor
    const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);

    // Row menu state
    const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
    const [rowMenuJob, setRowMenuJob] = useState(null);

    // Details dialog state
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [detailsDialogJob, setDetailsDialogJob] = useState(null);
    const [detailsDialogSaving, setDetailsDialogSaving] = useState(false);
    const [detailsDialogError, setDetailsDialogError] = useState(null);

    // Inline saving state (jobId -> true while saving)
    const [savingJobs, setSavingJobs] = useState({});

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Delete state
    const [deletingJobId, setDeletingJobId] = useState(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Cache per-job server details (includes inputs.payload) to drive constraints display.
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

    // Persist column preferences
    useEffect(() => {
        saveColumnPrefs(visibleColumns);
    }, [visibleColumns]);

    useEffect(() => {
        saveShowDescriptions(showDescriptions);
    }, [showDescriptions]);

    const handleColumnToggle = useCallback((col) => {
        setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
    }, []);

    const handleOpenRowMenu = useCallback((event, job) => {
        event.stopPropagation();
        setRowMenuAnchor(event.currentTarget);
        setRowMenuJob(job);
    }, []);

    const handleCloseRowMenu = useCallback(() => {
        setRowMenuAnchor(null);
        setRowMenuJob(null);
    }, []);

    const handleOpenDetailsDialog = useCallback(() => {
        if (rowMenuJob) {
            setDetailsDialogJob(rowMenuJob);
            setDetailsDialogError(null);
            setDetailsDialogOpen(true);
        }
        handleCloseRowMenu();
    }, [rowMenuJob, handleCloseRowMenu]);

    const handleCopyBiln = useCallback(async () => {
        const biln = rowMenuJob?.result_ref?.properties?.BILN || rowMenuJob?.biln || rowMenuJob?.properties?.BILN || '';
        if (biln) {
            try {
                await navigator.clipboard.writeText(biln);
                setSnackbar({ open: true, message: 'BILN copied', severity: 'success' });
            } catch {
                setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
            }
        }
        handleCloseRowMenu();
    }, [rowMenuJob, handleCloseRowMenu]);

    // Delete a single job
    const handleDeleteJob = useCallback(async () => {
        const jobId = rowMenuJob?.job_id || rowMenuJob?.id || '';
        if (!jobId) return;
        handleCloseRowMenu();
        setDeletingJobId(jobId);
        try {
            const res = await deleteConformerJob({
                jobId,
                sessionId: sessionId || undefined,
                dbName,
                baseUrlOverride: API_BASE_URL,
            });
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || `Failed to delete job (${res.status})`);
            }
            setSnackbar({ open: true, message: 'Job deleted', severity: 'success' });
            refresh();
        } catch (e) {
            setSnackbar({ open: true, message: e?.message || 'Failed to delete job', severity: 'error' });
        } finally {
            setDeletingJobId(null);
        }
    }, [rowMenuJob, handleCloseRowMenu, sessionId, dbName, refresh]);

    // Bulk delete all jobs
    const handleBulkDelete = useCallback(async () => {
        setBulkDeleteDialogOpen(false);
        const jobIds = (items || []).map((j) => j?.job_id || j?.id || '').filter(Boolean);
        if (jobIds.length === 0) return;
        setBulkDeleting(true);
        try {
            const res = await bulkDeleteConformerJobs({
                jobIds,
                sessionId: sessionId || undefined,
                dbName,
                baseUrlOverride: API_BASE_URL,
            });
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || `Failed to delete jobs (${res.status})`);
            }
            const json = await res.json().catch(() => null);
            const deleted = json?.data?.deleted || [];
            const notFound = json?.data?.not_found || [];
            const errorCount = Object.keys(json?.data?.errors || {}).length;
            let msg = `${deleted.length} job${deleted.length !== 1 ? 's' : ''} deleted`;
            if (notFound.length) msg += `, ${notFound.length} not found`;
            if (errorCount) msg += `, ${errorCount} error${errorCount !== 1 ? 's' : ''}`;
            setSnackbar({ open: true, message: msg, severity: notFound.length || errorCount ? 'warning' : 'success' });
            refresh();
        } catch (e) {
            setSnackbar({ open: true, message: e?.message || 'Failed to delete jobs', severity: 'error' });
        } finally {
            setBulkDeleting(false);
        }
    }, [items, sessionId, dbName, refresh]);

    // Save job name/description via PATCH
    const saveJobMetadata = useCallback(async (jobId, updates, { showSnackbar = true, isDialog = false } = {}) => {
        if (!jobId) return;

        // Optimistic update
        const oldJob = items?.find((j) => (j.job_id || j.id) === jobId);
        if (updateItem) {
            updateItem(jobId, updates);
        }

        setSavingJobs((prev) => ({ ...prev, [jobId]: true }));
        if (isDialog) setDetailsDialogSaving(true);

        try {
            const res = await patchConformerJob({
                jobId,
                ...updates,
                sessionId: sessionId || undefined,
                dbName,
                baseUrlOverride: API_BASE_URL,
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                const msg = json?.message || json?.error || `Failed to update job (${res.status})`;
                throw new Error(msg);
            }

            const json = await res.json().catch(() => null);
            const data = json?.data && typeof json.data === 'object' ? json.data : null;

            // Update with server response
            if (data && updateItem) {
                updateItem(jobId, { name: data.name, description: data.description });
            }

            if (showSnackbar) {
                setSnackbar({ open: true, message: 'Job updated', severity: 'success' });
            }

            if (isDialog) {
                setDetailsDialogOpen(false);
                setDetailsDialogJob(null);
            }
        } catch (e) {
            // Revert optimistic update
            if (oldJob && updateItem) {
                updateItem(jobId, { name: oldJob.name, description: oldJob.description });
            }

            const errorMsg = e?.message || 'Failed to update job';
            if (isDialog) {
                setDetailsDialogError(errorMsg);
            } else {
                setSnackbar({ open: true, message: errorMsg, severity: 'error' });
            }
        } finally {
            setSavingJobs((prev) => {
                const next = { ...prev };
                delete next[jobId];
                return next;
            });
            if (isDialog) setDetailsDialogSaving(false);
        }
    }, [items, sessionId, dbName, updateItem]);

    const handleInlineNameSave = useCallback((jobId, newName) => {
        saveJobMetadata(jobId, { name: newName }, { showSnackbar: false });
    }, [saveJobMetadata]);

    const handleDialogSave = useCallback((updates) => {
        const jobId = detailsDialogJob?.job_id || detailsDialogJob?.id;
        if (jobId) {
            saveJobMetadata(jobId, updates, { showSnackbar: true, isDialog: true });
        }
    }, [detailsDialogJob, saveJobMetadata]);

    // Dynamic title: "{session name} jobs" or "{short id} jobs" (ID only when no name)
    const title = useMemo(() => {
        if (!sessionId) return 'Conformer jobs';
        const name = sessionMeta?.name;
        if (name) {
            // Session has a name - show name only (no ID)
            const truncatedName = name.length > 24 ? `${name.slice(0, 24)}…` : name;
            return `${truncatedName} jobs`;
        }
        // No name - show short session ID
        return `${shortSessionId} jobs`;
    }, [sessionId, sessionMeta?.name, shortSessionId]);

    // Count visible columns for colspan
    const visibleColCount = 2 + // Name (always) + Resume (always)
        (visibleColumns.biln ? 1 : 0) +
        (visibleColumns.date ? 1 : 0) +
        (visibleColumns.state ? 1 : 0);

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Delete all jobs">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                                disabled={!items || items.length === 0 || bulkDeleting}
                                sx={{ color: 'error.main' }}
                            >
                                <DeleteSweepIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Columns & view">
                        <IconButton
                            size="small"
                            onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                            sx={{ color: 'text.secondary' }}
                        >
                            <ViewColumnIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Button size="small" onClick={refresh} disabled={loading}>
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* Column visibility menu */}
            <Menu
                anchorEl={columnMenuAnchor}
                open={Boolean(columnMenuAnchor)}
                onClose={() => setColumnMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem disabled sx={{ opacity: 1, fontWeight: 600 }}>
                    Columns
                </MenuItem>
                <MenuItem onClick={() => handleColumnToggle('biln')}>
                    <Checkbox checked={visibleColumns.biln} size="small" sx={{ p: 0, mr: 1 }} />
                    <ListItemText primary="BILN" />
                </MenuItem>
                <MenuItem onClick={() => handleColumnToggle('date')}>
                    <Checkbox checked={visibleColumns.date} size="small" sx={{ p: 0, mr: 1 }} />
                    <ListItemText primary="Date" />
                </MenuItem>
                <MenuItem onClick={() => handleColumnToggle('state')}>
                    <Checkbox checked={visibleColumns.state} size="small" sx={{ p: 0, mr: 1 }} />
                    <ListItemText primary="State" />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => setShowDescriptions((v) => !v)}>
                    <Checkbox checked={showDescriptions} size="small" sx={{ p: 0, mr: 1 }} />
                    <ListItemText primary="Show descriptions" />
                </MenuItem>
            </Menu>

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
                                <TableCell sx={{ width: 160, px: 1, py: 0.5 }}>Name</TableCell>
                                {visibleColumns.biln && (
                                    <TableCell sx={{ width: 140, px: 1, py: 0.5 }}>BILN</TableCell>
                                )}
                                {visibleColumns.date && (
                                    <TableCell sx={{ width: 120, px: 1, py: 0.5 }}>Date</TableCell>
                                )}
                                {visibleColumns.state && (
                                    <TableCell sx={{ width: 72, px: 1, py: 0.5 }}>State</TableCell>
                                )}
                                <TableCell
                                    align="right"
                                    sx={{
                                        width: 100,
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
                                const biln = job?.result_ref?.properties?.BILN || job?.biln || job?.properties?.BILN || '';
                                const bilnPreview = formatBilnPreview(biln);
                                const pdb = job?.result_ref?.properties?.PDB || job?.result_ref?.properties?.pdb || '';

                                // Job name/description
                                const jobName = job?.name ?? null;
                                const jobDescription = job?.description ?? null;
                                const isSaving = !!savingJobs[jobId];

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

                                const updatedAt = job?.updated_at || job?.meta?.timestamp || '';
                                const createdAt = job?.created_at || '';
                                const ts = formatIsoTimestamp(updatedAt || createdAt);

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
                                        {/* Name cell (always visible, editable) */}
                                        <TableCell sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                                            <InlineJobNameEditor
                                                name={jobName}
                                                description={jobDescription}
                                                showDescription={showDescriptions}
                                                saving={isSaving}
                                                onSave={(newName) => handleInlineNameSave(jobId, newName)}
                                            />
                                        </TableCell>

                                        {/* BILN cell (optional) */}
                                        {visibleColumns.biln && (
                                            <TableCell sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                                                {bilnPreview ? (
                                                    <Tooltip title={biln} placement="top" arrow>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontSize: 12,
                                                                fontFamily: 'monospace',
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
                                        )}

                                        {/* Date cell (optional) */}
                                        {visibleColumns.date && (
                                            <TableCell sx={{ px: 1, py: 0.5, minWidth: 0 }}>
                                                <Tooltip title={ts || ''} placement="top" arrow>
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
                                                        {ts || '—'}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                        )}

                                        {/* State cell (optional) */}
                                        {visibleColumns.state && (
                                            <TableCell sx={{ px: 1, py: 0.5 }}>
                                                <Chip label={state} size="small" color={stateColor(state)} variant="outlined" />
                                            </TableCell>
                                        )}

                                        {/* Action cell (always visible) */}
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <Button
                                                    size="small"
                                                    onClick={onResume}
                                                    disabled={!jobId || state === 'failed' || isSaving}
                                                >
                                                    Resume
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleOpenRowMenu(e, job)}
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!loading && (!items || items.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={visibleColCount}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                                            No jobs found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}

                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={visibleColCount}>
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

            {/* Row context menu */}
            <Menu
                anchorEl={rowMenuAnchor}
                open={Boolean(rowMenuAnchor)}
                onClose={handleCloseRowMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={handleOpenDetailsDialog}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Edit details" />
                </MenuItem>
                <MenuItem onClick={handleCopyBiln}>
                    <ListItemIcon>
                        <ContentCopyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Copy BILN" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleDeleteJob} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="Delete job" />
                </MenuItem>
            </Menu>

            {/* Edit details dialog */}
            <JobDetailsDialog
                open={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setDetailsDialogJob(null);
                    setDetailsDialogError(null);
                }}
                job={detailsDialogJob}
                onSave={handleDialogSave}
                saving={detailsDialogSaving}
                error={detailsDialogError}
            />

            {/* Bulk delete confirmation dialog */}
            <Dialog
                open={bulkDeleteDialogOpen}
                onClose={() => setBulkDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete all jobs</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete all {(items || []).length} conformer job{(items || []).length !== 1 ? 's' : ''}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleBulkDelete} color="error" variant="contained">Delete all</Button>
                </DialogActions>
            </Dialog>

            {/* Feedback snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2000}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setSnackbar((s) => ({ ...s, open: false }));
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    sx={{ fontSize: 12 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}
