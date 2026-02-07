// ...existing imports...
import React, { useState, useRef } from 'react';
import { alpha } from '@mui/material/styles';
import {
    Box,
    Paper,
    Typography,
    Tooltip,
    Button,
    Slider,
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
    Divider,
} from '@mui/material';

import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import QuestionMarkSharpIcon from '@mui/icons-material/QuestionMarkSharp';
import UploadIcon from '@mui/icons-material/Upload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Chip from '@mui/material/Chip';

import { parseFastaToBiln, convertHelmToBiln } from '../../utils/bilnUtils';
import { API_URL } from '../../config';

import { useSequenceUploadDialog } from '../../hooks/useSequenceUploadDialog';
import { useScaffoldDialog } from '../../hooks/useScaffoldDialog';

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

    // Environment parameter (UI-only for now)
    ph: phProp,
    onChangePh,

    // Global constraint system mode
    constraintMode = 'ss',
    onConstraintModeChange = () => { },
    canUseTemplateMode = true,
    // Scaffold integration
    scaffoldTemplate = null,
    onUploadScaffoldFile = () => { },
    onFetchScaffoldById = () => { },
    onClearScaffold = () => { },
    scaffoldMappings = [],
    onEditScaffoldMapping = () => { },
    onOpenTemplatePanel = () => { },
    onCircularizeSequence = () => { },
    onUncircularizeSequence = () => { },
    onMirrorSequence = () => { },
    isDragging = false,

    // Bulk constraints setter for loading examples with pre-filled constraints
    onBulkSetConstraints,

    // Optional controlled state for UI-only placeholder chains
    extraEmptyChains: extraEmptyChainsProp,
    setExtraEmptyChains: setExtraEmptyChainsProp,
}) {
    const [bilnHelpOpen, setBilnHelpOpen] = useState(false);
    const [seqHelpOpen, setSeqHelpOpen] = useState(false);
    const [examplesDialogOpen, setExamplesDialogOpen] = useState(false);
    const [pendingExample, setPendingExample] = useState(null); // for confirm guard

    // ── Example categories shown in the "Examples" dialog ──
    const EXAMPLE_CATEGORIES = React.useMemo(() => [
        {
            title: 'Linear peptides',
            description: 'Simple backbone-connected sequences.',
            examples: [
                {
                    label: 'Short peptide (7 residues)',
                    biln: 'P-E-P-T-I-D-E',
                    note: 'Standard amino acids joined by backbone bonds.',
                },
                {
                    label: 'Longer peptide with disulfide bridge',
                    biln: 'G(1,1)-G-A-G-H-V-P-E(1,3)-Y-F-V-G-I-G-T-P-I-S-F-Y-G',
                    note: 'Contains an explicit bond between residues.',
                },
            ],
        },
        {
            title: 'Cyclic peptides',
            description: 'Head-to-tail cyclization via R1/R2 bond.',
            examples: [
                {
                    label: 'Cyclic hexapeptide (L-amino acids)',
                    biln: 'C(1,1)-Y-C-L-I-C(1,2)',
                    note: 'Bond 1 connects R1 of the first residue to R2 of the last.',
                },
                {
                    label: 'Cyclic octapeptide (all L)',
                    biln: 'G(1,1)-T-V-A-V-Q-F-L(1,2)',
                    note: 'Head-to-tail cyclization of 8 residues.',
                },
                {
                    label: 'Cyclic octapeptide with D-amino acids',
                    biln: 'D(1,1)-D-P-T-dP-dR-Q-dQ(1,2)',
                    note: 'Contains three D-amino acids (dP, dR, dQ).',
                },
            ],
        },
        {
            title: 'Capped peptides',
            description: 'N-terminal and/or C-terminal capping groups.',
            examples: [
                {
                    label: 'N-terminal acetyl cap',
                    biln: 'ac-G-A-D',
                    note: 'Acetyl (ac) cap on the N-terminus.',
                },
                {
                    label: 'C-terminal amide cap',
                    biln: 'G-A-D-am',
                    note: 'Amide (am) cap on the C-terminus.',
                },
                {
                    label: 'Both caps',
                    biln: 'ac-G-A-F-V-D-am',
                    note: 'Acetyl at N-terminus + amide at C-terminus.',
                },
                {
                    label: 'Side-chain capping',
                    biln: 'A-G-K(1,3)-D.ac(1,2)',
                    note: 'Acetyl attached to the side chain of Lysine.',
                },
            ],
        },
        {
            title: 'Non-natural amino acids',
            description: 'Peptides containing non-standard residues from the library.',
            examples: [
                {
                    label: 'Semaglutide backbone',
                    biln: 'H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K-E-F-I-A-W-L-V-R-G-R-G',
                    note: 'Contains Aib (α-aminoisobutyric acid). Lipid moiety (SemaB) can be linked after loading.',
                },
                {
                    label: 'Semaglutide with lipid linker',
                    biln: 'H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K(1,3)-E-F-I-A-W-L-V-R-G-R-G.SemaB(1,2)',
                    note: 'SemaB linked to Lys20 side chain (R3).',
                },
                {
                    label: 'Cyclic peptide with D-amino acids',
                    biln: 'dR(1,1)-Q-dP-dQ-R-dE-P-Q(1,2)',
                    note: 'Four D-amino acids (dR, dP, dQ, dE) in a cyclic arrangement.',
                },
            ],
        },
        {
            title: 'Secondary structure constraints',
            description: 'Constraints are pre-filled in the constraint track below each chain to guide 3D generation.',
            examples: [
                {
                    label: 'Full alpha-helix',
                    biln: 'A-E-A-A-K-A-E-A-A-K-A-E-A-A-K-A',
                    ssConstraints: [['H','H','H','H','H','H','H','H','H','H','H','H','H','H','H','H']],
                    constraintMode: 'ss',
                    note: 'All 16 positions set to H (helix).',
                },
                {
                    label: 'Helix–loop–helix motif',
                    biln: 'A-E-K-L-A-E-K-L-G-G-G-A-E-K-L-A-E-K-L',
                    ssConstraints: [['H','H','H','H','H','H','H','H','-','-','-','H','H','H','H','H','H','H','H']],
                    constraintMode: 'ss',
                    note: 'Helix on residues 1–8 and 12–19, coil in between.',
                },
                {
                    label: 'Beta-strand (extended)',
                    biln: 'V-T-V-T-V-T-V-T',
                    ssConstraints: [['E','E','E','E','E','E','E','E']],
                    constraintMode: 'ss',
                    note: 'All positions set to E (extended / β-strand).',
                },
                {
                    label: 'Mixed helix + strand',
                    biln: 'A-E-A-L-K-G-G-V-T-V-T-V',
                    ssConstraints: [['H','H','H','H','H','-','-','E','E','E','E','E']],
                    constraintMode: 'ss',
                    note: 'Helix on residues 1–5, loop, then strand on 8–12.',
                },
            ],
        },
        {
            title: '3D template constraints',
            description: 'A PDB structure is automatically fetched and loaded as backbone template.',
            examples: [
                {
                    label: 'Somatostatin (PDB: 2MI1)',
                    biln: 'A-G-C(1,3)-K-N-F-F-W-K-T-F-T-S-C(1,3)',
                    templatePdbId: '2MI1',
                    constraintMode: 'template',
                    note: 'Cyclic somatostatin analog. The 3D template (2MI1) is loaded to constrain the backbone.',
                },
            ],
        },
    ], []);

    const applyExample = React.useCallback((example) => {
        onChangeBiln(example.biln);

        // Switch constraint mode if specified
        if (example.constraintMode) {
            onConstraintModeChange(example.constraintMode);
        }

        // Apply SS constraints after a tick (BILN state needs to propagate first)
        if (example.ssConstraints && onBulkSetConstraints) {
            setTimeout(() => {
                onBulkSetConstraints(example.ssConstraints);
            }, 50);
        }

        // Fetch 3D template by PDB ID
        if (example.templatePdbId) {
            // Small delay to let BILN propagate before scaffold fetch
            setTimeout(() => {
                onFetchScaffoldById(example.templatePdbId);
            }, 100);
        }

        setExamplesDialogOpen(false);
    }, [onChangeBiln, onConstraintModeChange, onBulkSetConstraints, onFetchScaffoldById]);

    const handleLoadExample = React.useCallback((example) => {
        if (biln && biln.trim()) {
            // Editor has content → ask for confirmation
            setPendingExample(example);
        } else {
            applyExample(example);
        }
    }, [biln, applyExample]);

    const confirmLoadExample = React.useCallback(() => {
        if (pendingExample) {
            applyExample(pendingExample);
            setPendingExample(null);
        }
    }, [pendingExample, applyExample]);

    const cancelLoadExample = React.useCallback(() => {
        setPendingExample(null);
    }, []);

    // UI-only placeholder chains. These are appended after BILN-derived chains.
    // They become real chains only once a monomer is placed into them.
    const [extraEmptyChainsInternal, setExtraEmptyChainsInternal] = useState(0);
    const extraEmptyChains = extraEmptyChainsProp ?? extraEmptyChainsInternal;
    const setExtraEmptyChains = setExtraEmptyChainsProp ?? setExtraEmptyChainsInternal;

    const [phInternal, setPhInternal] = useState(7.4);
    const ph = typeof phProp === 'number' ? phProp : phInternal;
    const [phDraft, setPhDraft] = useState(() => (Number.isFinite(ph) ? ph : 7.4));
    const [isPhDragging, setIsPhDragging] = useState(false);

    // Keep local draft in sync with committed pH when not actively dragging.
    React.useEffect(() => {
        if (isPhDragging) return;
        setPhDraft(Number.isFinite(ph) ? ph : 7.4);
    }, [ph, isPhDragging]);

    const normalizePh = (value) => {
        const v = Array.isArray(value) ? value[0] : value;
        if (typeof v !== 'number' || Number.isNaN(v)) return null;
        // Keep it to one decimal place (step is 0.1)
        const rounded = Math.round(v * 10) / 10;
        return Math.min(12, Math.max(0, rounded));
    };

    const handlePhChange = (_event, value) => {
        const next = normalizePh(value);
        if (next == null) return;
        setIsPhDragging(true);
        setPhDraft(next);
    };

    const handlePhChangeCommitted = (_event, value) => {
        const next = normalizePh(value);
        if (next == null) return;
        setIsPhDragging(false);
        setPhDraft(next);

        // Only commit to state (and thus trigger fetches) on release.
        if (typeof onChangePh === 'function') {
            onChangePh(next);
        } else {
            setPhInternal(next);
        }
    };

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

    const btnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        px: 1,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    const modeBtnSx = (active) => ({
        ...btnSx,
        minWidth: 34,
        px: 0.5,
        bgcolor: active
            ? (t) => alpha(t.palette.text.secondary, t.palette.mode === 'dark' ? 0.22 : 0.12)
            : 'transparent',
        '&:hover': {
            bgcolor: active
                ? (t) => alpha(t.palette.text.secondary, t.palette.mode === 'dark' ? 0.28 : 0.16)
                : (t) => alpha(t.palette.action.hover, 0.8),
        },
    });

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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle4" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px' }}>
                        Editor interface
                    </Typography>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

                    <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        onClick={() => setExamplesDialogOpen(true)}
                        startIcon={<PlayArrowIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            px: 1,
                            minHeight: 28,
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                    >
                        Examples…
                    </Button>
                </Box>

                {/* Global toolbar: icon-only */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Bonds: Link / Cut */}
                    <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': btnSx }}>
                        <Tooltip title="Link monomers" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onToggleLinkMode}
                                    disabled={!canLink}
                                    sx={modeBtnSx(linkMode)}
                                    aria-label="link monomers"
                                >
                                    <DeviceHubIcon fontSize="inherit" />
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Cut (unlink)" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onToggleCutMode}
                                    disabled={!canUnlink}
                                    sx={modeBtnSx(bondsMode)}
                                    aria-label="cut bonds"
                                >
                                    <LinkOffIcon fontSize="inherit" />
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>

                    {/* pH control */}
                    {/* <Tooltip title={Number(phDraft).toFixed(1)} arrow> */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            minHeight: 28,
                            px: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                            pH
                        </Typography>
                        <Slider
                            min={0}
                            max={12}
                            step={0.1}
                            value={phDraft}
                            onChange={handlePhChange}
                            onChangeCommitted={handlePhChangeCommitted}
                            aria-label="pH"
                            // valueLabelDisplay="auto"
                            // valueLabelFormat={(v) => Number(v).toFixed(1)}
                            sx={{
                                width: 100,
                                py: 0,
                                '& .MuiSlider-rail': {
                                    opacity: 1,
                                    bgcolor: (t) => alpha(t.palette.text.secondary, t.palette.mode === 'dark' ? 0.25 : 0.22),
                                },
                                '& .MuiSlider-track': {
                                    border: 'none',
                                    bgcolor: (t) => t.palette.text.secondary,
                                    height: 2,
                                },
                                '& .MuiSlider-thumb': {
                                    width: 10,
                                    height: 10,
                                    bgcolor: (t) => t.palette.text.secondary,
                                    boxShadow: 'none',
                                },
                                '& .MuiSlider-valueLabel': {
                                    bgcolor: 'background.paper',
                                    color: 'text.primary',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                },
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                minWidth: 34,
                                textAlign: 'right',
                                fontFamily: 'monospace',
                                color: 'text.secondary',
                            }}
                        >
                            {Number(phDraft).toFixed(1)}
                        </Typography>
                    </Box>
                    {/* </Tooltip> */}

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

                    <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': btnSx }}>
                        <Tooltip title="Undo" arrow>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                                    aria-label="undo"
                                >
                                    <UndoIcon fontSize="inherit" />
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
                                    sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                                    aria-label="redo"
                                >
                                    <RedoIcon fontSize="inherit" />
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
                                    sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                                    aria-label="clear sequence"
                                >
                                    <DeleteSweepIcon fontSize="inherit" />
                                </Button>
                            </span>
                        </Tooltip>
                    </ButtonGroup>
                </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Manual edit subtitle + help icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Manual edit</Typography>
                    <Tooltip title="BILN format help" arrow>
                        <IconButton size="small" onClick={() => setBilnHelpOpen(true)} sx={{ color: 'text.secondary', fontSize: 15 }}>
                            <QuestionMarkSharpIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>


                {/* Right-side toolbar: Manual-edit scoped actions (icon-only) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                    {/* Hidden file input used when in "file" mode (scaffold dialog) */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdb,.ent,.cif,.mmcif"
                        style={{ display: 'none' }}
                        onChange={handleScaffoldFileChange}
                    />

                    {/* Upload sequence */}
                    <Tooltip title={'Upload sequence'} arrow>
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handleOpenUpload}
                                disabled={isAtMonomerLimit}
                                sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                                aria-label="upload sequence"
                            >
                                <UploadIcon fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
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
                    my: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden', // header fixed; inner list handles its own scroll
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0, flex: '0 0 auto' }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            Chains
                        </Typography>
                        <Tooltip title="Chains help" arrow>
                            <IconButton size="small" onClick={() => setSeqHelpOpen(true)} sx={{ color: 'text.secondary', fontSize: 15 }}>
                                <QuestionMarkSharpIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <ChainsToolbar
                        onAddChain={() => setExtraEmptyChains((c) => c + 1)}

                        constraintMode={constraintMode}
                        onConstraintModeChange={onConstraintModeChange}
                        canUseTemplateMode={canUseTemplateMode}

                    />
                </Box>

                <Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', mt: 1, pt: 0.5 }}>
                    <ChainSlots
                        rowMonomerLists={rowMonomerLists}
                        extraEmptyChains={extraEmptyChains}
                        setExtraEmptyChains={setExtraEmptyChains}
                        activeSeqIdx={activeSeqIdx}
                        onSetActiveSeqIdx={onSetActiveSeqIdx}
                        linkMap={linkMap}
                        handleDeleteMonomerItem={handleDeleteMonomerItem}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        handleMonomerEnter={handleMonomerEnter}
                        handleMonomerLeave={handleMonomerLeave}
                        handleDeleteSequence={handleDeleteSequence}
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={onEditConstraint}
                        constraintMode={constraintMode}
                        // Scaffold mapping
                        scaffoldTemplate={scaffoldTemplate}
                        scaffoldMappings={scaffoldMappings}
                        onEditScaffoldMapping={onEditScaffoldMapping}
                        onOpenTemplatePanel={onOpenTemplatePanel}
                        onOpenScaffoldDialog={openScaffoldDialog}
                        onClearScaffold={onClearScaffold}
                        onCircularizeSequence={onCircularizeSequence}
                        onUncircularizeSequence={onUncircularizeSequence}
                        onMirrorSequence={onMirrorSequence}
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
                            <br />- One sequence per line (up to 5 lines).
                            <br />- Only standard one-letter amino acids (A,R,N,D,C,Q,E,G,H,I,L,K,M,F,P,S,T,W,Y,V).
                            <br />- Each valid line becomes a chain; chains are separated by "." in BILN.
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

            {/* Examples dialog */}
            <Dialog
                open={examplesDialogOpen}
                onClose={() => { setExamplesDialogOpen(false); setPendingExample(null); }}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { maxWidth: 920, height: '80vh' } }}
            >
                <DialogTitle sx={{ pb: 1 }}>Load an example</DialogTitle>
                <DialogContent dividers sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
                    {/* ── Left sidebar nav ── */}
                    <Box
                        sx={{
                            width: 180,
                            flexShrink: 0,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            overflowY: 'auto',
                            py: 1.5,
                            display: { xs: 'none', sm: 'block' },
                        }}
                    >
                        <Typography
                            variant="overline"
                            sx={{
                                px: 2,
                                pb: 0.5,
                                display: 'block',
                                color: 'text.disabled',
                                fontSize: '0.65rem',
                                letterSpacing: '0.08em',
                            }}
                        >
                            Categories
                        </Typography>
                        {EXAMPLE_CATEGORIES.map((cat, idx) => (
                            <Box
                                key={cat.title}
                                component="button"
                                onClick={() => {
                                    const el = document.getElementById(`example-cat-${idx}`);
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                sx={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    px: 2,
                                    py: 0.75,
                                    border: 'none',
                                    bgcolor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    lineHeight: 1.3,
                                    borderLeft: '3px solid transparent',
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        color: 'text.primary',
                                        borderLeftColor: 'primary.light',
                                    },
                                    fontFamily: 'inherit',
                                }}
                            >
                                {cat.title}
                            </Box>
                        ))}
                    </Box>

                    {/* ── Right: scrollable content ── */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            px: { xs: 2, sm: 3 },
                            py: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                            Pick a starting point. The BILN sequence will be loaded into the editor.
                            For constraint-based examples, constraints are pre-filled automatically.
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {EXAMPLE_CATEGORIES.map((cat, catIdx) => (
                                <Paper
                                    key={cat.title}
                                    id={`example-cat-${catIdx}`}
                                    variant="outlined"
                                    sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, bgcolor: 'background.default', scrollMarginTop: 8 }}
                                >
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 0.25,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {cat.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                                    {cat.description}
                                </Typography>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {cat.examples.map((ex) => (
                                        <Paper
                                            key={ex.label}
                                            variant="outlined"
                                            sx={{
                                                p: 1.25,
                                                pl: 1.5,
                                                borderRadius: 1.5,
                                                display: 'flex',
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: 1,
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                                                },
                                                transition: 'border-color 0.15s, background-color 0.15s',
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.3 }}>
                                                    {ex.label}
                                                </Typography>
                                                {(ex.ssConstraints || ex.templatePdbId) && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                                        {ex.ssConstraints && (
                                                            <Chip
                                                                size="small"
                                                                label="Auto-fills SS constraints"
                                                                variant="outlined"
                                                                color="info"
                                                                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
                                                            />
                                                        )}
                                                        {ex.templatePdbId && (
                                                            <Chip
                                                                size="small"
                                                                label={`Auto-loads PDB ${ex.templatePdbId}`}
                                                                variant="outlined"
                                                                color="secondary"
                                                                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
                                                            />
                                                        )}
                                                    </Box>
                                                )}
                                                <Typography
                                                    variant="caption"
                                                    component="pre"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.72rem',
                                                        color: 'text.secondary',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-all',
                                                        m: 0,
                                                        mt: 0.25,
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {ex.biln}
                                                </Typography>
                                                {ex.note && (
                                                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5, fontSize: '0.72rem', lineHeight: 1.35 }}>
                                                        {ex.note}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleLoadExample(ex)}
                                                startIcon={<PlayArrowIcon sx={{ fontSize: '14px !important' }} />}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    flexShrink: 0,
                                                    px: 1.5,
                                                    minHeight: 28,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Load
                                            </Button>
                                        </Paper>
                                    ))}
                                </Box>
                            </Paper>
                        ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setExamplesDialogOpen(false); setPendingExample(null); }} size="small">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm replace dialog */}
            <Dialog
                open={!!pendingExample}
                onClose={cancelLoadExample}
                maxWidth="xs"
            >
                <DialogTitle>Replace current sequence?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Loading this example will replace the current editor content. This action can be undone with Ctrl+Z.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelLoadExample} size="small">Cancel</Button>
                    <Button onClick={confirmLoadExample} size="small" variant="contained" color="primary">Load example</Button>
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