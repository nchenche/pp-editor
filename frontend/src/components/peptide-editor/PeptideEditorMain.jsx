import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';

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

const API_BASE_URL = 'http://0.0.0.0:5000';


const PeptideEditorMainInner = ({ onOutputChange, uiState, setUiState }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [isEditorOpen, setIsEditorOpen] = useState(true);

    const [repMenuEl, setRepMenuEl] = useState(null);
    const [colorMenuEl, setColorMenuEl] = useState(null);
    const repMenuOpen = Boolean(repMenuEl);
    const colorMenuOpen = Boolean(colorMenuEl);

    const [bilnValue, setBilnValue] = useState('A-F-R-I-C-A');  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];
    const smiles = depictionData?.smiles || '';
    const helm = depictionData?.helm || '';

    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });
    const viewer3DRef = useRef(null);

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
        color: 'text.secondary',            // default
        borderColor: 'divider',
        '& .MuiSvgIcon-root': {
            fontSize: 16,
            color: 'currentColor',            // let icon follow button color
        },
        '& .MuiButton-startIcon': { mr: 0.5 },
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },

        // Disabled styling (button + icon shaded)
        '&.Mui-disabled': {
            color: 'text.disabled',
            borderColor: 'divider',
        },
        '&.Mui-disabled .MuiSvgIcon-root': {
            color: 'text.disabled',
        },
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateRows: 'auto minmax(100px, 1fr) minmax(100px, 30%)',
                gap: 2,
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
                                sx={{
                                    '& .MuiButton-root': toolbarBtnSx,    // uses disabled shading above
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
                                sx={{
                                    '& .MuiButton-root': toolbarBtnSx,    // uses disabled shading above
                                }}
                            >
                                <Button
                                    onClick={(e) => setRepMenuEl(e.currentTarget)}
                                    color="inherit"
                                    startIcon={<CategoryIcon fontSize="inherit" />}
                                    disabled={false}
                                    aria-haspopup="menu"
                                    aria-controls={repMenuOpen ? 'rep-menu' : undefined}
                                    aria-expanded={repMenuOpen ? 'true' : undefined}
                                >
                                    Representation
                                </Button>
                                <Menu
                                    id="rep-menu"
                                    anchorEl={repMenuEl}
                                    open={repMenuOpen}
                                    onClose={() => setRepMenuEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                >
                                    {MolstarSchemes.representationSchemes.map(rep => (
                                        <MenuItem
                                            key={rep.id}
                                            onClick={() => {
                                                viewer3DRef.current?.setRepresentation?.(rep.id);
                                                setRepMenuEl(null);
                                            }}
                                        >
                                            {rep.label}
                                        </MenuItem>
                                    ))}
                                </Menu>
                                <Button
                                    onClick={(e) => setColorMenuEl(e.currentTarget)}
                                    color="inherit"
                                    startIcon={<PaletteIcon fontSize="inherit" />}
                                    disabled={false}
                                    aria-haspopup="menu"
                                    aria-controls={colorMenuOpen ? 'color-menu' : undefined}
                                    aria-expanded={colorMenuOpen ? 'true' : undefined}
                                >
                                    Color by
                                </Button>
                                <Menu
                                    id="color-menu"
                                    anchorEl={colorMenuEl}
                                    open={colorMenuOpen}
                                    onClose={() => setColorMenuEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                >
                                    {MolstarSchemes.colorBySchemes.map(color => (
                                        <MenuItem
                                            key={color.id}
                                            onClick={() => {
                                                viewer3DRef.current?.setColorScheme?.(color.id);
                                                setColorMenuEl(null);
                                            }}
                                        >
                                            {color.label}
                                        </MenuItem>
                                    ))}
                                </Menu>
                                <Button
                                    onClick={() => viewer3DRef.current?.resetAxes()}
                                    color="inherit"
                                    startIcon={<RestartAltIcon fontSize="inherit" />}
                                    disabled={!svgDepiction}
                                    aria-label="reset-view"
                                >
                                    Reset
                                </Button>
                            </ButtonGroup>
                        </Box>

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
