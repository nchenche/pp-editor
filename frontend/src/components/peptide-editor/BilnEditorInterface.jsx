// ...existing imports...
import React, { useState, useRef } from 'react';
import { alpha } from '@mui/material/styles';
import {
    Box,
    Paper,
    Typography,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    ButtonGroup,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    FormControl,
    FormLabel,
    Switch,
    MenuItem,
} from '@mui/material';

import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadIcon from '@mui/icons-material/Upload';
import Chip from '@mui/material/Chip';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import { parseFastaToBiln, convertHelmToBiln } from '../../utils/bilnUtils';
import { API_URL } from '../../config';

import { useSequenceUploadDialog } from '../../hooks/useSequenceUploadDialog';
import { useScaffoldDialog } from '../../hooks/useScaffoldDialog';
import { useMappingDialog } from '../../hooks/useMappingDialog';

import { SequenceEditorPanel } from './SequenceInput';
import ChainsToolbar from './ChainComponent/ChainsToolbar';
import { ChainSlots } from './ChainComponent/ChainSlots';

// ...existing code...
export default function BilnEditorInterface({
    biln,
    maxMonomers = 40,
    isAtMonomerLimit = false,
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
    // Scaffold integration
    scaffoldTemplate = null,
    onUploadScaffoldFile = () => { },
    onFetchScaffoldById = () => { },
    onClearScaffold = () => { },
    scaffoldMappings = [],
    onEditScaffoldMapping = () => { },
    isDragging = false,
}) {
    const [bilnHelpOpen, setBilnHelpOpen] = useState(false);
    const [seqHelpOpen, setSeqHelpOpen] = useState(false);

    const {
        open: uploadOpen,
        mode: uploadMode,
        setMode: setUploadMode,
        text: uploadText,
        setText: setUploadText,
        error: uploadError,
        setError: setUploadError,
        loading: uploadLoading,
        handleOpen: handleOpenUpload,
        handleClose: handleCloseUpload,
        handleConfirm: handleConfirmUpload,
    } = useSequenceUploadDialog({ onApplyBiln: onChangeBiln, });

    // Scaffold dialog hook
    const {
        scaffoldDialogOpen,
        scaffoldMode,
        setScaffoldMode,
        pdbIdInput,
        setPdbIdInput,
        fileInputRef,
        openScaffoldDialog,
        closeScaffoldDialog,
        handleScaffoldFileChange,
        handleConfirmPdbId,
    } = useScaffoldDialog({
        onUploadScaffoldFile,
        onFetchScaffoldById,
    });

    // Mapping dialog hook
    const {
        mappingDialogOpen,
        mappingDialogSeqIdx,
        openMappingDialog,
        closeMappingDialog,
    } = useMappingDialog();

    const btnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        px: 1,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    const helpSectionSx = {
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 2,
        bgcolor: 'background.default',
    };

    const helpSectionTitleSx = {
        fontWeight: 800,
        fontSize: { xs: '1.15rem', sm: '1.3rem' },
        lineHeight: 1.25,
        mb: 1.25,
        pb: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        letterSpacing: '0.2px',
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

                    {/* Scaffold upload + status */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        {/* Hidden file input used when in "file" mode */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdb,.ent,.cif,.mmcif"
                            style={{ display: 'none' }}
                            onChange={handleScaffoldFileChange}
                        />

                        <Tooltip title="Upload a PDB file or fetch by PDB ID to use as global scaffold template" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={openScaffoldDialog}
                                    startIcon={<UploadIcon fontSize="inherit" />}
                                    sx={btnSx}
                                >
                                    Upload Scaffold (PDB)
                                </Button>
                            </span>
                        </Tooltip>

                        {scaffoldTemplate && (
                            <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={scaffoldTemplate.name}
                                onDelete={onClearScaffold}
                                deleteIcon={<DeleteForeverIcon />}
                                sx={{
                                    maxWidth: 200,
                                    '& .MuiChip-label': {
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                    },
                                }}
                            />
                        )}
                    </Box>

                    {/* Load example */}
                    <ButtonGroup size="small" variant="outlined">
                        <Tooltip
                            // title={isAtMonomerLimit ? 'Maximum monomer limit reached. Remove residues to add more.' : 'Load example BILN'}
                            title={'Load example BILN'}
                            arrow
                        >
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => onChangeBiln('G(1,1)-G-A-G-H-V-P-E(1,3)-Y-F-V-G-I-G-T-P-I-S-F-Y-G')}
                                    // disabled={isAtMonomerLimit}
                                    sx={btnSx}
                                >
                                    Load Example
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    {/* Upload sequence */}
                    <ButtonGroup size="small" variant="outlined">
                        <Tooltip
                            // title={isAtMonomerLimit ? 'Maximum monomer limit reached. Remove residues to add more.' : 'Upload sequence'}
                            title={'Upload sequence'}
                            arrow
                        >
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={handleOpenUpload}
                                    disabled={isAtMonomerLimit}
                                    sx={btnSx}
                                >
                                    Upload Sequence
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    {/* Undo / Redo / Clear */}
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
                    // hoveredResidueIdx={hoveredResidueIdx}
                    maxMonomers={maxMonomers}
                />
            </Box>

            {/* CHAINS SECTION */}
            <Box
                sx={{
                    mt: 2,
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
                        <Tooltip title="Chains help" arrow>
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
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={onEditConstraint}
                        // Scaffold mapping
                        scaffoldTemplate={scaffoldTemplate}
                        scaffoldMappings={scaffoldMappings}
                        onOpenScaffoldMapping={openMappingDialog}
                        onEditScaffoldMapping={onEditScaffoldMapping}
                    />
                </Box>
            </Box>


            {/* BILN help dialog with examples */}
            <Dialog
                open={bilnHelpOpen}
                onClose={() => setBilnHelpOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        maxWidth: 980,
                    },
                }}
            >
                <DialogTitle>Manual edit (BILN) help</DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        typography: 'body2',
                        p: { xs: 2, sm: 3 },
                        lineHeight: 1.8,
                        '& code': { fontFamily: 'monospace', fontSize: '0.9em' },
                        '& strong': { fontWeight: 800 },
                        '& ul': {
                            margin: 0,
                            paddingLeft: 2.75,
                            listStylePosition: 'outside',
                            listStyleType: 'disc',
                        },
                        '& ul ul': {
                            listStyleType: 'circle',
                            marginTop: 0.5,
                        },
                        '& li': { marginBottom: 1 },
                        '& li::marker': { color: 'text.secondary', fontWeight: 700 },
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900, mx: 'auto' }}>
                        <Paper
                            variant="outlined"
                            sx={(theme) => ({
                                ...helpSectionSx,
                                borderColor: 'info.main',
                                backgroundColor: alpha(
                                    theme.palette.info.main,
                                    theme.palette.mode === 'dark' ? 0.14 : 0.08
                                ),
                            })}
                        >
                            <Typography variant="h6" sx={helpSectionTitleSx}>
                                Quick reference
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                                Use monomer identifiers from the Library panel, and combine them with <code>-</code>, <code>.</code>, and optional bond annotations.
                            </Typography>

                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    overflowX: 'auto',
                                    backgroundColor: 'background.paper',
                                }}
                            >
                                <Box
                                    component="table"
                                    sx={{
                                        width: '100%',
                                        minWidth: 720,
                                        borderCollapse: 'collapse',
                                        '& th, & td': {
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            px: 1.25,
                                            py: 1,
                                            verticalAlign: 'top',
                                        },
                                        '& th': {
                                            textAlign: 'left',
                                            fontWeight: 800,
                                            color: 'text.secondary',
                                            backgroundColor: (theme) =>
                                                alpha(
                                                    theme.palette.info.main,
                                                    theme.palette.mode === 'dark' ? 0.18 : 0.10
                                                ),
                                        },
                                        '& tr:last-child td': { borderBottom: 'none' },
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70%' }}>Concept</th>
                                            <th>Example</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Backbone connection</strong> (automatic <code>R2 → R1</code>)</td>
                                            <td><code>A-C</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Explicit equivalent</strong> (same as <code>A-C</code>)</td>
                                            <td><code>A(1,2).C(1,1)</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Branch / side-chain capping</strong> (branch separated by <code>.</code>)</td>
                                            <td><code>A-G-K(1,3)-D.ac(1,2)</code></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Monomer containing “-”</strong> (use brackets)</td>
                                            <td><code>[2-Cl-Phe]-A</code></td>
                                        </tr>
                                    </tbody>
                                </Box>
                            </Box>
                        </Paper>

                        <Paper variant="outlined" sx={helpSectionSx}>
                            <Typography variant="h6" sx={helpSectionTitleSx}>
                                Basic Rules &amp; Linear Sequences
                            </Typography>
                            <ul>
                                <li>
                                    <Typography component="span">
                                        <strong>Monomer Identifiers:</strong> Use the unique identifiers found in the <strong>Monomer Library Panel</strong> to the right.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Direction:</strong> Sequences are written in consecutive order, following an <strong>N-terminal to C-terminal</strong> convention.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Standard Connections:</strong> Use a hyphen (<code>-</code>) to represent standard backbone connections where <code>R2</code> of the first monomer connects to <code>R1</code> of the next.
                                    </Typography>
                                    <Box
                                        sx={{
                                            mt: 1,
                                            p: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1.5,
                                            backgroundColor: 'background.paper',
                                        }}
                                    >
                                        <Typography component="div" sx={{ color: 'text.secondary' }}>
                                            <strong>Equivalence:</strong> <code>A-C</code> is shorthand for an explicit <code>R2 → R1</code> bond:
                                            {' '}
                                            <code>A(1,2).C(1,1)</code>
                                            {' '}
                                            (any BondID works as long as it appears exactly twice).
                                        </Typography>
                                    </Box>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Brackets:</strong> If a monomer identifier contains a hyphen (e.g., <code>2-Cl-Phe</code>), it must be enclosed in brackets: <code>[2-Cl-Phe]</code>.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Unconnected Chains:</strong> Use a dot (<code>.</code>) to separate monomers or chains that are not yet connected.
                                    </Typography>
                                </li>
                            </ul>
                        </Paper>

                        <Paper variant="outlined" sx={helpSectionSx}>
                            <Typography variant="h6" sx={helpSectionTitleSx}>
                                Custom Bonds and R-Groups
                            </Typography>
                            <Typography sx={{ mb: 1 }}>
                                For any bond that does not follow the standard backbone connection (like side-chain bonds or cyclization), use:
                                {' '}
                                <code>Monomer(BondID, R-group)</code>
                            </Typography>

                            <Typography sx={{ mb: 1, color: 'text.secondary' }}>
                                Note: The <code>#</code> comments below are explanatory (don’t include them in your input).
                            </Typography>

                            <Box
                                component="pre"
                                sx={{
                                    m: 0,
                                    p: 1.25,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    overflowX: 'auto',
                                    backgroundColor: 'background.paper',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    lineHeight: 1.55,
                                }}
                            >
                                {`C(1,3)-...-C(1,3)  # disulfide bridge\nC(1,1)-...-C(1,2)  # head-to-tail cyclization`}
                            </Box>

                            <ul style={{ marginTop: 12 }}>
                                <li>
                                    <Typography component="span">
                                        <strong>Bond Identifier (BondID):</strong> An integer used to pair two monomers together; each BondID must appear exactly twice within the string.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>R-group Number:</strong> The exact attachment point on the monomer.
                                    </Typography>
                                    <ul>
                                        <li>
                                            <Typography component="span">
                                                <strong>R1:</strong> Typically the N-terminal backbone nitrogen.
                                            </Typography>
                                        </li>
                                        <li>
                                            <Typography component="span">
                                                <strong>R2:</strong> Typically the C-terminal carbonyl carbon.
                                            </Typography>
                                        </li>
                                        <li>
                                            <Typography component="span">
                                                <strong>R3 and higher:</strong> Used for side chains, branching, or specific chemical modifications.
                                            </Typography>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </Paper>

                        <Paper variant="outlined" sx={helpSectionSx}>
                            <Typography variant="h6" sx={helpSectionTitleSx}>
                                Common BILN-based Sequence Examples
                            </Typography>

                            <Box
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    overflowX: 'auto',
                                    backgroundColor: 'background.paper',
                                }}
                            >
                                <Box
                                    component="table"
                                    sx={{
                                        width: '100%',
                                        minWidth: 760,
                                        borderCollapse: 'collapse',
                                        '& th, & td': {
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            px: 1.25,
                                            py: 1,
                                            verticalAlign: 'top',
                                        },
                                        '& th': {
                                            textAlign: 'left',
                                            fontWeight: 700,
                                            color: 'text.secondary',
                                            backgroundColor: 'background.default',
                                        },
                                        '& tbody tr:nth-of-type(odd) td': {
                                            backgroundColor: 'action.hover',
                                        },
                                        '& tr:last-child td': { borderBottom: 'none' },
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th style={{ width: '26%' }}>Type</th>
                                            <th style={{ width: '36%' }}>Example Notation</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Simple Linear</strong></td>
                                            <td><code>P-E-P-T-I-D-E</code></td>
                                            <td>Standard peptide connected via backbone.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Disulfide Bridge</strong></td>
                                            <td><code>A-C(1,3)-G-A-G-C(1,3)-D</code></td>
                                            <td>Bond <code>1</code> connects the <code>R3</code> side chains of two Cysteines.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Cyclic Peptide</strong></td>
                                            <td><code>C(1,1)-Y-C-L-I-C(1,2)</code></td>
                                            <td>Bond <code>1</code> connects <code>R1</code> of the first residue to <code>R2</code> of the last.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Branched Chain</strong></td>
                                            <td><code>A-G-K(1,3)-G-A-D.E-H-I-A(1,2)</code></td>
                                            <td>The <code>.</code> separates the main chain from the branch. Bond <code>1</code> connects <code>R3</code> of Lysine to <code>R2</code> of Alanine.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>N-Terminal Capping</strong></td>
                                            <td><code>ac-G-A-D</code></td>
                                            <td>
                                                A capping monomer (<code>ac</code>) attached to the N-terminus.
                                                {' '}
                                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                                    Equivalent explicit form: <code>ac(1,2).G(1,1)-A-D</code>
                                                </Box>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>C-Terminal Capping</strong></td>
                                            <td><code>G-A-D-am</code></td>
                                            <td>
                                                A capping monomer (<code>am</code>) attached to the C-terminus.
                                                {' '}
                                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                                    Equivalent explicit form: <code>G-A-D(1,2).am(1,1)</code>
                                                </Box>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Side Chain Capping</strong></td>
                                            <td><code>A-G-K(1,3)-D.ac(1,2)</code></td>
                                            <td>The <code>.</code> separates the main chain from the branch.</td>
                                        </tr>
                                    </tbody>
                                </Box>
                            </Box>
                        </Paper>

                        <Paper variant="outlined" sx={helpSectionSx}>
                            <Typography variant="h6" sx={helpSectionTitleSx}>
                                Manual Entry Tips
                            </Typography>
                            <ul>
                                <li>
                                    <Typography component="span">
                                        <strong>Check Attachment Points:</strong> Verify available <code>R-groups</code> for a monomer in the <strong>Library Panel</strong> to ensure your bond is valid.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Concatenation:</strong> If a monomer has multiple connections, concatenate the bond pairs: <code>K(1,3)(2,3)</code>
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Unambiguous Translation:</strong> When correctly formatted, BILN provides an unequivocal translation into a full chemical structure.
                                    </Typography>
                                </li>
                            </ul>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBilnHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>

            {/* Sequences help dialog */}
            <Dialog open={seqHelpOpen} onClose={() => setSeqHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Working with chains</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <ul>
                        <li>Append adds monomers at the end; Prepend at the start; New creates a new chain.</li>
                        <li>Use Link to connect residues and Cut to break bonds in the 2D sketch.</li>
                        <li>Choose the active chain to receive new monomers from the library.</li>
                        <li>Per-residue secondary structure letters (H/E/-) can guide 3D generation.</li>
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

            {/* Template mapping dialog */}
            <Dialog
                open={mappingDialogOpen && mappingDialogSeqIdx != null}
                onClose={closeMappingDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Configure 3D template · Chain {mappingDialogSeqIdx != null ? mappingDialogSeqIdx + 1 : ''}
                </DialogTitle>
                <DialogContent dividers>
                    {mappingDialogSeqIdx == null ? null : !scaffoldTemplate ? (
                        <Typography variant="body2" color="text.secondary">
                            Upload or fetch a scaffold before configuring per-chain mappings.
                        </Typography>
                    ) : (
                        (() => {
                            const mapping = scaffoldMappings[mappingDialogSeqIdx] || {};
                            const enabled = Boolean(mapping.enabled);
                            const chains = scaffoldTemplate.chainData ?? [];
                            const selectedChainId = mapping.chainId ?? '';
                            const update = (patch) =>
                                onEditScaffoldMapping(mappingDialogSeqIdx, patch);

                            return (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Define how this designed chain threads onto the scaffold.
                                    </Typography>

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
                                                checked={enabled}
                                                onChange={(e) => update({ enabled: e.target.checked })}
                                            />
                                        }
                                        label="Enable template mapping for this chain"
                                    />

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        <TextField
                                            select
                                            size="small"
                                            label="PDB chain"
                                            value={selectedChainId}
                                            onChange={(e) => update({ chainId: e.target.value || null })}
                                            disabled={!enabled}
                                            sx={{ minWidth: 140 }}
                                        >
                                            {(chains.length ? chains : scaffoldTemplate.chains || []).map((chain) => {
                                                const id = typeof chain === 'string' ? chain : chain.id;
                                                return (
                                                    <MenuItem key={id} value={id}>
                                                        {id}
                                                    </MenuItem>
                                                );
                                            })}
                                        </TextField>

                                        <TextField
                                            size="small"
                                            label="Start residue"
                                            type="number"
                                            value={mapping.start ?? ''}
                                            slotProps={{ htmlInput: { min: 1 } }}
                                            onChange={(e) =>
                                                update({ start: e.target.value ? Number(e.target.value) : null })
                                            }
                                            disabled={!enabled}
                                            sx={{ width: 140 }}
                                        />

                                        <TextField
                                            size="small"
                                            label="End residue"
                                            type="number"
                                            value={mapping.end ?? ''}
                                            onChange={(e) =>
                                                update({ end: e.target.value ? Number(e.target.value) : null })
                                            }
                                            disabled={!enabled}
                                            sx={{ width: 140 }}
                                        />

                                        <TextField
                                            size="small"
                                            label="Offset"
                                            type="number"
                                            value={mapping.offset ?? 0}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                            onChange={(e) => update({ offset: Number(e.target.value) || 0 })}
                                            disabled={!enabled}
                                            sx={{ width: 120 }}
                                        />
                                    </Box>

                                    <Typography variant="caption" color="text.secondary">
                                        Designed length:{' '}
                                        {rowMonomerLists[mappingDialogSeqIdx]?.length ?? 0} residues.
                                    </Typography>
                                </Box>
                            );
                        })()
                    )}
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={closeMappingDialog}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Scaffold upload / fetch dialog */}
            <Dialog open={scaffoldDialogOpen} onClose={closeScaffoldDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Select scaffold source</DialogTitle>
                <DialogContent dividers>
                    <RadioGroup
                        row
                        value={scaffoldMode}
                        onChange={(e) => setScaffoldMode(e.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <FormControlLabel value="file" control={<Radio size="small" />} label="Upload file" />
                        <FormControlLabel value="pdbId" control={<Radio size="small" />} label="PDB ID" />
                    </RadioGroup>

                    {scaffoldMode === 'file' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Choose a local PDB/mmCIF file to use as global scaffold template.
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UploadIcon fontSize="inherit" />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Select file…
                            </Button>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Enter a 4-letter PDB ID (e.g. 1CRN, 4HHB).
                            </Typography>
                            <TextField
                                size="small"
                                label="PDB ID"
                                value={pdbIdInput}
                                onChange={(e) => setPdbIdInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleConfirmPdbId();
                                    }
                                }}
                                slotProps={{ htmlInput: { maxLength: 4, style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={closeScaffoldDialog}>
                        Cancel
                    </Button>
                    {scaffoldMode === 'pdbId' && (
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleConfirmPdbId}
                            disabled={!(pdbIdInput.trim().length === 4)}
                        >
                            Fetch
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Paper>
    );
}