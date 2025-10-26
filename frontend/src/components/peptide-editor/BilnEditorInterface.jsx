// ...existing imports...
import React, { useState } from 'react';
import {
    Box, Paper, Typography, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, ButtonGroup
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { SequenceEditorPanel } from './SequenceInput';
import ChainsToolbar from './ChainComponent/ChainsToolbar';
import { ChainSlots } from './ChainComponent/ChainSlots';

// ...existing code...
export default function BilnEditorInterface({
    biln,
    onChangeBiln,
    hoveredResidueIdx,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClear,
    // Chains section props
    rowMonomerLists,
    activeSeqIdx,
    onSetActiveSeqIdx,
    linkMap,
    hoveredMonomer,
    handleDeleteMonomerItem,
    onDragStart,
    onDragEnd,
    handleMonomerEnter,
    handleMonomerLeave,
    handleDeleteSequence,
    constraintsMode = false,
    onToggleConstraintsMode = () => { },
    constraintsBySeq = [],
    onEditConstraint = () => { },
    // Sequence toolbar (link/cut + disable logic)
    linkMode = false,
    bondsMode = false,
    onToggleLinkMode = () => { },
    onToggleCutMode = () => { },
    canLink = true,
    canUnlink = true,
}) {
    const [bilnHelpOpen, setBilnHelpOpen] = useState(false);
    const [seqHelpOpen, setSeqHelpOpen] = useState(false);

    const btnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        px: 1,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: { xs: '42vh', md: '36vh' },
                overflow: 'hidden',
                gap: 0.5, // tighter, consistent spacing
            }}
        >
            {/* Header: title (left) + neutral toolbar (right) */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle4" sx={{ fontWeight: 600, color: 'text.primary', letterSpacing: '0.5px' }}>
                    BILN EDITOR INTERFACE
                </Typography>
            </Box>

            {/* Manual edit subtitle + help icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 0.5, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Manual edit</Typography>
                    <Tooltip title="BILN format help" arrow>
                        <IconButton size="small" onClick={() => setBilnHelpOpen(true)} sx={{ color: 'text.secondary' }}>
                            <HelpOutlineIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>


                {/* Right-side toolbar: Undo / Redo / Clear (neutral, outlined) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <ButtonGroup size="small" variant="outlined">
                        <Tooltip title="Undo" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    startIcon={<UndoIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Undo
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Redo" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onRedo}
                                    disabled={!canRedo}
                                    startIcon={<RedoIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Redo
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Clear sequence" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onClear}
                                    disabled={!biln}
                                    startIcon={<DeleteSweepIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Clear
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>
                </Box>
            </Box>

            {/* BILN input */}
            <Box>
                <SequenceEditorPanel
                    biln={biln}
                    onChangeBiln={onChangeBiln}
                    hoveredResidueIdx={hoveredResidueIdx}
                />
            </Box>

            {/* Chains section */}
            <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            Chains
                        </Typography>
                        <Tooltip title="Sequences help" arrow>
                            <IconButton size="small" onClick={() => setSeqHelpOpen(true)} sx={{ color: 'text.secondary' }}>
                                <HelpOutlineIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <ChainsToolbar
                        linkMode={linkMode}
                        bondsMode={bondsMode}
                        onToggleLinkMode={onToggleLinkMode}
                        onToggleCutMode={onToggleCutMode}
                        canLink={canLink}
                        canUnlink={canUnlink}
                        constraintsMode={constraintsMode}
                        onToggleConstraintsMode={onToggleConstraintsMode}
                    />
                </Box>
                <Box sx={{ height: '100%', minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                    <ChainSlots
                        rowMonomerLists={rowMonomerLists}
                        activeSeqIdx={activeSeqIdx}
                        onSetActiveSeqIdx={onSetActiveSeqIdx}
                        linkMap={linkMap}
                        hoveredMonomer={hoveredMonomer}
                        handleDeleteMonomerItem={handleDeleteMonomerItem}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        handleMonomerEnter={handleMonomerEnter}
                        handleMonomerLeave={handleMonomerLeave}
                        handleDeleteSequence={handleDeleteSequence}
                        constraintsMode={constraintsMode}
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={onEditConstraint}
                    />
                </Box>
            </Box>


            {/* BILN help dialog with examples */}
            <Dialog open={bilnHelpOpen} onClose={() => setBilnHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>BILN format basics</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <p>Use BILN to describe peptide sequences with simple tokens:</p>
                    <ul>
                        <li>Residues are separated by hyphens “-”. Example: A-G-S</li>
                        <li>Multiple sequences are separated by dots “.”. Example: A-G.S-S</li>
                        <li>Residue codes use library symbols (e.g., A, R, Lys, Pra).</li>
                        <li>Optional annotations may appear in parentheses for advanced linking.</li>
                    </ul>
                    <p style={{ marginTop: 8, marginBottom: 4 }}>Examples</p>
                    <pre style={{ margin: 0, padding: '8px 10px', background: 'transparent', border: '1px solid var(--mui-palette-divider)', borderRadius: 6, overflowX: 'auto' }}>
                        A-F-R-I-C-A
                        A-G-S.Phe-Ser
                        Lys-Pra(links)
                    </pre>
                    <p style={{ marginTop: 8 }}>
                        You can freely type here, or use the library and sequence track to update the BILN automatically.
                    </p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBilnHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>

            {/* Sequences help dialog */}
            <Dialog open={seqHelpOpen} onClose={() => setSeqHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Working with sequences</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <ul>
                        <li>Append adds monomers at the end; Prepend at the start; New creates a new chain.</li>
                        <li>Use Link to connect residues and Cut to break bonds in the 2D sketch.</li>
                        <li>Choose the active sequence to receive new monomers from the library.</li>
                        <li>Per-residue DSSP letters can guide 3D generation (H/E/C…).</li>
                        <li>Optionally provide a 3D template from a PDB/mmCIF file.</li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSeqHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>

        </Paper>
    );
}