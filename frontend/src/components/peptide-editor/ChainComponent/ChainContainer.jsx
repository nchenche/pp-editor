import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton, Menu, MenuItem, Divider } from '@mui/material';
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
    labelColWidth = 180,
    gapY = 0.1,
    // Header actions (optional – design only for now)
    onSequenceMenu = () => { },
    onSequenceClear = () => { },
    sequenceIsCircular = false,
    onSequenceCircularize = () => { },
    onSequenceUncircularize = () => { },
    onSequenceMirror = () => { },
    onSequenceHelp = () => { },
    onConstraintsFill = () => { }, // (letter: 'H' | 'E' | '-') -> parent fills cells
    onConstraintsClear = () => { },
    onConstraintsHelp = () => { },
    onTemplateMaskAll = () => { },
    onTemplateUnmaskAll = () => { },
    onTemplateConfigure = () => { },
    onTemplateHelp = () => { },

    // optional disables (useful for empty placeholder row)
    disableSequenceActions = false,
    disableConstraintsActions = false,
    disableTemplateActions = false,
}) {
    const [seqMenuEl, setSeqMenuEl] = useState(null);
    const [constraintsMenuEl, setConstraintsMenuEl] = useState(null);
    const [templateMenuEl, setTemplateMenuEl] = useState(null);

    const closeSeqMenu = () => setSeqMenuEl(null);
    const closeConstraintsMenu = () => setConstraintsMenuEl(null);
    const closeTemplateMenu = () => setTemplateMenuEl(null);

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
                            <Tooltip title="Actions" arrow>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            onSequenceMenu?.();
                                            setSeqMenuEl(e.currentTarget);
                                        }}
                                        sx={iconBtnSx}
                                        aria-label="sequence actions"
                                        disabled={disableSequenceActions}
                                    >
                                        <MoreVertIcon fontSize="inherit" />
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
                                <Tooltip title="Actions" arrow>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setConstraintsMenuEl(e.currentTarget)}
                                            sx={iconBtnSx}
                                            aria-label="secondary structure actions"
                                            disabled={disableConstraintsActions}
                                        >
                                            <MoreVertIcon fontSize="inherit" />
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

                            <Box sx={iconRowSx}>
                                <Tooltip title="Actions" arrow>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setTemplateMenuEl(e.currentTarget)}
                                            sx={iconBtnSx}
                                            aria-label="template actions"
                                            disabled={disableTemplateActions}
                                        >
                                            <MoreVertIcon fontSize="inherit" />
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
                        <MenuItem
                            onClick={() => {
                                onConstraintsClear?.();
                                closeConstraintsMenu();
                            }}
                        >
                            Clear
                        </MenuItem>
                        <Divider />
                        <MenuItem
                            onClick={() => {
                                onConstraintsFill?.('H');
                                closeConstraintsMenu();
                            }}
                        >
                            All alpha (H)
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                onConstraintsFill?.('E');
                                closeConstraintsMenu();
                            }}
                        >
                            All beta (E)
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                onConstraintsFill?.('-');
                                closeConstraintsMenu();
                            }}
                        >
                            All random (-)
                        </MenuItem>
                    </Menu>
                )}

                <Menu
                    anchorEl={seqMenuEl}
                    open={Boolean(seqMenuEl)}
                    onClose={closeSeqMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    MenuListProps={{ dense: true, 'aria-label': 'sequence actions menu' }}
                >
                    <MenuItem
                        onClick={() => {
                            onSequenceClear?.();
                            closeSeqMenu();
                        }}
                    >
                        Clear
                    </MenuItem>
                    <Divider />
                    {sequenceIsCircular ? (
                        <MenuItem
                            onClick={() => {
                                onSequenceUncircularize?.();
                                closeSeqMenu();
                            }}
                        >
                            Uncyclize (head-to-tail)
                        </MenuItem>
                    ) : (
                        <MenuItem
                            onClick={() => {
                                onSequenceCircularize?.();
                                closeSeqMenu();
                            }}
                        >
                            Cyclize (head-to-tail)
                        </MenuItem>
                    )}
                    <MenuItem
                        onClick={() => {
                            onSequenceMirror?.();
                            closeSeqMenu();
                        }}
                    >
                        Mirror (natural amino acids only)
                    </MenuItem>
                </Menu>

                {showTemplateRow && (
                    <Menu
                        anchorEl={templateMenuEl}
                        open={Boolean(templateMenuEl)}
                        onClose={closeTemplateMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        MenuListProps={{ dense: true, 'aria-label': 'template actions menu' }}
                    >
                        <MenuItem
                            onClick={() => {
                                onTemplateConfigure?.();
                                closeTemplateMenu();
                            }}
                        >
                            Configure
                        </MenuItem>
                        <Divider />
                        <MenuItem
                            onClick={() => {
                                onTemplateMaskAll?.();
                                closeTemplateMenu();
                            }}
                        >
                            Mask all
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                onTemplateUnmaskAll?.();
                                closeTemplateMenu();
                            }}
                        >
                            Unmask all
                        </MenuItem>
                    </Menu>
                )}

            </Box>
        </Box>
    );
}