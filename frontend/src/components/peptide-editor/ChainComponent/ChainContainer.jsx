import React, { useRef, useState } from 'react';
import { Box, Typography, Tooltip, IconButton, Button, TextField, Chip, Menu, MenuItem } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export default function ChainContainer({
    seqIdx,
    sequenceSlot,
    constraintsSlot,
    templateSlot,
    showConstraintsRow = true,
    showTemplateRow = true,
    // Layout
    labelColWidth = 200,
    gapY = 0.1,
    // Header actions (optional – design only for now)
    onSequenceMenu = () => { },
    onSequenceClear = () => { },
    onSequenceHelp = () => { },
    onConstraintsMenu = () => { },
    onConstraintsFill = () => { }, // (letter: 'H' | 'E' | '-') -> parent fills cells
    onConstraintsClear = () => { },
    onConstraintsHelp = () => { },
    onTemplateHelp = () => { },
}) {
    const fileInputRef = useRef(null);
    const [templateName, setTemplateName] = useState('');
    const [constraintsMenuEl, setConstraintsMenuEl] = useState(null);

    const openPicker = () => fileInputRef.current?.click();
    const onPickFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTemplateName(file.name);
        e.target.value = '';
    };

    const handleTemplateClear = () => {
        if (onTemplateClear) onTemplateClear();
        setTemplateName('');
    };

    const openConstraintsMenu = (e) => {
        onConstraintsMenu?.();
        setConstraintsMenuEl(e.currentTarget);
    };
    const closeConstraintsMenu = () => setConstraintsMenuEl(null);
    const applyPreset = (letter) => {
        onConstraintsFill?.(letter);
        closeConstraintsMenu();
    };

    // Template mapping configuration is edited in the 3D viewer "Template" panel.


    const iconRowSx = {
        display: 'flex',
        alignItems: 'center',
        // add a tiny left margin to every sibling after the first (Tooltips are direct children)
        '& > *:not(:first-of-type)': { ml: 0. }, // ~2px
    };
    const iconBtnSx = {
        color: 'text.secondary',
        p: 0.15,              // tighter than size="small" default
        borderRadius: 0.75,   // a bit crisper
    };
    const rowGridSx = {
        display: 'grid',
        gridTemplateColumns: `${labelColWidth}px 1fr`, // was: 1fr
        alignItems: 'start',
        columnGap: 1,
    };

    return (
        <Box
            sx={{
                // OUTER: this is the per-chain horizontal scrollbar
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden',
                // keeps scroll nice on trackpads
                WebkitOverflowScrolling: 'touch',
                // Firefox
                scrollbarWidth: 'thin',
                scrollbarColor: (theme) =>
                    `${theme.palette.text.secondary}`,

                // WebKit (Chrome/Edge/Safari)
                '&::-webkit-scrollbar': {
                    height: 8, // thinner horizontal bar (try 6–10)
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                    borderRadius: 999,
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: 999,
                    // makes thumb look slimmer by adding "padding" around it
                    border: '2px solid transparent',
                    backgroundClip: 'content-box',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: 'rgba(0,0,0,0.35)',
                },
                '&::-webkit-scrollbar-corner': {
                    background: 'transparent',
                },
            }}
        >
            <Box
                sx={{
                    // INNER: content expands to fit all monomers
                    width: 'max-content',
                    minWidth: '100%', // still fills available width when short
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                }}
            >
                {/* Row 1: Sequence */}
                <Box sx={rowGridSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, minHeight: 34 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            Sequence
                        </Typography>
                        <Box sx={iconRowSx}>
                            {/* <Tooltip title="Menu" arrow>
                                <span>
                                    <IconButton size="small" onClick={onSequenceMenu} sx={iconBtnSx}>
                                        <MoreVertIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip> */}
                            <Tooltip title="Clear" arrow>
                                <span>
                                    <IconButton size="small" onClick={onSequenceClear} sx={iconBtnSx}>
                                        <DeleteOutlineIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            {/* <Tooltip title="Help" arrow>
                                <span>
                                    <IconButton size="small" onClick={onSequenceHelp} sx={iconBtnSx}>
                                        <HelpOutlineIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip> */}
                        </Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>{sequenceSlot}</Box>
                </Box>

                {/* Row 2: DSSP constraints */}
                {showConstraintsRow && (
                    <Box sx={rowGridSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                Secondary Structure
                            </Typography>
                            <Box sx={iconRowSx}>
                                <Tooltip title="Menu" arrow>
                                    <span>
                                        <IconButton size="small" onClick={openConstraintsMenu} sx={iconBtnSx}>
                                            <MoreVertIcon fontSize="inherit" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Clear" arrow>
                                    <span>
                                        <IconButton size="small" onClick={onConstraintsClear} sx={iconBtnSx}>
                                            <DeleteOutlineIcon fontSize="inherit" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            {constraintsSlot ?? (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No residues yet.
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}


                {/* Row 3: 3D template */}
                {showTemplateRow && (
                    <Box sx={rowGridSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>

                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                3D Template
                            </Typography>

                            <Box sx={iconRowSx} />

                        </Box>

                        <Box sx={{ minWidth: 0, minHeight: 34, display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 0.5, px: 1 }}>
                            {templateSlot ?? (
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No template configuration yet.
                                </Typography>
                            )}
                        </Box>
                    </Box>
                )}



                {/* DSSP menu */}
                {showConstraintsRow && (
                    <Menu
                        anchorEl={constraintsMenuEl}
                        open={Boolean(constraintsMenuEl)}
                        onClose={closeConstraintsMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        MenuListProps={{ dense: true }}
                    >
                        <MenuItem onClick={() => applyPreset('H')}>All alpha (H)</MenuItem>
                        <MenuItem onClick={() => applyPreset('E')}>All beta (E)</MenuItem>
                        <MenuItem onClick={() => applyPreset('-')}>All random (-)</MenuItem>
                    </Menu>
                )}

            </Box>
        </Box>
    );
}