import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { log } from '../../utils/dev';


import { DesignPageLayout } from '../../layouts/DesignPageLayout';
import {
    buildLinkMapFromBiln,
    getSequences,
} from '../../utils/bilnUtils';

import { useFetchDepiction } from '../../hooks/useFetchDepiction';
import { useGenerate3D } from '../../hooks/useGenerate3D';
import { useBilnHandlers } from '../../hooks/useBilnHandlers';
import { useUIHandlers } from '../../hooks/useUIHandlers';

import { InputBiln, InputSearch } from './components/Inputs';
import { MonomerRows } from './components/MonomerRows';
import { ViewerPanel } from './components/ViewerPanel';

import { SvgDepictionContainer } from './components/SVGMolDepiction';
import { MolStarViewer } from './components/MolstarViewer';
import { MonomerLibraryContainer } from './components/monomerLibrary/MonomerLibrary';

import { DragDropContext, Droppable } from '@hello-pangea/dnd';


const DEPICT_2D_URL = 'http://0.0.0.0:5000/api/core/molecules/depiction/2d';
const API_BASE_URL = 'http://0.0.0.0:5000';


const DesignPeptideContainer = ({ children }) => {

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const { result: structureOutput, error: generate3DError, loading: structureLoading, generate3D, setResult: setStructureOutput } = useGenerate3D(API_BASE_URL);

    const [bilnValue, setBilnValue] = useState('A-C-K-A-C-G-L');  //  A-C-K-A-C
    const svgDepiction = depictionData?.svg || '';
    const monomers = depictionData?.monomers || [];

    // const [hoveredMonomer, setHoveredMonomer] = useState(null);
    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [selectedMonomer, setSelectedMonomer] = useState(null);

    const [uiState, setUiState] = useState({
        activeSeqIdx: 0,
        selectedMonomer: null,
        hoveredMonomer: null,
    });

    const [searchValue, setSearchValue] = useState('');
    const [rowMonomerLists, setRowMonomerLists] = useState([]);
    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [monomers]);
    const svgContainer = useRef(null);

    const {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
    } = useBilnHandlers({
        bilnValue,
        setBilnValue,
        monomers,
        rowMonomerLists,
        setRowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        // add more if needed
    });

    const { handleMonomerHover } = useUIHandlers({
        monomers,
        uiState,
        setUiState,
    });

    useEffect(() => {
        if (!bilnValue) {
            setDepictionData(null);
            setRowMonomerLists([]);
            setStructureOutput(null);
            return;
        }

        const query = `?sequence=${bilnValue}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        const loadAndGenerate = async () => {
            await fetchDepiction(DEPICT_2D_URL + query);
            await generate3D(bilnValue);
        };

        loadAndGenerate();
        console.log('smiles:', depictionData?.smiles);
    }, [bilnValue, isShowingAtomIndices]);


    useEffect(() => {
        if (!monomers.length) {
            setRowMonomerLists([]);
            return;
        }

        const sequences = getSequences(bilnValue);
        if (!sequences.length) {
            setRowMonomerLists([]);
            return;
        }

        let offset = 0;  // offset for slicing monomers
        const lists = sequences.map((seq) => {
            const count = seq.split('-').length;  // how many residues in this row
            const slice = monomers.slice(offset, offset + count);  // take that many monomers from the current offset
            offset += count;  // advance for next row
            return slice;
        });

        setRowMonomerLists(lists);
    }, [monomers]);

    const handleDownloadArchive = () => {
        if (!structureOutput?.zip_download_url) return;

        const link = document.createElement('a');
        link.href = `${API_BASE_URL}${structureOutput.zip_download_url}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <>
            <DesignPageLayout
                mobileTopPanel={
                    <div className="block md:hidden mb-4 w-full">
                        <InputSearch value={searchValue} onChangeValue={(e) => setSearchValue(e.target.value)} />
                    </div>
                }
                leftPanel={
                    <MonomerLibraryContainer filterValue={searchValue} onMonomerItemDoubleClick={addMonomerToBiln} />
                }
                mainPanel={
                    <div className="border border-red-500 p-2 mx-auto w-fit">

                        <InputSearch value={searchValue} onChangeValue={(e) => setSearchValue(e.target.value)} />
                        <InputBiln value={bilnValue} onChangeValue={(e) => setBilnValue(e.target.value)} />

                        <DragDropContext
                            onDragEnd={handleOnDragEnd}
                        >
                            <MonomerRows
                                rowMonomerLists={rowMonomerLists}
                                activeSeqIdx={uiState.activeSeqIdx}
                                onSetActiveSeqIdx={seqIdx => setUiState(prev => ({ ...prev, activeSeqIdx: seqIdx }))}
                                linkMap={linkMap}
                                handleMonomerHover={handleMonomerHover}
                                hoveredMonomer={uiState.hoveredMonomer}
                                handleDeleteMonomerItem={handleDeleteMonomerItem}
                            />
                        </DragDropContext>

                        <ViewerPanel
                            svgSection={
                                <SvgDepictionContainer
                                    svgData={svgDepiction}
                                    svgContainer={svgContainer}
                                    handleMonomerHover={handleMonomerHover}
                                    hoveredMonomer={uiState.hoveredMonomer}
                                    isShowingAtomIndices={isShowingAtomIndices}
                                    handleShowingAtomIndices={() => setIsShowingAtomIndices((prev) => !prev)}
                                    handleMonomerLinking={handleMonomerLinking}
                                    handleBondBreaking={handleBondBreaking}
                                    error={depictionError}
                                />
                            }
                            controlsSection={
                                <div className="flex justify-center flex-wrap gap-x-4">
                                    {/* <button onClick={handleGenerate3D} className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm">
                                            Generate 3D
                                        </button> */}
                                    <button onClick={handleDownloadArchive} disabled={!structureOutput} className={`text-sm font-medium py-2 px-4 rounded ${structureOutput ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                        Download Archive
                                    </button>
                                </div>
                            }
                            structureSection={
                                structureOutput?.pdb ? (
                                    <MolStarViewer
                                        pdbRawData={structureOutput?.pdb}
                                        hoveredMonomer={uiState.hoveredMonomer}
                                        handleMonomerHover={handleMonomerHover}
                                        defaultRepresentation="ball-and-stick"
                                        defaultColorScheme="residue-name"
                                        height="400px"
                                        width="100%"
                                        error={generate3DError}
                                    />
                                ) : (
                                    <div className="text-xl text-slate-500">No structure</div>
                                )
                            }
                        />
                    </div>
                }
            />
        </>
    );
}

export default DesignPeptideContainer;
