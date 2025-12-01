// ...existing imports...
import React, { useState } from 'react';
import {
    Box, Paper, Typography, Tooltip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, ButtonGroup, TextField, RadioGroup, FormControlLabel, Radio,
    FormControl, FormLabel
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadIcon from '@mui/icons-material/Upload';


import { parseFastaToBiln, convertHelmToBiln } from '../../utils/bilnUtils';
import { API_URL } from '../../config';

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

    // Upload sequence dialog state
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState('fasta'); // 'fasta' | 'helm'
    const [uploadText, setUploadText] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);

    const btnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        px: 1,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    const handleOpenUpload = () => {
        setUploadOpen(true);
        setUploadMode('fasta');
        setUploadText('');
        setUploadError('');
    };

    const handleCloseUpload = () => {
        if (uploadLoading) return;
        setUploadOpen(false);
        setUploadText('');
        setUploadError('');
    };

    const handleConfirmUpload = async () => {
        console.log('Uploading sequence:', uploadMode, uploadText);
        const text = uploadText.trim();
        if (!text) {
            setUploadError('Please enter a sequence.');
            return;
        }

        setUploadError('');
        setUploadLoading(true);

        try {
            let newBiln = '';

            if (uploadMode === 'fasta') {
                // Front-side validation and conversion
                newBiln = parseFastaToBiln(text);
            } else {
                // HELM -> BILN via backend
                newBiln = await convertHelmToBiln(text);
            }

            onChangeBiln(newBiln);
            setUploadOpen(false);
            setUploadText('');
        } catch (e) {
            setUploadError(e.message || 'Failed to process the sequence.');
        } finally {
            setUploadLoading(false);
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                // maxHeight: { xs: '42vh', md: '36vh' },
                height: '100%',
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
                        <Tooltip title="Load example BILN" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => onChangeBiln('P-E-P-T-C(1,3)-I-D-E.A-G-V-I-C(1,3)')}
                                    startIcon={<HelpOutlineIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Load Example
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    <ButtonGroup size="small" variant="outlined">
                        <Tooltip title="Upload sequence" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={handleOpenUpload}
                                    startIcon={<UploadIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Upload Sequence
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

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
            <Box
                sx={{
                    mt: 2,
                    // cap the section height; <=2 chains fit, >2 will scroll
                    // maxHeight: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden', // header fixed; inner list handles its own scroll
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flex: '0 0 auto' }}>
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
                <Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', pr: 0.5, mt: 0.5, pt: 0.5 }}>
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

            {/* Upload sequence dialog */}
            <Dialog open={uploadOpen} onClose={handleCloseUpload} maxWidth="sm" fullWidth>
                <DialogTitle>Upload Sequence</DialogTitle>
                <DialogContent dividers>
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                        <FormLabel component="legend">Input format</FormLabel>
                        <RadioGroup
                            row
                            value={uploadMode}
                            onChange={(e) => {
                                setUploadMode(e.target.value);
                                setUploadError('');
                            }}
                        >
                            <FormControlLabel value="fasta" control={<Radio />} label="FASTA" />
                            <FormControlLabel value="helm" control={<Radio />} label="HELM" />
                        </RadioGroup>
                    </FormControl>

                    <TextField
                        label={uploadMode === 'fasta' ? 'FASTA sequences (max 5 lines, no headers)' : 'HELM sequence'}
                        multiline
                        minRows={6}
                        fullWidth
                        value={uploadText}
                        onChange={(e) => {
                            setUploadText(e.target.value);
                            setUploadError('');
                        }}
                        slotProps={{
                            input: {
                                sx: {
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                },
                            },
                        }}
                    />

                    {uploadMode === 'fasta' && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                            Rules:
                            <br />• One sequence per line (up to 5 lines).
                            <br />• Only standard one-letter amino acids (A,R,N,D,C,Q,E,G,H,I,L,K,M,F,P,S,T,W,Y,V).
                            <br />• Each valid line becomes a chain; chains are separated by "." in BILN.
                        </Typography>
                    )}

                    {uploadError && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                            {uploadError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUpload} size="small" disabled={uploadLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmUpload}
                        size="small"
                        variant="contained"
                        disabled={uploadLoading}
                    >
                        {uploadLoading ? 'Processing…' : 'Apply'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Paper>
    );
}