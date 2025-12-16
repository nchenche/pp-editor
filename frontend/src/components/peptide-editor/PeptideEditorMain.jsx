import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

import BilnEditorInterface from './BilnEditorInterface';
import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
import { MolstarSchemes } from './Viewer3D/molstar/Schemes';
import { ReplaceOverlay } from './ReplaceOverlay';

import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';
import { useScaffoldTemplate } from '../../../src/hooks/useScaffoldTemplate';
import { useScaffoldMappings } from '../../../src/hooks/useScaffoldMappings';
import { usePersistDesign, useInitialDesignState } from '../../../src/hooks/usePersistDesign';
import { useSplitLayout } from '../../../src/hooks/useSplitLayout';
import { useBilnHistory } from '../../../src/hooks/useBilnHistory';

import {
    buildLinkMapFromBiln,
    setMonomerSequences,
    deriveSeqCount,
    reconcileActiveSeqIdx,
    analyzeBiln
} from '../../../src/utils/bilnUtils';

import { Box, Paper, Typography, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import CircularProgress from '@mui/material/CircularProgress';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const initBiln = 'P-E-P-T-C(1,3)-I-D-E.A-G-V-I-C(1,3)';  //  A-C-K-A-C
const MAX_MONOMERS = 40;


const PeptideEditorMainInner = ({ isActive, onOutputChange, uiState, setUiState, onBeginReplaceSelection, onCancelReplaceSelection }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [repMenuEl, setRepMenuEl] = useState(null);
    const [colorMenuEl, setColorMenuEl] = useState(null);
    const [reset3DEl, setReset3DEl] = useState(null);
    const repMenuOpen = Boolean(repMenuEl);
    const colorMenuOpen = Boolean(colorMenuEl);
    const reset3DOpen = Boolean(reset3DEl);

    const { initialBiln, initialConstraints } = useInitialDesignState({ fallbackBiln: initBiln });
    const {
        value: bilnValue,
        setValue: setBilnValue,
        canUndo,
        canRedo,
        undo: handleUndoBiln,
        redo: handleRedoBiln,
    } = useBilnHistory(initialBiln, 20);
    const [committedBiln, setCommittedBiln] = useState(initialBiln);

    const [phValue, setPhValue] = useState(7.4);
    const [constraintsBySeq, setConstraintsBySeq] = useState(() => initialConstraints);

    const EMPTY_ARRAY = Object.freeze([]);
    const { svg: svgDepiction = '', smiles = '', helm = '', monomers = EMPTY_ARRAY } = depictionData ?? {};
    const structurePDB = structureOutput?.pdb || structureOutput?.PDB || '';

    // Viewer refs and states
    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });
    const viewer3DRef = useRef(null);

    const canLink = !!svgDepiction && !viewer2DModes.bondsMode;
    const canCut = !!svgDepiction && !viewer2DModes.linkMode && viewer2DModes?.canCut !== false;

    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [hoveredMonomer, setHoveredMonomer] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [bilnValue]);
    const rowMonomerLists = useMemo(() => setMonomerSequences(committedBiln, monomers), [monomers]);

    const [limitDialog, setLimitDialog] = useState({ open: false, message: '' });
    const { tokenCount: currentTokenCount } = useMemo(
        () => analyzeBiln(bilnValue || ''),
        [bilnValue],
    );
    const isAtMonomerLimit = currentTokenCount >= MAX_MONOMERS;

    const openLimitDialog = useCallback((tokenCount) => {
        setLimitDialog({
            open: true,
            message:
                `Maximum sequence length reached (${Math.min(tokenCount, MAX_MONOMERS)}/${MAX_MONOMERS}). ` +
                `Remove one or more monomers before adding new ones.`,
        });
    }, []);

    const trySetBilnValue = useCallback(
        (nextBilnOrUpdater) => {
            // Support both:
            //  - setBilnValue("A-G")
            //  - setBilnValue(prev => prev + "-A")  (used by drag/drop handlers)
            const nextBiln =
                typeof nextBilnOrUpdater === 'function'
                    ? nextBilnOrUpdater(bilnValue)
                    : nextBilnOrUpdater;

            if (typeof nextBiln !== 'string') {
                console.warn('trySetBilnValue: expected string BILN but got:', nextBiln);
                return false;
            }

            const { tokenCount } = analyzeBiln(nextBiln);
            if (tokenCount > MAX_MONOMERS) {
                openLimitDialog(tokenCount);
                return false;
            }

            setBilnValue(nextBiln);
            return true;
        },
        [bilnValue, setBilnValue, openLimitDialog],
    );

    const {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
        handleDragStart,
        handleDeleteSequence,
        replaceMonomerInBiln,
    } = useBilnHandlers({
        bilnValue,
        setBilnValue: trySetBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        setIsDragging,
        setHoveredMonomer
    });
    const { handleMonomerEnter, handleMonomerLeave, handleMonomerHover } = useUIHandlers({ monomers, setHoveredMonomer, isDragging });


    // Flatten constraints to secstruct (keep '-' for "no constraint")
    const ALLOWED_SS = useMemo(() => new Set(['H', 'E', 'C', 'T', '-']), []);
    const flattenSecstruct = useCallback((cbs) => (
        (cbs || [])
            .flat()
            .map(c => {
                const ch = (c || '-').toString().toUpperCase();
                return ALLOWED_SS.has(ch) ? ch : '-';
            })
            .join('')
    ), [ALLOWED_SS]);

    const secstructString = useMemo(() => flattenSecstruct(constraintsBySeq), [constraintsBySeq, flattenSecstruct]);

    // Scaffold /template handling
    const {
        scaffoldTemplate,
        uploadScaffoldFile,
        fetchScaffoldById,
        handleClearScaffold,
        loading: scaffoldLoading,
        error: scaffoldError,
    } = useScaffoldTemplate();

    const { scaffoldMappings, anyScaffoldEnabled, scaffoldMappingPayload, handleEditScaffoldMapping, hasTemplateOverlap } = useScaffoldMappings(rowMonomerLists, scaffoldTemplate);
    const [templateOverlapOpen, setTemplateOverlapOpen] = useState(false);
    const [autoSync3DRaw, setAutoSync3DRaw] = useState(true);
    const autoSync3D = !anyScaffoldEnabled && autoSync3DRaw;


    const [replaceSelect, setReplaceSelect] = useState({ open: false, mode: null, sourceMonomer: null });
    const beginReplaceSelection = useCallback((mode, sourceMonomer) => {
        setReplaceSelect({ open: true, mode, sourceMonomer });
        onBeginReplaceSelection?.(mode, sourceMonomer);
    }, [onBeginReplaceSelection]);

    const cancelReplaceSelection = useCallback(() => {
        setReplaceSelect({ open: false, mode: null, sourceMonomer: null });
        onCancelReplaceSelection?.();
        // notify items to clear selection highlight
        window.dispatchEvent(new CustomEvent('pp-replace-selection-cancel'));
    }, [onCancelReplaceSelection]);

    // Listen to fallback custom event from MonomerItem if prop isn't threaded
    useEffect(() => {
        const handler = (e) => beginReplaceSelection(e.detail?.mode, e.detail?.monomer);
        window.addEventListener('pp-begin-replace-selection', handler);
        return () => window.removeEventListener('pp-begin-replace-selection', handler);
    }, [beginReplaceSelection]);

    // Close on Escape when overlay is open
    useEffect(() => {
        if (!replaceSelect.open) return;
        const onKey = (e) => { if (e.key === 'Escape') cancelReplaceSelection(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [replaceSelect.open, cancelReplaceSelection]);

    // Lift state up: output data
    useEffect(() => {
        if (onOutputChange) {
            onOutputChange({
                biln: bilnValue,
                helm: helm,
                smiles: smiles,
                structure3D: structurePDB || '',
                sdf: structureOutput?.SDF || structureOutput?.sdf || '',
                mol2: structureOutput?.MOL2 || structureOutput?.mol2 || '',
                inchi: structureOutput?.InChI || structureOutput?.inchi || '',
                inchiKey: structureOutput?.InChIKey || structureOutput?.inchiKey || '',
            });
        }
    }, [bilnValue, helm, smiles, structurePDB, structureOutput, onOutputChange]);


    const canGenerate3D = useMemo(() => {
        if (!committedBiln) return false;
        const { tokenCount } = analyzeBiln(committedBiln);
        return tokenCount > 0 && secstructString.length === tokenCount;
    }, [committedBiln, secstructString]);

    // Debounced generate3D trigger and last sent guard
    const lastGenRef = useRef({
        biln: null,
        ss: null,
        useTemplate: null,
        mappingSig: null,
    });

    const triggerGenerate = useCallback(
        (biln, ss) => {
            const useTemplate = anyScaffoldEnabled && !!scaffoldMappingPayload;
            const mappingSig =
                useTemplate && scaffoldMappingPayload
                    ? JSON.stringify(scaffoldMappingPayload)
                    : null;

            // Normalize BILN: if it's effectively empty, do not generate
            const normalizedBiln = (biln || '')
                .trim()
                .replace(/^[.\-]+|[.\-]+$/g, '')
                .replace(/\.+/g, '.')
                .replace(/\-+/g, '-');

            if (!normalizedBiln) {
                lastGenRef.current = { biln, ss, useTemplate, mappingSig };
                return;
            }

            const prev = lastGenRef.current;

            if (
                prev.biln === biln &&
                prev.ss === ss &&
                prev.useTemplate === useTemplate &&
                prev.mappingSig === mappingSig
            ) {
                return;
            }

            if (useTemplate && hasTemplateOverlap()) {
                setTemplateOverlapOpen(true);
                return;
            }

            lastGenRef.current = { biln, ss, useTemplate, mappingSig };

            if (useTemplate) {
                generate3D(biln, null, {
                    endpoint: '/api/core/molecules/generate_3d_from_template',
                    extraBody: {
                        biln,
                        template_id: scaffoldMappingPayload.template_id,
                        scaffold_mappings: scaffoldMappingPayload.mappings,
                    },
                });
            } else {
                generate3D(biln, constraintsBySeq);
            }
        },
        // FIX deps: structureOutput wasn’t used; constraintsBySeq + structurePDB are the relevant ones
        [generate3D, anyScaffoldEnabled, scaffoldMappingPayload, hasTemplateOverlap, constraintsBySeq],
    );

    const handleAutoSyncChange = useCallback(
        (_, checked) => {
            // If any scaffold mapping is enabled, force manual mode
            if (anyScaffoldEnabled && checked) return;
            setAutoSync3DRaw(!!checked);
        },
        [anyScaffoldEnabled],
    );

    const handleManualGenerate3D = useCallback(() => {
        if (!isActive || !canGenerate3D || !committedBiln) return;
        triggerGenerate(committedBiln, secstructString);
    }, [isActive, canGenerate3D, committedBiln, secstructString, triggerGenerate]);


    // keep constraints arrays shaped to sequences
    useEffect(() => {
        setConstraintsBySeq(prev => {
            const next = rowMonomerLists.map((seq, i) => {
                const existing = Array.isArray(prev[i]) ? prev[i] : [];
                const len = seq.length;
                const out = new Array(len);
                for (let j = 0; j < len; j++) {
                    const v = (existing[j] || '-').toString().toUpperCase();
                    out[j] = ALLOWED_SS.has(v) ? v : '-';
                }
                return out;
            });

            // Deep equality check to avoid no-op state updates
            let same = next.length === prev.length;
            if (same) {
                for (let i = 0; i < next.length && same; i++) {
                    const a = next[i] || [];
                    const b = prev[i] || [];
                    if (a.length !== b.length) { same = false; break; }
                    for (let j = 0; j < a.length; j++) {
                        if (a[j] !== b[j]) { same = false; break; }
                    }
                }
            }
            return same ? prev : next;
        });
    }, [rowMonomerLists]);

    // shape-safe edit
    const handleEditConstraint = useCallback((seqIdx, resIdx, ch) => {
        setConstraintsBySeq(prev => {
            const lists = rowMonomerLists; // capture current lengths
            const targetLen = lists[seqIdx]?.length ?? 0;

            // Sanitize incoming value
            const val = (() => {
                const up = (ch || '-').toString().toUpperCase();
                return ALLOWED_SS.has(up) ? up : '-';
            })();

            // If current equals new, do nothing (prevents redundant renders)
            const current = (Array.isArray(prev?.[seqIdx]) && prev[seqIdx][resIdx]) || '-';
            if (current === val) return prev;

            // Clone and apply change
            const next = prev.map(a => (Array.isArray(a) ? a.slice() : []));
            while (next.length < lists.length) next.push([]);
            const arr = Array.isArray(next[seqIdx]) ? next[seqIdx].slice() : new Array(targetLen).fill('-');
            if (arr.length < targetLen) {
                next[seqIdx] = arr.concat(new Array(targetLen - arr.length).fill('-'));
            } else {
                next[seqIdx] = arr;
            }
            next[seqIdx][resIdx] = val;
            return next;
        });
    }, [rowMonomerLists, ALLOWED_SS]);

    // Stable setter to avoid MonomerTrack re-render due to inline function identity changes
    const onSetActiveSeqIdx = useCallback(
        (seqIdx) => setUiState(prev => (prev.activeSeqIdx === seqIdx ? prev : { ...prev, activeSeqIdx: seqIdx })),
        [setUiState]
    );

    // Expose a minimal API to parent
    useImperativeHandle(ref, () => ({
        addMonomer: (monomer, options) => {
            // Hard block additions when already at the limit
            if (isAtMonomerLimit) {
                openLimitDialog(currentTokenCount);
                return false;
            }
            return addMonomerToBiln(monomer, {
                mode: options?.mode,
                link: options?.link,
                activeSequenceIdx: options?.activeSequenceIdx ?? uiState.activeSeqIdx,
                insert: options?.insert,
            });
        },
        replaceMonomer: (m, opts) => replaceMonomerInBiln(m, opts),
        endReplaceSelection: () => { cancelReplaceSelection(); },
        setBiln: (biln) => trySetBilnValue(biln),
        getBiln: () => bilnValue,
    }), [addMonomerToBiln, replaceMonomerInBiln, uiState, bilnValue, isAtMonomerLimit, currentTokenCount, openLimitDialog, cancelReplaceSelection, trySetBilnValue]);

    function loadData(newBiln) {
        const params = {
            sequence: newBiln,
            mode: 'rdkit',
            'show-atom-indices': isShowingAtomIndices,
            'is_protonated': true,
            'ph_value': phValue
        }

        // const query = `?sequence=${newBiln}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        fetchDepiction(params);
    }

    // Update committedBiln only when BILN is committable (prevents “separator-only” and open '(' churn)
    useEffect(() => {
        // IMPORTANT: keep committedBiln in sync when user clears
        if (!bilnValue || !bilnValue.trim()) {
            if (committedBiln !== '') setCommittedBiln('');

            // Key fix: allow re-generating if user pastes the same sequence again
            lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null };

            return;
        }

        const { committable } = analyzeBiln(bilnValue);
        if (!committable) return;
        if (bilnValue !== committedBiln) setCommittedBiln(bilnValue);
    }, [bilnValue, committedBiln]);

    // Drive depiction only from committedBiln
    useEffect(() => {
        if (!isActive) return; // skip when not active
        if (!committedBiln) {
            setMonomerSequences('', []); // clear sequences
            setDepictionData({ svg: '', monomers: [], smiles: '', helm: '' });
            setStructureOutput({ pdb: '' });
            return;
        }
        loadData(committedBiln);
    }, [committedBiln, isActive]); // [committedBiln, isShowingAtomIndices] if you want atom indices to affect depiction

    useEffect(() => {
        if (!isActive) return;
        if (!committedBiln) {
            setStructureOutput({ pdb: '' });
            return;
        }
        if (!autoSync3D) return;
        if (!canGenerate3D) return;
        triggerGenerate(committedBiln, secstructString);
    }, [isActive, committedBiln, autoSync3D, canGenerate3D, triggerGenerate, secstructString]);

    const manualGenerateDisabled = autoSync3D || !canGenerate3D || structureLoading;
    const generateBtnTooltip = anyScaffoldEnabled
        ? 'Scaffold mapping is enabled: use "Generate 3D" to update the conformer.'
        : autoSync3D
            ? '3D view updates automatically while Sync is on.'
            : !canGenerate3D
                ? 'Ensure constraints cover every residue before generating.'
                : structureLoading
                    ? 'Generation already in progress.'
                    : 'Generate updated 3D structure.';

    // Keep UI seq count in sync with committed BILN
    useEffect(() => {
        const count = deriveSeqCount(committedBiln);
        setUiState(prev => {
            const nextIdx = reconcileActiveSeqIdx(prev.activeSeqIdx, count);
            if (prev.seqNumber === count && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: count, activeSeqIdx: nextIdx };
        });
    }, [committedBiln, setUiState]);

    function handleBilnChange(newBiln) {
        trySetBilnValue(newBiln);
    }

    const skipNextGenerateRef = useRef(false); // to skip auto-generate after clear action
    const clearData = useCallback(() => {
        // Reset UI state expectations
        setAutoSync3DRaw(true);          // requested behavior: reset auto-sync to true
        setTemplateOverlapOpen(false);

        // Clear editor + derived committed state
        setBilnValue('');
        setCommittedBiln('');

        // Clear outputs
        setDepictionData({ svg: '', monomers: [], smiles: '', helm: '' });
        setStructureOutput({ pdb: '' });

        // Reset “last generated” guard so next paste triggers generation normally
        lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null };

        // Clear scaffold (also makes autoSync3D = true again because anyScaffoldEnabled becomes false)
        handleClearScaffold();
    }, [
        setAutoSync3DRaw,
        setTemplateOverlapOpen,
        setBilnValue,
        setCommittedBiln,
        setDepictionData,
        setStructureOutput,
        handleClearScaffold,
    ]);

    // Persist design state
    usePersistDesign({ biln: bilnValue, constraints: constraintsBySeq });


    // Compact, subtle button style for the 2D toolbar
    // Compact, subtle button style for the 2D/3D toolbars (icon-only)
    const TOOLBAR_BTN_SX = Object.freeze({
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 24,
        minWidth: 32,
        px: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiSvgIcon-root': { color: 'currentColor' },
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
        '&.Mui-disabled': { color: 'text.disabled', borderColor: 'divider' },
        '&.Mui-disabled .MuiSvgIcon-root': { color: 'text.disabled' },
    });
    const BUTTON_GROUP_SX = Object.freeze({ '& .MuiButton-root': TOOLBAR_BTN_SX });

    // Split layout for editor/viewers ; draggable divider
    const {
        editorAreaHeight,
        viewerSplitRatio,
        mainAreaRef,
        viewerRowRef,
        startDrag,
    } = useSplitLayout({
        initialEditorHeight: 320,
        minEditorHeight: 240,
        minViewerPanelWidth: 200,
        initialViewerSplitRatio: 0.5,
    });


    return (
        <Box
            ref={mainAreaRef}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative', // anchor the local overlay
                    gap: 1,
                }}
            >
                <Box sx={{ height: editorAreaHeight, minHeight: 160, overflow: 'hidden' }}>
                    {/* Top: Biln editor (no collapse) */}
                    <BilnEditorInterface
                        biln={bilnValue}
                        maxMonomers={MAX_MONOMERS}
                        isAtMonomerLimit={isAtMonomerLimit}
                        onChangeBiln={handleBilnChange}
                        hoveredResidueIdx={hoveredMonomer ? hoveredMonomer['res-idx'] : null}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={handleUndoBiln}
                        onRedo={handleRedoBiln}
                        onClear={clearData}
                        // Chains section props
                        rowMonomerLists={rowMonomerLists}
                        activeSeqIdx={uiState.activeSeqIdx}
                        onSetActiveSeqIdx={onSetActiveSeqIdx}
                        linkMap={linkMap}
                        hoveredMonomer={hoveredMonomer}
                        handleDeleteMonomerItem={handleDeleteMonomerItem}
                        onDragStart={handleDragStart}
                        onDragEnd={handleOnDragEnd}
                        handleMonomerEnter={handleMonomerEnter}
                        handleMonomerLeave={handleMonomerLeave}
                        handleDeleteSequence={handleDeleteSequence}
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={handleEditConstraint}
                        // Toolbar (link/cut) wiring
                        linkMode={viewer2DModes.linkMode}
                        bondsMode={viewer2DModes.bondsMode}
                        onToggleLinkMode={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                        onToggleCutMode={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                        canLink={canLink}
                        canUnlink={canCut}
                        // Global scaffold props
                        scaffoldTemplate={scaffoldTemplate}
                        onUploadScaffoldFile={uploadScaffoldFile}
                        onFetchScaffoldById={fetchScaffoldById}
                        onClearScaffold={handleClearScaffold}
                        scaffoldMappings={scaffoldMappings}
                        onEditScaffoldMapping={handleEditScaffoldMapping}
                    />
                </Box>

                <Box
                    role="separator"
                    aria-orientation="horizontal"
                    onMouseDown={startDrag('horizontal')}
                    sx={{
                        height: 4,
                        cursor: 'row-resize',
                        bgcolor: 'divider',
                        '&:hover': { bgcolor: 'text.secondary' },
                    }}
                />


                {/* Overlapping scaffold mappings warning */}
                <Dialog
                    open={templateOverlapOpen}
                    onClose={() => setTemplateOverlapOpen(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>Scaffold mappings overlap</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2">
                            At least two designed chains map to overlapping residue ranges on the same
                            scaffold chain. Please adjust the start/end residues so that each chain
                            uses a non-overlapping region before generating a 3D conformer.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button size="small" onClick={() => setTemplateOverlapOpen(false)}>
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Local overlay for “replace monomer” selection */}
                <ReplaceOverlay replaceSelect={replaceSelect} onCancel={cancelReplaceSelection} />

                {/* Middle: 2D and 3D viewers side-by-side */}
                <Box ref={viewerRowRef} sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 1 }}>

                    <Box
                        sx={{
                            flexBasis: `${viewerSplitRatio * 100}%`,
                            minWidth: 200,
                            maxWidth: `calc(100% - 200px)`,
                            display: 'flex',
                            flexDirection: 'column',
                            pr: 0.5,
                        }}
                    >
                        {/* 2D viewer paper */}
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header row for 2D Viewer & Controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                    2D Sketch
                                </Typography>
                                <ButtonGroup
                                    size="small"
                                    variant="text"
                                    sx={BUTTON_GROUP_SX}
                                >
                                    <Tooltip title="Link" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                                                color="inherit"
                                                disabled={!svgDepiction || viewer2DModes.bondsMode}
                                                aria-label="link-monomers"
                                            >
                                                <DeviceHubIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Unlink" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                                                color="inherit"
                                                disabled={!svgDepiction || viewer2DModes.linkMode || viewer2DModes?.canCut === false}
                                                aria-label="toggle-bonds"
                                            >
                                                <LinkOffIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Reset View" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.resetView()}
                                                color="inherit"
                                                disabled={!svgDepiction}
                                                aria-label="reset-view"
                                            >
                                                <RestartAltIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </ButtonGroup>
                            </Box>
                            {/* Canvas area */}
                            <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
                                <Viewer2D
                                    ref={viewer2DRef}
                                    svgData={svgDepiction}
                                    isShowingAtomIndices={isShowingAtomIndices}
                                    handleShowingAtomIndices={setIsShowingAtomIndices}
                                    hoveredMonomer={hoveredMonomer}
                                    handleMonomerEnter={handleMonomerEnter}
                                    handleMonomerLeave={handleMonomerLeave}
                                    onLinkMonomers={handleMonomerLinking}
                                    onBreakBond={handleBondBreaking}
                                    error={depictionError}
                                    loading={depictionLoading}
                                    onModesChange={setViewer2DModes}
                                />
                            </Box>
                        </Paper>
                    </Box>

                    <Box
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={startDrag('vertical')}
                        sx={{
                            width: 4,
                            cursor: 'col-resize',
                            bgcolor: 'divider',
                            alignSelf: 'stretch',
                            '&:hover': { bgcolor: 'text.secondary' },
                        }}
                    />

                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 200,
                            pl: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >

                        {/* 3D viewer paper */}
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header row for 3D Viewer & Controls */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {/* Left: primary actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                                    <Tooltip title={autoSync3D ? 'Updates automatically' : generateBtnTooltip} arrow placement="top">
                                        <span>
                                            <Button
                                                variant={autoSync3D ? "outlined" : "contained"}
                                                size="small"
                                                color={autoSync3D ? "primary" : "primary"}
                                                onClick={!autoSync3D ? handleManualGenerate3D : undefined}
                                                disabled={!autoSync3D && manualGenerateDisabled} // Désactivé seulement si manuel et qu'il n'y a rien à générer
                                                startIcon={autoSync3D ? <BoltIcon sx={{ animation: 'pulse 2s infinite' }} /> : <PlayArrowIcon />}
                                                className={!autoSync3D ? "!bg-slate-800/90 hover:!bg-slate-800/80 !text-slate-50" : '!bg-slate-800/90 !cursor-default !text-slate-50 !btn-disabled'}
                                                sx={{
                                                    textTransform: 'none',
                                                    paddingX: 1,
                                                    fontWeight: 500,
                                                    minWidth: 120,
                                                    maxHeight: 26,
                                                    '@keyframes pulse': {
                                                        '0%': { color: 'inherit' },
                                                        '50%': { color: 'yellow' },
                                                        '100%': { color: 'inherit' },
                                                    }
                                                }}
                                            >
                                                {autoSync3D ? "Live Preview" : "Generate 3D"}
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip
                                        title={
                                            anyScaffoldEnabled
                                                ? 'Auto sync is disabled while a scaffold mapping is active.'
                                                : autoSync3D
                                                    ? 'Disable automatic updates'
                                                    : 'Enable automatic updates'
                                        }
                                        arrow
                                        placement="top"
                                    >
                                        <FormControlLabel
                                            control={
                                                <span>
                                                    <Switch
                                                        size="small"
                                                        checked={autoSync3D}
                                                        onChange={handleAutoSyncChange}
                                                        inputProps={{ 'aria-label': 'toggle automatic 3D sync' }}
                                                        disabled={anyScaffoldEnabled}
                                                    />
                                                </span>
                                            }
                                            label="Auto sync"
                                            sx={{
                                                m: 0,
                                                ml: 0.5,
                                                color: autoSync3D ? 'primary.main' : 'text.secondary',
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: 13,
                                                    fontWeight: autoSync3D ? 500 : 400,
                                                    transition: 'all 0.3s ease'
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                </Box>

                                {/* <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} /> */}

                                {/* Right: canvas controls */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                                    {/* Canvas container */}
                                    <ButtonGroup
                                        size="small"
                                        variant="text"
                                        sx={BUTTON_GROUP_SX}
                                    >
                                        <Tooltip title="Representation" arrow placement='top'>
                                            <Button
                                                onClick={(e) => setRepMenuEl(e.currentTarget)}
                                                color="inherit"
                                                aria-haspopup="menu"
                                                aria-controls={repMenuOpen ? 'rep-menu' : undefined}
                                                aria-expanded={repMenuOpen ? 'true' : undefined}
                                            >
                                                <CategoryIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Color by" arrow placement='top'>
                                            <Button
                                                onClick={(e) => setColorMenuEl(e.currentTarget)}
                                                color="inherit"
                                                aria-haspopup="menu"
                                                aria-controls={colorMenuOpen ? 'color-menu' : undefined}
                                                aria-expanded={colorMenuOpen ? 'true' : undefined}
                                            >
                                                <PaletteIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Reset 3D View" arrow placement='top'>
                                            <Button
                                                onClick={(e) => setReset3DEl(e.currentTarget)}
                                                color="inherit"
                                                aria-haspopup="menu"
                                                aria-controls={reset3DOpen ? 'reset3D-menu' : undefined}
                                                aria-expanded={reset3DOpen ? 'true' : undefined}
                                                aria-label="reset-view"
                                            >
                                                <RestartAltIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>


                                    </ButtonGroup>
                                </Box>

                                {/* MENUS */}
                                {/* Representation menu */}
                                <Menu
                                    id="rep-menu"
                                    anchorEl={repMenuEl}
                                    open={repMenuOpen}
                                    onClose={() => setRepMenuEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    sx={{ '& .MuiMenu-paper': { maxHeight: 400 }, my: 0.25 }}

                                    MenuListProps={{ dense: true }}
                                >
                                    {/* Title */}
                                    <MenuItem
                                        disabled
                                        sx={{
                                            cursor: 'default',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            '&.Mui-disabled': { opacity: 1 },
                                        }}
                                    >
                                        Representation
                                    </MenuItem>
                                    <Divider sx={{ my: 0.5 }} />
                                    {/* Compact items with subtle dividers */}
                                    {MolstarSchemes.representationSchemes.flatMap((rep, idx, arr) => {
                                        const items = [
                                            <MenuItem
                                                key={rep.id}
                                                onClick={() => {
                                                    viewer3DRef.current?.setRepresentation?.(rep.id);
                                                    setRepMenuEl(null);
                                                }}
                                                sx={{ minHeight: 24, px: 1.5, fontSize: 13 }}
                                            >
                                                {rep.label}
                                            </MenuItem>
                                        ];
                                        if (idx < arr.length - 1) {
                                            items.push(
                                                <Divider key={`${rep.id}-div`} component="li" sx={{ my: 0, opacity: 0.6 }} />
                                            );
                                        }
                                        return items;
                                    })}
                                </Menu>

                                {/* Color menu */}
                                <Menu
                                    id="color-menu"
                                    anchorEl={colorMenuEl}
                                    open={colorMenuOpen}
                                    onClose={() => setColorMenuEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    MenuListProps={{ dense: true }}
                                    sx={{ '& .MuiMenu-paper': { maxHeight: 400 }, my: 0.25 }}
                                >
                                    {/* Title */}
                                    <MenuItem
                                        disabled
                                        sx={{
                                            cursor: 'default',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            '&.Mui-disabled': { opacity: 1 },
                                        }}
                                    >
                                        Color by
                                    </MenuItem>
                                    <Divider sx={{ my: 0.5 }} />
                                    {MolstarSchemes.colorBySchemes.flatMap((color, idx, arr) => {
                                        const items = [
                                            <MenuItem
                                                key={color.id}
                                                onClick={() => {
                                                    viewer3DRef.current?.setColorScheme?.(color.id);
                                                    setColorMenuEl(null);
                                                }}
                                                sx={{ minHeight: 28, py: 0, px: 1.5, fontSize: 13 }}
                                            >
                                                {color.label}
                                            </MenuItem>
                                        ];
                                        if (idx < arr.length - 1) {
                                            items.push(
                                                <Divider key={`${color.id}-div`} component="li" sx={{ my: 0, opacity: 0.6 }} />
                                            );
                                        }
                                        return items;
                                    })}
                                </Menu>

                                {/* Reset 3D View menu */}
                                <Menu
                                    id="reset3D-menu"
                                    anchorEl={reset3DEl}
                                    open={reset3DOpen}
                                    onClose={() => setReset3DEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    MenuListProps={{ dense: true }}
                                    sx={{ '& .MuiMenu-paper': { maxHeight: 400 }, my: 0.25 }}

                                >
                                    {/* Title */}
                                    <MenuItem
                                        disabled
                                        sx={{
                                            cursor: 'default',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            '&.Mui-disabled': { opacity: 1 },
                                        }}
                                    >
                                        Reset 3D View
                                    </MenuItem>
                                    <Divider sx={{ my: 0.5 }} />
                                    {MolstarSchemes.resetViewScheme.flatMap((reset, idx, arr) => {
                                        const items = [
                                            <MenuItem
                                                key={reset.id}
                                                onClick={() => {
                                                    if (reset.id === 'reset-zoom') viewer3DRef.current?.resetZoom?.();
                                                    else if (reset.id === 'orient-axes') viewer3DRef.current?.orientAxes?.();
                                                    else if (reset.id === 'reset-axes') viewer3DRef.current?.resetAxes?.();
                                                    setReset3DEl(null);
                                                }}
                                                sx={{ minHeight: 28, py: 0, px: 1.5, fontSize: 13 }}
                                            >
                                                {reset.label}
                                            </MenuItem>
                                        ];
                                        if (idx < arr.length - 1) {
                                            items.push(
                                                <Divider key={`${reset.id}-div`} component="li" sx={{ my: 0, opacity: 0.6 }} />
                                            );
                                        }
                                        return items;
                                    })}
                                </Menu>

                            </Box>

                            {/* Canvas area */}
                            <Box sx={{ flex: 1, minHeight: 220, position: 'relative', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                                {structureLoading && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: 'rgba(255,255,255,0.6)',
                                            zIndex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <CircularProgress size={48} />
                                    </Box>
                                )}
                                {!structureLoading && !structurePDB && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            bgcolor: 'background.paper',
                                            zIndex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            px: 2,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {(() => {
                                            const err = generate3DError;
                                            const isTemplateFail =
                                                typeof err === 'string' &&
                                                err.includes('constraints');

                                            if (!err) {
                                                // No error, just no data
                                                return (
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1.1rem',
                                                            lineHeight: 1.75,
                                                            fontWeight: 400,
                                                        }}
                                                    >
                                                        No data to display.
                                                    </Typography>
                                                );
                                            }

                                            if (isTemplateFail) {
                                                // Template-based generation failed, show warning style + hint
                                                return (
                                                    <Box>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: 'warning.main',
                                                                fontSize: '1.1rem',
                                                                lineHeight: 1.75,
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {err}
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                mt: 0.75,
                                                                color: 'text.secondary',
                                                                fontSize: '0.9rem',
                                                            }}
                                                        >
                                                            Please try to relax your constraints and run the generation again.
                                                        </Typography>
                                                    </Box>
                                                );
                                            }

                                            // Any other error: show in alarming color
                                            return (
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        color: 'error.main',
                                                        fontSize: '1.1rem',
                                                        lineHeight: 1.6,
                                                        fontWeight: 500,
                                                        whiteSpace: 'pre-wrap',
                                                    }}
                                                >
                                                    {`${err}`}
                                                </Typography>
                                            );
                                        })()}
                                    </Box>
                                )}
                                <Viewer3D
                                    ref={viewer3DRef}
                                    pdbRawData={structurePDB}
                                    hoveredMonomer={hoveredMonomer}
                                    handleMonomerHover={handleMonomerHover}
                                    defaultRepresentation="ball-and-stick"
                                    defaultColorScheme="element-symbol"
                                    height="100%"
                                    width="100%"
                                    error={generate3DError}
                                    isGenerating3D={structureLoading}
                                />
                            </Box>
                        </Paper>
                    </Box>

                </Box>
            </Box>

            {/* Snackbar alert when BILN exceeds the maximum allowed length */}
            {/* NEW: modal alert */}
            <Dialog
                open={limitDialog.open}
                onClose={() => setLimitDialog({ open: false, message: '' })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Monomer limit reached</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary">
                        {limitDialog.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setLimitDialog({ open: false, message: '' })}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>



    );
};

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);
