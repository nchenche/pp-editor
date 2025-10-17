import React from 'react';
import { Box, Paper, Typography, Tooltip, IconButton } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { SequenceEditorPanel } from './SequenceInput';

export default function BilnEditorInterface({
    biln,
    onChangeBiln,
    hoveredResidueIdx,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClear,
    children,
}) {
    const iconBtnSx = {
        border: 1,
        borderColor: 'divider',
        '& .MuiSvgIcon-root': { fontSize: 16 },
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                // Cap the total editor area height; below content will fill remaining
                maxHeight: { xs: '42vh', md: '36vh' },
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 'bold' }}>BILN editor interface</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Undo" arrow placement="top"><span>
                        <IconButton size="small" color="inherit" onClick={onUndo} disabled={!canUndo} sx={iconBtnSx}><UndoIcon fontSize="inherit" /></IconButton>
                    </span></Tooltip>
                    <Tooltip title="Redo" arrow placement="top"><span>
                        <IconButton size="small" color="inherit" onClick={onRedo} disabled={!canRedo} sx={iconBtnSx}><RedoIcon fontSize="inherit" /></IconButton>
                    </span></Tooltip>
                    <Tooltip title="Clear sequence" arrow placement="top"><span>
                        <IconButton size="small" color="inherit" onClick={onClear} disabled={!biln} sx={iconBtnSx}><DeleteSweepIcon fontSize="inherit" /></IconButton>
                    </span></Tooltip>
                </Box>
            </Box>

            {/* BILN input */}
            <Box sx={{ mt: 1 }}>
                <SequenceEditorPanel biln={biln} onChangeBiln={onChangeBiln} hoveredResidueIdx={hoveredResidueIdx} />
            </Box>

            {/* Sequences slot: takes remaining space; minHeight:0 allows scrolling */}
            <Box sx={{ mt: 1, flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                {children}
            </Box>
        </Paper>
    );
}