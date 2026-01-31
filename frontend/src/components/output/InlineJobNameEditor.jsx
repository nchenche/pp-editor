import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, TextField, Tooltip, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const MAX_NAME_LENGTH = 200;

/**
 * Inline editable job name cell.
 * Click to edit, Enter to save, Esc to cancel.
 */
export function InlineJobNameEditor({
    name,
    description,
    showDescription = false,
    onSave,
    saving = false,
    disabled = false,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    const displayName = name || 'Untitled job';
    const isUntitled = !name;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const startEditing = useCallback(() => {
        if (disabled || saving) return;
        setEditValue(name || '');
        setIsEditing(true);
    }, [disabled, saving, name]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(() => {
        const trimmed = editValue.trim();
        // Normalize empty to null
        const newName = trimmed || null;
        // Only save if changed
        if (newName !== (name || null)) {
            onSave?.(newName);
        }
        setIsEditing(false);
    }, [editValue, name, onSave]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditing();
        }
    }, [saveEdit, cancelEditing]);

    const handleBlur = useCallback(() => {
        // Save on blur (common UX pattern)
        saveEdit();
    }, [saveEdit]);

    if (isEditing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <TextField
                    inputRef={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.slice(0, MAX_NAME_LENGTH))}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Untitled job"
                    size="small"
                    variant="standard"
                    fullWidth
                    disabled={saving}
                    sx={{
                        '& .MuiInputBase-input': {
                            fontSize: 13,
                            py: 0.25,
                        },
                    }}
                    slotProps={{
                        input: {
                            sx: { fontSize: 13 },
                        },
                    }}
                />
                {saving && <CircularProgress size={12} />}
            </Box>
        );
    }

    return (
        <Box
            onClick={startEditing}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                minWidth: 0,
                cursor: disabled ? 'default' : 'text',
                '&:hover .edit-icon': {
                    opacity: disabled ? 0 : 0.6,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Tooltip title={name || ''} placement="top" arrow disableHoverListener={!name || name.length < 20}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: 13,
                            fontWeight: isUntitled ? 400 : 500,
                            color: isUntitled ? 'text.secondary' : 'text.primary',
                            fontStyle: isUntitled ? 'italic' : 'normal',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {displayName}
                    </Typography>
                </Tooltip>
                {saving ? (
                    <CircularProgress size={12} />
                ) : (
                    <EditIcon
                        className="edit-icon"
                        sx={{
                            fontSize: 12,
                            color: 'text.secondary',
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            flexShrink: 0,
                        }}
                    />
                )}
            </Box>

            {/* Optional description line */}
            {showDescription && description && (
                <Tooltip title={description} placement="top" arrow>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                        }}
                    >
                        {description}
                    </Typography>
                </Tooltip>
            )}
        </Box>
    );
}
