import React, { useMemo } from 'react';

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

import { useOwnerId } from '../../hooks/useOwnerId';
import { useConformerJobsList } from '../../hooks/useConformerJobsList';
import { setConformerJobIdInStorage } from '../../utils/conformerJobStorage';

export const CONFORMER_JOB_RESUME_EVENT = 'pp-conformer-job-resume';

const JOB_ID_PREFIX_LEN = 4;

function formatJobId(jobId) {
    const id = String(jobId || '');
    if (!id) return '(unknown id)';
    if (id.length <= JOB_ID_PREFIX_LEN) return id;
    return `${id.slice(0, JOB_ID_PREFIX_LEN)}…`;
}

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

export function ConformerJobsPanel({ dbName = 'pepedit' }) {
    const ownerId = useOwnerId();
    const { items, loading, error, refresh } = useConformerJobsList(ownerId, { dbName, limit: 50 });

    const title = useMemo(() => (ownerId ? 'My conformer jobs' : 'Anonymous conformer jobs'), [ownerId]);

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
                <TableContainer sx={{ height: '100%', overflowX: 'hidden' }}>
                    <Table
                        size="small"
                        stickyHeader
                        aria-label="conformer jobs"
                        sx={{ tableLayout: 'fixed' }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 78, px: 1, py: 0.5 }}>State</TableCell>
                                <TableCell sx={{ width: 62, px: 1, py: 0.5, fontFamily: 'monospace' }}>Job</TableCell>
                                <TableCell sx={{ width: 210, px: 1, py: 0.5 }}>BILN</TableCell>
                                <TableCell sx={{ width: 180, px: 1, py: 0.5 }}>Status / Time</TableCell>
                                <TableCell align="right" sx={{ width: 72, px: 1, py: 0.5 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {(items || []).map((job) => {
                                const jobId = job?.job_id || job?.id || '';
                                const state = formatState(job?.state);
                                const progressMsg = job?.progress?.message || job?.progress_message || '';
                                const biln = job?.result_ref?.properties?.BILN || job?.biln || job?.properties?.BILN || '';
                                const bilnPreview = formatBilnPreview(biln);
                                const pdb = job?.result_ref?.properties?.PDB || job?.result_ref?.properties?.pdb || '';

                                const updatedAt = job?.updated_at || job?.meta?.timestamp || '';
                                const createdAt = job?.created_at || '';
                                const ts = formatIsoTimestamp(updatedAt || createdAt);

                                const progressText = progressMsg ? String(progressMsg) : '';
                                const hideDone = progressText.trim().toLowerCase() === 'done';
                                const statusOrTime = (!hideDone && progressText) ? progressText : (ts || '');

                                const onResume = () => {
                                    if (!jobId) return;
                                    setConformerJobIdInStorage(jobId, { dbName, ownerId });
                                    window.dispatchEvent(new CustomEvent(CONFORMER_JOB_RESUME_EVENT, { detail: { jobId, biln: biln || '', pdb: pdb || '' } }));
                                };

                                return (
                                    <TableRow key={jobId || Math.random()} hover>
                                        <TableCell sx={{ px: 1, py: 0.5 }}>
                                            <Chip label={state} size="small" color={stateColor(state)} variant="outlined" />
                                        </TableCell>

                                        <TableCell sx={{ px: 1, py: 0.5, fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                                            <Tooltip title={jobId || ''} placement="top" arrow>
                                                <span>{formatJobId(jobId)}</span>
                                            </Tooltip>
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

                                        <TableCell align="right" sx={{ px: 1, py: 0.5 }}>
                                            <Button size="small" onClick={onResume} disabled={!jobId}>
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
