import React, { useState, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton, Menu, MenuItem, Divider, ListItemIcon, ListItemText } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { alpha } from '@mui/material/styles';

export default function ChainContainer({
    seqIdx,
    sequenceSlot,
    constraintsSlot,
    templateSlot,
    showConstraintsRow = true,
    showTemplateRow = true,
    dimReplaceOverlay = false,
    // Layout
    labelColWidth = 180,
    // Header actions (optional – design only for now)
    onSequenceMenu = () => { },
    onSequenceClear = () => { },
    sequenceIsCircular = false,
    onSequenceCircularize = () => { },
    onSequenceUncircularize = () => { },
    onSequenceMirror = () => { },
    disableSequenceActions = false,

    // DSSP / SS actions
    onConstraintsClear = () => { },
    onConstraintsFill = () => { },
    disableConstraintsActions = false,

    // Template actions
    onTemplateConfigure = () => { },
    onTemplateClearScaffold,
    onTemplateMaskAll = () => { },
    onTemplateUnmaskAll = () => { },
    disableTemplateActions = false,

    // Optional; currently not used but passed from parent
    onTemplateHelp = () => { },

    // Chain focus in 3D
    chainIdLabel = null,
    onFocusChain3D,
}) {
    const ROW_HEIGHT = 40;
    const [seqMenuEl, setSeqMenuEl] = useState(null);
    const [constraintsMenuEl, setConstraintsMenuEl] = useState(null);
    const [templateMenuEl, setTemplateMenuEl] = useState(null);

    const closeSeqMenu = () => setSeqMenuEl(null);
    const closeConstraintsMenu = () => setConstraintsMenuEl(null);
    const closeTemplateMenu = () => setTemplateMenuEl(null);

    // Template mapping configuration is edited in the 3D viewer "Template" panel.

    const handleFocusChain3D = useCallback(() => {
        if (!chainIdLabel) return;
        window.dispatchEvent(new CustomEvent('pp-focus-chain', {
            detail: { target: 'main', chainId: chainIdLabel },
        }));
        onFocusChain3D?.();
    }, [chainIdLabel, onFocusChain3D]);

    const handleChainHeaderContextMenu = useCallback((e) => {
        if (!chainIdLabel) return;
        e.preventDefault();
        handleFocusChain3D();
    }, [chainIdLabel, handleFocusChain3D]);

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
        alignItems: 'center',
        columnGap: 1,
    };

    const rowBoxSx = {
        minWidth: 0,
        minHeight: ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        borderStyle: 'dashed',
    };

    return (
        <Box
            sx={{
                // OUTER: this is the per-chain horizontal scrollbar
                width: '100%',
                overflowX: 'auto',
                // Allow hover UI (monomer action buttons) to render fully.
                overflowY: 'visible',
                // keeps scroll nice on trackpads
                WebkitOverflowScrolling: 'touch',
                // Firefox
                scrollbarWidth: 'thin',
                scrollbarColor: (theme) => `${theme.palette.text.secondary}`,

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
                    // border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                {dimReplaceOverlay ? (
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 1,
                            // Backdrop defaults around 0.5; keep this noticeably lighter.
                            bgcolor: (t) => alpha(t.palette.common.black, t.palette.mode === 'dark' ? 0.12 : 0.12),
                            zIndex: 1,
                            pointerEvents: 'none',
                        }}
                    />
                ) : null}

                {/* Chain identity gutter */}
                <Box
                    sx={{
                        width: 28,
                        minWidth: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.04),
                        borderRadius: 'inherit',
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            whiteSpace: 'nowrap',
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            userSelect: 'none',
                        }}
                    >
                        {`Chain ${chainIdLabel ?? ''}`}
                    </Typography>
                </Box>

                {/* Content area */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>

                {/* Row 1: Sequence */}
                <Box sx={rowGridSx}>
                    <Box
                        onContextMenu={handleChainHeaderContextMenu}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, minHeight: ROW_HEIGHT }}
                    >
                        <Tooltip title={chainIdLabel ? 'Right-click to focus in 3D' : ''} arrow placement="left" enterDelay={500}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                Sequence
                            </Typography>
                        </Tooltip>
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
                        </Box>
                    </Box>
                    <Box sx={rowBoxSx}>{sequenceSlot}</Box>
                </Box>

                {/* Row 2: DSSP constraints */}
                {showConstraintsRow && (
                    <Box sx={rowGridSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: ROW_HEIGHT }}>
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
                        <Box sx={rowBoxSx}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: ROW_HEIGHT }}>

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

                        <Box sx={{ ...rowBoxSx, px: 0.75 }}>
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
                    MenuListProps={{ 'aria-label': 'sequence actions menu' }}
                >
                    {chainIdLabel && (
                        <MenuItem
                            onClick={() => {
                                handleFocusChain3D();
                                closeSeqMenu();
                            }}
                        >
                            <ListItemIcon>
                                <CenterFocusStrongIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Focus in 3D</ListItemText>
                        </MenuItem>
                    )}
                    {chainIdLabel && <Divider />}
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
                        MenuListProps={{ 'aria-label': 'template actions menu' }}
                    >
                        <MenuItem
                            onClick={() => {
                                onTemplateConfigure?.();
                                closeTemplateMenu();
                            }}
                        >
                            Configure
                        </MenuItem>
                        {typeof onTemplateClearScaffold === 'function' && (
                            <MenuItem
                                onClick={() => {
                                    onTemplateClearScaffold?.();
                                    closeTemplateMenu();
                                }}
                            >
                                Remove scaffold
                            </MenuItem>
                        )}
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

                </Box>{/* end content area */}
            </Box>
        </Box>
    );
}