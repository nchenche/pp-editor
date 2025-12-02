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
    templateMenuDisabled = false,
    // Layout
    labelColWidth = 180,
    gapY = 0.1,
    // Header actions (optional – design only for now)
    onSequenceMenu = () => { },
    onSequenceClear = () => { },
    onSequenceHelp = () => { },
    onConstraintsMenu = () => { },
    onConstraintsFill = () => { }, // (letter: 'H' | 'E' | '-') -> parent fills cells
    onConstraintsClear = () => { },
    onConstraintsHelp = () => { },
    onTemplateMenu = () => { },
    onTemplateClear = () => { },
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

    const [templateMenuEl, setTemplateMenuEl] = useState(null);
    const openTemplateMenu = (e) => setTemplateMenuEl(e.currentTarget);
    const closeTemplateMenu = () => setTemplateMenuEl(null);
    const handleTemplateAction = (cb) => {
        closeTemplateMenu();
        cb?.();
    };


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

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
                mb: 1,
                display: 'grid',
                gridAutoRows: 'auto',
                rowGap: gapY,
                bgcolor: 'background.paper',
            }}
        >
            {/* Row 1: Sequence */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `${labelColWidth}px 1fr`,
                    alignItems: 'start',
                    columnGap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, minHeight: 34 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                        Sequence
                    </Typography>
                    <Box sx={iconRowSx}>
                        <Tooltip title="Menu" arrow>
                            <span>
                                <IconButton size="small" onClick={onSequenceMenu} sx={iconBtnSx}>
                                    <MoreVertIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Clear" arrow>
                            <span>
                                <IconButton size="small" onClick={onSequenceClear} sx={iconBtnSx}>
                                    <DeleteOutlineIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Help" arrow>
                            <span>
                                <IconButton size="small" onClick={onSequenceHelp} sx={iconBtnSx}>
                                    <HelpOutlineIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
                <Box sx={{ minWidth: 0 }}>{sequenceSlot}</Box>
            </Box>

            {/* Row 2: DSSP constraints */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `${labelColWidth}px 1fr`,
                    alignItems: 'start',
                    columnGap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                        DSSP constraints
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
                        <Tooltip title="Help" arrow>
                            <span>
                                <IconButton size="small" onClick={onConstraintsHelp} sx={iconBtnSx}>
                                    <HelpOutlineIcon fontSize="inherit" />
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


            {/* Row 3: 3D template */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `${labelColWidth}px 1fr`,
                    alignItems: 'start',
                    columnGap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>

                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                        3D template
                    </Typography>

                    <Box sx={iconRowSx}>
                        <Tooltip title="Menu" arrow>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={openTemplateMenu}
                                    sx={iconBtnSx}
                                    disabled={templateMenuDisabled}
                                >
                                    <MoreVertIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Clear" arrow>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => handleTemplateAction(onTemplateClear)}
                                    sx={iconBtnSx}
                                    disabled={templateMenuDisabled}
                                >
                                    <DeleteOutlineIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Help" arrow>
                            <span>
                                <IconButton size="small" onClick={onTemplateHelp} sx={iconBtnSx}>
                                    <HelpOutlineIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>

                </Box>

                <Box sx={{ minWidth: 0, minHeight: 34, display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 0.5, px: 1 }}>
                    {templateSlot ?? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            No template configuration yet.
                        </Typography>
                    )}
                </Box>
            </Box>



            {/* DSSP menu */}
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

            {/* 3D template menu */}
            <Menu
                anchorEl={templateMenuEl}
                open={Boolean(templateMenuEl)}
                onClose={closeTemplateMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                MenuListProps={{ dense: true }}
            >
                <MenuItem onClick={() => handleTemplateAction(onTemplateMenu)} disabled={templateMenuDisabled}>
                    Configure 3D template…
                </MenuItem>
                <MenuItem onClick={() => handleTemplateAction(onTemplateClear)} disabled={templateMenuDisabled}>
                    Clear mapping
                </MenuItem>
            </Menu>


        </Box>
    );
}