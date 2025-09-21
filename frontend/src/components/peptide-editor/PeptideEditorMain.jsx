import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';

import { SequenceInput } from './SequenceInput';
import { MonomerTrack } from './MonomerTrack/MonomerTrack';
import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
// import { MolstarApp } from './Viewer3D/molstar/MolstarApp';

import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';

import { buildLinkMapFromBiln, setMonomerSequences } from '../../../src/utils/bilnUtils';

const API_BASE_URL = 'http://0.0.0.0:5000';


const PeptideEditorMainInner = ({ onOutputChange, uiState, setUiState }, ref) => {

    // console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [bilnValue, setBilnValue] = useState('ac-A-C(1,3)-K-A-C(1,3)-G-L');  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];
    const smiles = depictionData?.smiles || '';
    const helm = depictionData?.helm || '';

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

    // Expose a minimal API to parent
    useImperativeHandle(ref, () => ({
        addMonomer: (monomer, ui = uiState) => addMonomerToBiln(monomer, ui),
        setBiln: (biln) => setBilnValue(biln),
        getBiln: () => bilnValue,
    }), [addMonomerToBiln, uiState, bilnValue]);

    const monomerTrack = <MonomerTrack
        rowMonomerLists={rowMonomerLists}
        activeSeqIdx={uiState.activeSeqIdx}
        onSetActiveSeqIdx={seqIdx => setUiState(prev => ({ ...prev, activeSeqIdx: seqIdx }))}
        linkMap={linkMap}
        hoveredMonomer={hoveredMonomer}
        handleDeleteMonomerItem={handleDeleteMonomerItem}
        onDragStart={handleDragStart}
        onDragEnd={handleOnDragEnd}
        handleMonomerEnter={handleMonomerEnter}
        handleMonomerLeave={handleMonomerLeave}
    />;

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

    function handleBilnChange(newBiln) {
        console.log("BILN changed:", newBiln);
        setBilnValue(newBiln);
    }


    return (
        <div className="flex flex-col space-y-2 h-full overflow-hidden">
            {/* Sequence Input */}
            <section className="border p-2 rounded shadow-sm">
                <SequenceInput value={bilnValue} onChangeValue={handleBilnChange} />
            </section>

            {/* Monomer Track */}
            <section className="border p-2 rounded shadow-sm overflow-x-auto">
                {monomerTrack}
            </section>

            {/* 2D Viewer (self-contained with controls) */}
            <section className="border p-2 rounded shadow-sm min-h-[300px] max-h-[500px] flex-1 bg-whit">
                {/* <div>2D Viewer Placeholder</div> */}
                <Viewer2D
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
                />
            </section>

            {/* 3D Viewer (self-contained with controls) */}
            <section className="border p-2 rounded shadow-sm min-h-[300px] max-h-[500px] flex-1">
                {/* <Viewer3D
                    pdbRawData={structureOutput?.pdb}
                    hoveredMonomer={hoveredMonomer}
                    handleMonomerHover={handleMonomerHover}
                    defaultRepresentation="ball-and-stick"
                    defaultColorScheme="residue-name"
                    height="20rem"  // match 2D viewer height h-80
                    width="100%"
                    error={generate3DError}
                    isGenerating3D={structureLoading}
                /> */}
            </section>
        </div>
    );
};

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);