import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

import { SequenceInput } from './SequenceInput';
import { MonomerTrack } from './MonomerTrack/MonomerTrack';
import { Viewer2D } from './Viewer2D/Viewer2D';

import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';

import { buildLinkMapFromBiln, setMonomerSequences } from '../../../src/utils/bilnUtils';

const API_BASE_URL = 'http://0.0.0.0:5000';


export const PeptideEditorMain = ({
    Viewer3D,
}) => {

    console.log('PeptideEditorMain rendered');

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [bilnValue, setBilnValue] = useState('A-C-K-A-C-G-L');  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];

    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [hoveredMonomer, setHoveredMonomer] = useState('');
    const [uiState, setUiState] = useState({
        activeSeqIdx: 0,
        selectedMonomer: null,
        hoveredMonomer: '',
    });

    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [monomers, bilnValue]);
    const rowMonomerLists = useMemo(() => setMonomerSequences(bilnValue, monomers), [bilnValue, monomers]);

    const { addMonomerToBiln, handleDeleteMonomerItem, handleMonomerLinking, handleBondBreaking, handleOnDragEnd,
    } = useBilnHandlers({
        bilnValue,
        setBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
    });

    const { handleMonomerEnter, handleMonomerLeave } = useUIHandlers({ monomers, setHoveredMonomer });

    const monomerTrack = <MonomerTrack
        rowMonomerLists={rowMonomerLists}
        activeSeqIdx={uiState.activeSeqIdx}
        onSetActiveSeqIdx={seqIdx => setUiState(prev => ({ ...prev, activeSeqIdx: seqIdx }))}
        linkMap={linkMap}
        hoveredMonomer={hoveredMonomer}
        handleDeleteMonomerItem={handleDeleteMonomerItem}
        onDragEnd={handleOnDragEnd}
        handleMonomerEnter={handleMonomerEnter}
        handleMonomerLeave={handleMonomerLeave}
    />;

    // useEffect(() => {
    //     if (!bilnValue) {
    //         setDepictionData(null);
    //         // setRowMonomerLists([]);
    //         setStructureOutput(null);
    //         return;
    //     }

    //     const query = `?sequence=${bilnValue}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
    //     const loadAndGenerate = async () => {
    //         await fetchDepiction(DEPICT_2D_URL + query);
    //         await generate3D(bilnValue);
    //     };

    //     loadAndGenerate();
    //     // console.log('smiles:', depictionData?.smiles);
    // }, [bilnValue, isShowingAtomIndices]);





    function loadData(newBiln) {
        const params = {
            sequence: newBiln,
            mode: 'rdkit',
            'show-atom-indices': isShowingAtomIndices,
        }

        // const query = `?sequence=${newBiln}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        const loadAndGenerate = async () => {
            await fetchDepiction(params);
            // await generate3D(newBiln);
        };

        loadAndGenerate();
    }

    useEffect(() => {
        if (!bilnValue) return;
        loadData(bilnValue);
    }, [bilnValue]);

    function handleBilnChange(newBiln) {
        setBilnValue(newBiln);
        // loadData(newBiln);
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
                />
            </section>

            {/* 3D Viewer (self-contained with controls) */}
            <section className="border p-2 rounded shadow-sm min-h-[300px] flex-1">
                <div>3D Viewer Placeholder</div>
            </section>
        </div>
    );
};
