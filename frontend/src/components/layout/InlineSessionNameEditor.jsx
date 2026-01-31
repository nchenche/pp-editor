import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, TextField, Tooltip, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const MAX_NAME_LENGTH = 200;

/**
 * Inline editable session name for the header.
 * Click to edit (if editable), Enter to save, Esc to cancel.
 */
export function InlineSessionNameEditor({
    name,
    onSave,
    saving = false,
    editable = true,
    sx = {},
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    const displayName = name || 'Untitled session';
    const isUntitled = !name;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const startEditing = useCallback(() => {
        if (!editable || saving) return;
        setEditValue(name || '');
        setIsEditing(true);
    }, [editable, saving, name]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(() => {
        const trimmed = editValue.trim();
        const newName = trimmed || null;
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
        saveEdit();
    }, [saveEdit]);

    if (isEditing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
                <TextField
                    inputRef={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.slice(0, MAX_NAME_LENGTH))}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Untitled session"
                    size="small"
                    variant="standard"
                    disabled={saving}
                    sx={{
                        minWidth: 120,
                        '& .MuiInputBase-input': {
                            fontSize: 12,
                            py: 0,
                            color: 'common.white',
                        },
                        '& .MuiInput-underline:before': {
                            borderBottomColor: 'rgba(148, 163, 184, 0.5)',
                        },
                        '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                            borderBottomColor: 'rgba(148, 163, 184, 0.8)',
                        },
                        '& .MuiInput-underline:after': {
                            borderBottomColor: 'primary.light',
                        },
                    }}
                    slotProps={{
                        input: {
                            sx: { fontSize: 12, color: 'common.white' },
                        },
                    }}
                />
                {saving && <CircularProgress size={10} sx={{ color: 'common.white' }} />}
            </Box>
        );
    }

    return (
        <Box
            onClick={editable ? startEditing : undefined}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: editable ? 'text' : 'default',
                '&:hover .edit-icon': {
                    opacity: editable ? 0.8 : 0,
                },
                ...sx,
            }}
        >
            <Tooltip
                title={editable ? 'Click to rename session' : (name || 'Read-only session')}
                placement="bottom"
                arrow
            >
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: 12,
                        color: isUntitled ? 'rgba(226, 232, 240, 0.6)' : 'rgba(226, 232, 240, 0.9)',
                        fontStyle: isUntitled ? 'italic' : 'normal',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 150,
                    }}
                >
                    {displayName}
                </Typography>
            </Tooltip>
            {saving ? (
                <CircularProgress size={10} sx={{ color: 'common.white' }} />
            ) : editable ? (
                <EditIcon
                    className="edit-icon"
                    sx={{
                        fontSize: 10,
                        color: 'rgba(226, 232, 240, 0.6)',
                        opacity: 0,
                        transition: 'opacity 0.15s',
                        flexShrink: 0,
                    }}
                />
            ) : null}
        </Box>
    );
}
