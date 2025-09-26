import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';

import { SequenceInput, SequenceEditorPanel } from './SequenceInput';

import { MonomerTrack } from './MonomerTrack/MonomerTrack';
import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
// import { MolstarApp } from './Viewer3D/molstar/MolstarApp';

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

const API_BASE_URL = 'http://0.0.0.0:5000';


const PeptideEditorMainInner = ({ onOutputChange, uiState, setUiState }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [isEditorOpen, setIsEditorOpen] = useState(true);

    const [bilnValue, setBilnValue] = useState('A-C');  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];
    const smiles = depictionData?.smiles || '';
    const helm = depictionData?.helm || '';

    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });

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

    const { addMonomerToBiln, handleDeleteMonomerItem, handleMonomerLinking, handleBondBreaking, handleOnDragEnd, handleDragStart
    } = useBilnHandlers({
        bilnValue,
        setBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        setIsDragging,
        setHoveredMonomer,
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
    const toolbarBtnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 24,
        px: 0.75,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiSvgIcon-root': { fontSize: 16, color: 'text.secondary' },
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateRows: 'auto minmax(100px, 1fr) minmax(100px, 25%)',
                gap: 1,
                height: '100%',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            {/* Top: Collapsible container for the sequence editor */}
            <Paper variant="outlined" sx={{ p: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
                        Expert editor
                    </Typography>
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

            {/* Middle: 2D and 3D viewers side-by-side */}
            <Box sx={{ minHeight: 0 }}>
                <Grid2 container spacing={1} sx={{ height: '100%', minHeight: 0 }}>
                    <Grid2 item xs={12} md={6} sx={{ height: '100%', minHeight: 0 }}>
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header row: title + tools on the right */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                    2D Sketch
                                </Typography>
                                <ButtonGroup
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        '& .MuiButton-root': toolbarBtnSx,
                                        '& .MuiButton-startIcon': { mr: 0.5 },
                                    }}
                                >
                                    <Button
                                        onClick={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                                        color="inherit"
                                        startIcon={<DeviceHubIcon fontSize="inherit" />}
                                        disabled={!svgDepiction || viewer2DModes.bondsMode}
                                        aria-label="link-monomers"
                                    >
                                        Link
                                    </Button>
                                    <Button
                                        onClick={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                                        color="inherit"
                                        startIcon={<LinkOffIcon fontSize="inherit" />}
                                        disabled={!svgDepiction || viewer2DModes.linkMode || viewer2DModes?.canCut === false}
                                        aria-label="toggle-bonds"
                                    >
                                        Cut
                                    </Button>
                                    <Button
                                        onClick={() => viewer2DRef.current?.resetView()}
                                        color="inherit"
                                        startIcon={<RestartAltIcon fontSize="inherit" />}
                                        disabled={!svgDepiction}
                                        aria-label="reset-view"
                                    >
                                        Reset
                                    </Button>
                                </ButtonGroup>
                            </Box>

                            {/* Canvas area */}
                            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                                    onModesChange={setViewer2DModes}   // NEW: keep buttons in sync
                                />
                            </Box>
                        </Paper>
                    </Grid2>
                    <Grid2 item xs={12} md={6} sx={{ height: '100%', minHeight: 0 }}>
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                3D Viewer
                            </Typography>
                            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                {/* <Viewer3D ... /> */}
                            </Box>
                        </Paper>
                    </Grid2>
                </Grid2>
            </Box>

            {/* Bottom: Sequence tracks (scrollable) */}
            <Paper
                variant="outlined"
                sx={{ p: 1, height: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}
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