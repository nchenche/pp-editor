import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

import { SequenceInput, SequenceEditorPanel } from './SequenceInput';
import { MonomerTrack } from './MonomerTrack/MonomerTrack';
import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
import { MolstarSchemes } from './Viewer3D/molstar/Schemes';


import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';

import { buildLinkMapFromBiln, setMonomerSequences, deriveSeqCount, reconcileActiveSeqIdx } from '../../../src/utils/bilnUtils';

import { Box, Grid2, Paper, Typography } from '@mui/material';

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
console.log('Using API_BASE_URL:', API_BASE_URL);

const initBiln = 'A-F-R-I-C-A';  //  A-C-K-A-C

const PeptideEditorMainInner = ({ onOutputChange, uiState, setUiState }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [isEditorOpen, setIsEditorOpen] = useState(true);

    const [repMenuEl, setRepMenuEl] = useState(null);
    const [colorMenuEl, setColorMenuEl] = useState(null);
    const [reset3DEl, setReset3DEl] = useState(null);
    const repMenuOpen = Boolean(repMenuEl);
    const colorMenuOpen = Boolean(colorMenuEl);
    const reset3DOpen = Boolean(reset3DEl);

    const [bilnValue, setBilnValue] = useState(initBiln);  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];
    const smiles = depictionData?.smiles || '';
    const helm = depictionData?.helm || '';

    // --- BILN history (undo up to 10) ---
    const MAX_HISTORY = 20;
    const [bilnHistory, setBilnHistory] = useState(['A-F-R-I-C-A']);
    const [bilnFuture, setBilnFuture] = useState([]);
    const didInitHistoryRef = useRef(false);
    const isUndoingRef = useRef(false);
    const isRedoingRef = useRef(false);

    // Viewer refs and states
    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });
    const viewer3DRef = useRef(null);

    const [replaceSelect, setReplaceSelect] = useState({ open: false, mode: null, sourceMonomer: null });
    const beginReplaceSelection = useCallback((mode, sourceMonomer) => {
        setReplaceSelect({ open: true, mode, sourceMonomer });
    }, []);

    const cancelReplaceSelection = useCallback(() => {
        setReplaceSelect({ open: false, mode: null, sourceMonomer: null });
    }, []);

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
    const rowMonomerLists = useMemo(() => setMonomerSequences(bilnValue, monomers), [monomers]);

    const { addMonomerToBiln, handleDeleteMonomerItem, handleMonomerLinking, handleBondBreaking, handleOnDragEnd, handleDragStart, handleDeleteSequence
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
        setBiln: (biln) => setBilnValue(biln),
        getBiln: () => bilnValue,
    }), [addMonomerToBiln, uiState, bilnValue]);

    const monomerTrack = useMemo(() => (
        <MonomerTrack
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
        />
    ), [
        rowMonomerLists,
        uiState.activeSeqIdx,
        linkMap,
        hoveredMonomer,
        handleDeleteMonomerItem,
        handleDragStart,
        handleOnDragEnd,
        handleMonomerEnter,
        handleMonomerLeave,
        beginReplaceSelection
    ]);

    function loadData(newBiln) {
        const params = {
            sequence: newBiln,
            mode: 'rdkit',
            'show-atom-indices': isShowingAtomIndices,
        }

        // const query = `?sequence=${newBiln}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        const loadAndGenerate = () => {
            fetchDepiction(params);
            generate3D(newBiln);
        };
        loadAndGenerate();
    }

    useEffect(() => {
        if (!bilnValue) {
            setMonomerSequences(bilnValue, []); // clear sequences
            setDepictionData({ svg: '', monomers: [], smiles: '', helm: '' });
            setStructureOutput({ pdb: '' });
            return;
        }
        loadData(bilnValue);
    }, [bilnValue]);  // [bilnValue, isShowingAtomIndices]

    useEffect(() => {
        const count = deriveSeqCount(bilnValue);
        setUiState(prev => {
            const nextIdx = reconcileActiveSeqIdx(prev.activeSeqIdx, count);
            if (prev.seqNumber === count && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: count, activeSeqIdx: nextIdx };
        });
    }, [bilnValue, setUiState]);

    function handleBilnChange(newBiln) {
        setBilnValue(newBiln);
    }


    // Compact, subtle button style for the 2D toolbar
    // Compact, subtle button style for the 2D/3D toolbars (icon-only)
    const toolbarBtnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 24,
        minWidth: 34,         // tighter buttons for icon-only
        px: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiSvgIcon-root': {
            fontSize: 16,
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
                    top: 0,
                    transform: 'translateZ(-50px)', // fix for MUI modal + portal + z-index bug
                    inset: 0,
                    zIndex: (t) => t.zIndex.modal,
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
                    sx={{ p: 2, maxWidth: 460, width: '100%', textAlign: 'center', border: 1, borderColor: 'divider' }}
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

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateRows: 'auto minmax(100px, 1fr) minmax(100px, 30%)',
                gap: 2,
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
                position: 'relative', // anchor the local overlay
            }}
        >
            {/* Top: Collapsible container for the sequence editor */}
            <Paper variant="outlined" sx={{ p: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Header row: left (toggle + title) | right (actions) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    {/* Left: toggle + title (click to expand/collapse) */}
                    <Box
                        role="button"
                        aria-expanded={isEditorOpen}
                        tabIndex={0}
                        onClick={() => setIsEditorOpen(v => !v)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditorOpen(v => !v); } }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                    >
                        <IconButton
                            size="small"
                            sx={{
                                transform: isEditorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 120ms ease',
                            }}
                            aria-label={isEditorOpen ? 'Collapse editor' : 'Expand editor'}
                        >
                            <ExpandMoreIcon />
                        </IconButton>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                            BILN editor
                        </Typography>
                    </Box>

                    {/* Right: actions (Undo, Redo, Clear) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Undo" arrow placement="top">
                            <span>
                                <IconButton
                                    size="small"
                                    color="inherit"
                                    onClick={handleUndoBiln}
                                    disabled={!canUndo}
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <UndoIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Redo" arrow placement="top">
                            <span>
                                <IconButton
                                    size="small"
                                    color="inherit"
                                    onClick={handleRedoBiln}
                                    disabled={!canRedo}
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <RedoIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Clear sequence" arrow placement="top">
                            <span>
                                <IconButton
                                    size="small"
                                    color="inherit"
                                    onClick={() => handleBilnChange('')}
                                    disabled={!bilnValue}
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <DeleteSweepIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>

                <Collapse in={isEditorOpen} unmountOnExit timeout="auto">
                    <Box sx={{ mt: 1 }}>
                        <SequenceEditorPanel
                            biln={bilnValue}
                            onChangeBiln={handleBilnChange}
                            disableInternalCollapse
                            hideInternalHeader
                        />
                    </Box>
                </Collapse>
            </Paper>

            {/* Local overlay for “replace monomer” selection */}
            {replaceOverlay}

            {/* Middle: 2D and 3D viewers side-by-side */}
            <Box sx={{ minHeight: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', // always 50% / 50%
                        gap: 1,
                        height: '100%',
                        minHeight: 0,
                        minWidth: 0,
                        alignItems: 'stretch',
                    }}
                >
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
                                variant="outlined"
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

                                <Tooltip title="Cut" arrow placement='top'>
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

                                <Tooltip title="Reset" arrow placement='top'>
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

                    <Paper
                        variant="outlined"
                        sx={{ p: 1, height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    >
                        {/* Header row for 3D Viewer & Controls */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                3D Viewer
                            </Typography>
                            <ButtonGroup
                                size="small"
                                variant="outlined"
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




                            </ButtonGroup>
                        </Box>
                        {/* Canvas area */}
                        <Box sx={{ flex: 1, minHeight: 220, position: 'relative', width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
            {/* Bottom: Sequence tracks (scrollable) */}
            <Paper
                variant="outlined"
                sx={{ p: 1, height: '100%', minHeight: 0, overflowY: 'auto' }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Sequences
                </Typography>
                {monomerTrack}
            </Paper>
        </Box>
    );
};

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);
