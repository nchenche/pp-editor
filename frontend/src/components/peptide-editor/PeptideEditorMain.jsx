import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

import { SequenceInput, SequenceEditorPanel } from './SequenceInput';
import BilnEditorInterface from './BilnEditorInterface';
// import { MonomerTrack } from './MonomerTrack/MonomerTrack';
import SequenceTrackToolbar from './ChainComponent/ChainsToolbar';

import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
import { MolstarSchemes } from './Viewer3D/molstar/Schemes';

import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';
import { buildLinkMapFromBiln, setMonomerSequences, deriveSeqCount, reconcileActiveSeqIdx } from '../../../src/utils/bilnUtils';

import { Box, Grid2, Paper, Typography, FormControlLabel, Switch } from '@mui/material';
import { Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';




const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const initBiln = 'P-E-P-T-C(1,3)-I-D-E.A-G-V-I-C(1,3)';  //  A-C-K-A-C


// Read persisted editor state once (sync) to avoid flicker on mount/route switch
function readPersistedDesign() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('design-peptide-v1');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            biln: typeof parsed.biln === 'string' ? parsed.biln : null,
            constraints: Array.isArray(parsed.constraints) ? parsed.constraints : null,
        };
    } catch {
        return null;
    }
}

const PeptideEditorMainInner = ({ isActive, onOutputChange, uiState, setUiState, onBeginReplaceSelection, onCancelReplaceSelection }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [isEditorOpen, setIsEditorOpen] = useState(true);
    // const [seqHelpOpen, setSeqHelpOpen] = useState(false);

    const [repMenuEl, setRepMenuEl] = useState(null);
    const [colorMenuEl, setColorMenuEl] = useState(null);
    const [reset3DEl, setReset3DEl] = useState(null);
    const repMenuOpen = Boolean(repMenuEl);
    const colorMenuOpen = Boolean(colorMenuEl);
    const reset3DOpen = Boolean(reset3DEl);

    const persisted = useRef(readPersistedDesign()).current;
    const initialBiln = persisted?.biln ?? initBiln;
    const [bilnValue, setBilnValue] = useState(() => initialBiln);  // hydrate from storage first

    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];
    const smiles = depictionData?.smiles || '';
    const helm = depictionData?.helm || '';

    // Parse BILN to decide if it’s “committable” (no trailing sep, no open parenthesis)
    const analyzeBiln = useCallback((biln) => {
        const s = (biln || '').trim();
        if (!s) return { committable: true, tokenCount: 0 };
        // trailing separator or open paren/comma -> not committable
        if (/[-.\(,]\s*$/.test(s)) return { committable: false, tokenCount: 0 };
        // parentheses balance (simple, non-nested expected)
        let depth = 0;
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '(') depth++;
            else if (ch === ')') { depth--; if (depth < 0) return { committable: false, tokenCount: 0 }; }
        }
        if (depth !== 0) return { committable: false, tokenCount: 0 };
        // count residues: remove paren content then split on '.' or '-' and count non-empty tokens
        const noParen = s.replace(/\([^)]*\)/g, '');
        const tokenCount = noParen.split(/[.-]+/).filter(Boolean).length;
        return { committable: true, tokenCount };
    }, []);

    // Only this “committed” BILN drives depiction/3D
    const [committedBiln, setCommittedBiln] = useState(initialBiln);

    // --- BILN history (undo up to 10) ---
    const MAX_HISTORY = 20;
    const [bilnHistory, setBilnHistory] = useState([initialBiln]);
    const [bilnFuture, setBilnFuture] = useState([]);
    const didInitHistoryRef = useRef(false);
    const isUndoingRef = useRef(false);
    const isRedoingRef = useRef(false);

    // Viewer refs and states
    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });
    const viewer3DRef = useRef(null);
    const [autoSync3D, setAutoSync3D] = useState(true);

    const canLink = !!svgDepiction && !viewer2DModes.bondsMode;
    const canCut = !!svgDepiction && !viewer2DModes.linkMode && viewer2DModes?.canCut !== false;

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

    // Track bilnValue changes into history unless undo/redo is in progress
    useEffect(() => {
        // Initialize history on first render
        if (!didInitHistoryRef.current) {
            didInitHistoryRef.current = true;
            setBilnHistory([bilnValue]);
            return;
        }
        // Skip if change is due to undo/redo
        if (isUndoingRef.current || isRedoingRef.current) {
            isUndoingRef.current = false;
            isRedoingRef.current = false;
            return;
        }
        // Normal edit: push to history
        setBilnHistory(prev => {
            if (prev[prev.length - 1] === bilnValue) return prev;
            const next = [...prev, bilnValue];
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
        });
        setBilnFuture([]); // Any new user edit invalidates the redo stack
    }, [bilnValue]);

    const canUndo = bilnHistory.length > 1;
    const canRedo = bilnFuture.length > 0;
    const handleUndoBiln = () => {
        if (!canUndo) return;
        const current = bilnHistory[bilnHistory.length - 1];
        const prev = bilnHistory[bilnHistory.length - 2];
        setBilnHistory(bilnHistory.slice(0, -1));
        setBilnFuture(f => [current, ...f]);
        isUndoingRef.current = true;
        setBilnValue(prev);
    };

    const handleRedoBiln = () => {
        if (!canRedo) return;
        const [next, ...rest] = bilnFuture;
        setBilnFuture(rest);
        setBilnHistory(h => {
            const merged = [...h, next];
            return merged.length > MAX_HISTORY ? merged.slice(merged.length - MAX_HISTORY) : merged;
        });
        isRedoingRef.current = true;
        setBilnValue(next);
    };

    // Lift state up: output data
    useEffect(() => {
        if (onOutputChange) {
            onOutputChange({
                biln: bilnValue,
                helm: helm,
                smiles: smiles,
                structure3D: structureOutput?.pdb || '',
            });
        }
    }, [bilnValue, smiles, helm, structureOutput, onOutputChange]);

    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [hoveredMonomer, setHoveredMonomer] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [bilnValue]);
    // const rowMonomerLists = useMemo(() => setMonomerSequences(bilnValue, monomers), [monomers]);
    const rowMonomerLists = useMemo(() => setMonomerSequences(committedBiln, monomers), [monomers]);


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
        setBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        setIsDragging,
        setHoveredMonomer
    });

    const { handleMonomerEnter, handleMonomerLeave, handleMonomerHover } = useUIHandlers({ monomers, setHoveredMonomer, isDragging });

    const [constraintsMode, setConstraintsMode] = useState(false);  // constraintsBySeq: Array< Array<char> > matching rowMonomerLists layout    
    const [constraintsBySeq, setConstraintsBySeq] = useState(() => persisted?.constraints ?? []);  // ensure constraints length matches monomers length per sequence

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

    const canGenerate3D = useMemo(() => {
        if (!committedBiln) return false;
        const { tokenCount } = analyzeBiln(committedBiln);
        return tokenCount > 0 && secstructString.length === tokenCount;
    }, [committedBiln, secstructString, analyzeBiln]);

    // Debounced generate3D trigger and last sent guard
    const lastGenRef = useRef({ biln: null, ss: null });
    const triggerGenerate = useCallback((biln, ss) => {
        const prev = lastGenRef.current;
        if (prev.biln === biln && prev.ss === ss) return;
        lastGenRef.current = { biln, ss };
        generate3D(biln, ss);
    }, [generate3D]);


    const handleAutoSyncChange = useCallback((_, checked) => setAutoSync3D(!!checked), []);
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
        addMonomer: (monomer, options) => addMonomerToBiln(monomer, {
            mode: options?.mode,
            link: options?.link,
            activeSequenceIdx: options?.activeSequenceIdx ?? uiState.activeSeqIdx,
            insert: options?.insert,
        }),
        replaceMonomer: (m, opts) => replaceMonomerInBiln(m, opts),
        endReplaceSelection: () => { cancelReplaceSelection(); },
        setBiln: (biln) => setBilnValue(biln),
        getBiln: () => bilnValue,
    }), [addMonomerToBiln, uiState, bilnValue]);

    function loadData(newBiln) {
        const params = {
            sequence: newBiln,
            mode: 'rdkit',
            'show-atom-indices': isShowingAtomIndices,
        }

        // const query = `?sequence=${newBiln}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        fetchDepiction(params);
    }


    // Update committedBiln only when BILN is committable (prevents “separator-only” and open '(' churn)
    useEffect(() => {
        const { committable } = analyzeBiln(bilnValue);
        if (!committable) return; // keep previous committedBiln
        if (bilnValue !== committedBiln) setCommittedBiln(bilnValue);
    }, [bilnValue, committedBiln, analyzeBiln]);

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
    const generateBtnTooltip = autoSync3D
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
        setBilnValue(newBiln);
    }

    useEffect(() => {
        const payload = JSON.stringify({ biln: bilnValue, constraints: constraintsBySeq });
        const id = setTimeout(() => localStorage.setItem('design-peptide-v1', payload), 200);
        return () => clearTimeout(id);
    }, [bilnValue, constraintsBySeq]);


    // Compact, subtle button style for the 2D toolbar
    // Compact, subtle button style for the 2D/3D toolbars (icon-only)
    const toolbarBtnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 24,
        minWidth: 32,         // tighter buttons for icon-only
        px: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiSvgIcon-root': {
            // fontSize: 16,
            color: 'currentColor',
        },
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
        '&.Mui-disabled': {
            color: 'text.disabled',
            borderColor: 'divider',
        },
        '&.Mui-disabled .MuiSvgIcon-root': {
            color: 'text.disabled',
        },
    };

    // Portal root provided by DesignPageLayoutMUI (right panel)
    const { rootRef, overlayActive, setOverlayActive } = useOverlayPortal();

    // Keep layout highlight in sync with overlay visibility
    useEffect(() => {
        setOverlayActive?.(replaceSelect.open);
        return () => setOverlayActive?.(false);
    }, [replaceSelect.open, overlayActive, setOverlayActive]);

    const replaceOverlay = replaceSelect.open && rootRef?.current
        ? createPortal(
            <Box
                role="dialog"
                aria-modal="true"
                aria-label="Select a replacement monomer"
                onClick={cancelReplaceSelection}
                sx={{
                    position: 'absolute',
                    top: -0,
                    // transform: 'translateZ(10px)', // fix for MUI modal + portal + z-index bug
                    inset: 0,
                    zIndex: (t) => t.zIndex.modal,  // t.zIndex.modal
                    bgcolor: 'rgba(0,0,0,0.44)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Paper
                    elevation={3}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        p: 2,
                        maxWidth: 460,
                        width: '100%',
                        textAlign: 'center',
                        border: 1,
                        borderColor: 'divider',
                        transform: 'translateY(-100%)', // shift up by 100% of its height
                    }}
                >
                    <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        Replacement selection active
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {replaceSelect.sourceMonomer
                            ? `Choose a monomer from the Monomer Library to replace ${replaceSelect.sourceMonomer.pdbName} (idx ${replaceSelect.sourceMonomer['res-idx']}).`
                            : 'Choose a monomer from the Monomer Library.'}
                    </Typography>
                    <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Button variant="outlined" size="small" onClick={cancelReplaceSelection}>
                            Cancel
                        </Button>
                    </Box>
                </Paper>
            </Box>,
            rootRef.current
        )
        : null;

    const [editorAreaHeight, setEditorAreaHeight] = useState(320);   // px
    const [viewerSplitRatio, setViewerSplitRatio] = useState(0.5);   // 0..1
    const mainAreaRef = useRef(null);
    const viewerRowRef = useRef(null);

    useLayoutEffect(() => {
        if (!mainAreaRef.current) return;
        const { height } = mainAreaRef.current.getBoundingClientRect();
        // Keep at least 240px, but let it initially consume ~45% of the available column.
        setEditorAreaHeight(Math.max(240, height * 0.50));
    }, []);
    const isDraggingRef = useRef({ type: null });
    const startDrag = (type) => (e) => {
        e.preventDefault();
        isDraggingRef.current = { type };
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    };
    const onDrag = (e) => {
        const { type } = isDraggingRef.current;
        if (!type) return;

        if (type === 'horizontal') {
            if (!mainAreaRef.current) return;
            const rect = mainAreaRef.current.getBoundingClientRect();
            const next = Math.min(Math.max(e.clientY - rect.top, 140), rect.height - 140);
            setEditorAreaHeight(next);
        } else if (type === 'vertical') {
            if (!viewerRowRef.current) return;
            const rect = viewerRowRef.current.getBoundingClientRect();
            const minWidth = 200; // same as each panel’s minWidth
            const x = Math.min(Math.max(e.clientX - rect.left, minWidth), rect.width - minWidth);
            setViewerSplitRatio(x / rect.width);
        }
    };
    const stopDrag = () => {
        isDraggingRef.current = { type: null };
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    };



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
                        onChangeBiln={handleBilnChange}
                        hoveredResidueIdx={hoveredMonomer ? hoveredMonomer['res-idx'] : null}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={handleUndoBiln}
                        onRedo={handleRedoBiln}
                        onClear={() => handleBilnChange('')}
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
                        constraintsMode={constraintsMode}
                        onToggleConstraintsMode={() => setConstraintsMode((m) => !m)}
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={handleEditConstraint}
                        // Toolbar (link/cut) wiring
                        linkMode={viewer2DModes.linkMode}
                        bondsMode={viewer2DModes.bondsMode}
                        onToggleLinkMode={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                        onToggleCutMode={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                        canLink={canLink}
                        canUnlink={canCut}
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


                {/* Sequences help dialog */}
                {/* <Dialog open={seqHelpOpen} onClose={() => setSeqHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Working with sequences</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <ul>
                        <li><strong>Append</strong> adds monomers at the end of the active sequence.</li>
                        <li><strong>Prepend</strong> adds monomers at the start of the active sequence.</li>
                        <li><strong>New chain</strong> creates a new chain and adds monomers there.</li>
                        <li>Use <strong>Link</strong> to connect residues and <strong>Cut</strong> to break bonds in the 2D sketch.</li>
                        <li><strong>Target sequence</strong> selects which sequence receives new monomers from the library.</li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSeqHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog> */}

                {/* Local overlay for “replace monomer” selection */}
                {replaceOverlay}

                {/* Middle: 2D and 3D viewers side-by-side */}
                <Box ref={viewerRowRef} sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 1 }}>
                    {/* <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', // always 50% / 50%
                            gap: 1,
                            height: '100%',
                            minHeight: 0,
                            minWidth: 0,
                            alignItems: 'stretch',
                        }}
                    > */}

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
                                    sx={{ '& .MuiButton-root': toolbarBtnSx }}
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
                                        title={autoSync3D ? 'Disable automatic updates' : 'Enable automatic updates'}
                                        arrow
                                        placement="top"
                                    >
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={autoSync3D}
                                                    onChange={handleAutoSyncChange}
                                                    inputProps={{ 'aria-label': 'toggle automatic 3D sync' }}
                                                />
                                            }
                                            // On utilise "Title Case" pour le texte, plus doux que les majuscules
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
                                        sx={{ '& .MuiButton-root': toolbarBtnSx }}
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
                                {!structureLoading && !structureOutput?.pdb && (
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
                                        {/* Show message about 3D generation status */}
                                        <Typography
                                            variant="body1"
                                            sx={{ color: 'text.secondary', fontSize: '1.25rem', lineHeight: 1.75, fontWeight: 400 }}
                                        >
                                            No data
                                        </Typography>
                                    </Box>
                                )}
                                <Viewer3D
                                    ref={viewer3DRef}
                                    pdbRawData={structureOutput?.pdb}
                                    hoveredMonomer={hoveredMonomer}
                                    handleMonomerHover={handleMonomerHover}
                                    defaultRepresentation="ball-and-stick"
                                    defaultColorScheme="residue-name"
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
        </Box>



    );
};

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);
