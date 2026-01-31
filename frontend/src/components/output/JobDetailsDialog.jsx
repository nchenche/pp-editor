import React, { useState, useEffect, useCallback } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * Dialog for editing job name and description.
 */
export function JobDetailsDialog({
    open,
    onClose,
    job,
    onSave,
    saving = false,
    error = null,
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Sync local state when job changes or dialog opens
    useEffect(() => {
        if (open && job) {
            setName(job.name ?? '');
            setDescription(job.description ?? '');
        }
    }, [open, job]);

    const handleSave = useCallback(() => {
        // Normalize empty strings to null
        const normalizedName = name.trim() || null;
        const normalizedDescription = description.trim() || null;
        onSave?.({ name: normalizedName, description: normalizedDescription });
    }, [name, description, onSave]);

    const handleClear = useCallback(() => {
        setName('');
        setDescription('');
    }, []);

    const jobId = job?.job_id || job?.id || '';
    const createdAt = job?.created_at || '';
    const updatedAt = job?.updated_at || '';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Job Details</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                        placeholder="Untitled job"
                        fullWidth
                        size="small"
                        disabled={saving}
                        helperText={`${name.length}/${MAX_NAME_LENGTH}`}
                        slotProps={{
                            formHelperText: {
                                sx: { textAlign: 'right', mr: 0 },
                            },
                        }}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                        placeholder="Add notes about this job…"
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={8}
                        size="small"
                        disabled={saving}
                        helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
                        slotProps={{
                            formHelperText: {
                                sx: { textAlign: 'right', mr: 0 },
                            },
                        }}
                    />

                    {error && (
                        <Typography variant="body2" color="error">
                            {String(error)}
                        </Typography>
                    )}

                    {/* Job metadata (read-only) */}
                    <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" component="div">
                            Job ID: {jobId || '—'}
                        </Typography>
                        {createdAt && (
                            <Typography variant="caption" color="text.secondary" component="div">
                                Created: {new Date(createdAt).toLocaleString()}
                            </Typography>
                        )}
                        {updatedAt && (
                            <Typography variant="caption" color="text.secondary" component="div">
                                Updated: {new Date(updatedAt).toLocaleString()}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    size="small"
                    onClick={handleClear}
                    disabled={saving || (!name && !description)}
                    sx={{ mr: 'auto', color: 'text.secondary' }}
                >
                    Clear fields
                </Button>
                <Button size="small" onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} /> : null}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
