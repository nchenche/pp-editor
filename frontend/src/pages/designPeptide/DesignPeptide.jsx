import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { log } from '../../utils/dev';


import { SvgDepictionContainer } from './components/SVGMolDepiction';
import { MonomerItem, MonomerList } from './components/Monomers';
import { MolStarViewer, PeptideViewer } from './components/MolstarViewer';
// import MolStarViewer from './components/MolstarTest';
// import MolStarViewer from './components/MolBasicWrapper';
import { MonomerLibraryContainer } from './components/monomerLibrary/MonomerLibrary';


import { DragDropContext, Droppable } from '@hello-pangea/dnd';


import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch'; import TextField from '@mui/material/TextField';


const InputBiln = ({ value, onChangeValue }) => {
    return (
        <div className='p-2 w-2/4 mx-auto'>
            <TextField
                id="outlined-required"
                label="Enter BILN sequence"
                fullWidth
                value={value}
                onChange={onChangeValue}
            />
        </div>
    );
}


const InputSearch = ({ value, onChangeValue }) => {
    return (
        <div className='p-2 w-2/4 mx-auto'>
            <TextField
                id="outlined-required"
                label="Search monomers"
                fullWidth
                value={value}
                onChange={onChangeValue}
            />
        </div>
    );
}


const DesignPeptideContainer = ({ children }) => {
    const [fetchError, setFetchError] = useState(null);
    const [generate3DError, setGenerate3DError] = useState(null);

    const [bilnValue, setBilnValue] = useState('A-C-K-A-C');  // A-C-K-A-C
    const [svgDepiction, setSvgDepiction] = useState('');
    const [monomers, setMonomers] = useState([]);
    const [hoveredMonomer, setHoveredMonomer] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [selectedMonomer, setSelectedMonomer] = useState(null);
    const [connectionCounter, setConnectionCounter] = useState(1);
    // const [monomersToLink, setMonomersToLink] = useState([]);

    const [structureOutput, setStructureOutput] = useState(null);
    const [generatedPdbUrl, setGeneratedPdbUrl] = useState(null);

    // const [show3DViewer, setShow3DViewer] = useState(false);

    const [searchValue, setSearchValue] = useState('');

    const [rowMonomerLists, setRowMonomerLists] = useState([]);
    const [activeSeqIdx, setActiveSeqIdx] = useState(0);
    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [bilnValue]);

    const svgContainer = useRef(null);

    // log('RENDERING DesignPeptideContainer');
    const DEPICT_2D_URL = 'http://0.0.0.0:5000/api/core/molecules/depiction/2d';
    const API_BASE_URL = 'http://0.0.0.0:5000';
    let query = `?sequence=${bilnValue}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;


    /**
    * Decomposes a BILN string into tokens and separators.
    * @param {string} biln - The BILN string to decompose.
    * @returns {Object} - An object containing tokens and separators.
    * @example
    * Input: "A-C(1,3)-K-A-C(1,3)"
    * Output: { tokens: ["A", "C(1,3)", "K", "A", "C(1,3)"], seps: ["-", "-", "-", "-"] }
    */
    function decomposeBiln(biln) {
        // ["A","-","C(1,3)","-","K","-","A","-","C"]
        const parts = biln.split(/([.-])/);
        const tokens = parts.filter((_, i) => i % 2 === 0);
        const seps = parts.filter((_, i) => i % 2 === 1);
        return { tokens, seps };
    }

    /**
     * Builds a link map from a BILN string.
     * @param {string} bilnValue - The BILN string to process.
     * @returns {Object} - A map of link IDs to their corresponding monomer indices and R-groups.
     * @example
     * Input: "A-C(1,3)-K-A-C(1,3)"
     * Output: { "1": [{ monomerIdx: 1, rgroup: 3 }, { monomerIdx: 4, rgroup: 3 }] }
     */
    function buildLinkMapFromBiln(bilnValue) {
        const { tokens } = decomposeBiln(bilnValue);
        const linkMap = {};
        tokens.forEach((tok, monomerIdx) => {
            const matches = Array.from(tok.matchAll(/\((\d+),(\d+)\)/g));
            matches.forEach(([, linkId, rgroup]) => {
                if (!linkMap[linkId]) linkMap[linkId] = [];
                // Only add if not already there (defensive, in case of malformed BILN)
                if (!linkMap[linkId].some(pair => pair.monomerIdx === monomerIdx && pair.rgroup === Number(rgroup))) {
                    linkMap[linkId].push({ monomerIdx, rgroup: Number(rgroup) });
                }
            });
        });
        return linkMap;
    }

    // Ensure to treat as a single sequence if the input doesn't include dots
    const getSequences = (input) => {
        const seqArr = input.includes('.') ? input.split('.') : [input];
        return seqArr.map((sequence) => (sequence.replace(/\([^)]*\)/g, '')));
    };


    const removeGroup = (str, target) => {
        // Build a regex that matches: an opening parenthesis,
        // followed by any characters (non-greedily) until a comma,
        // optional whitespace, the target value, and then a closing parenthesis.
        const regex = new RegExp("\\([^)]*?,\\s*" + target + "\\)", "g");
        return str.replace(regex, "");
    }


    const fetchData = async () => {
        try {
            const response = await fetch(DEPICT_2D_URL + query);
            if (!response.ok) {
                const res = await response.json();
                console.error(res.message);
                setFetchError(res.message);
                return;
            }
            const data = await response.json();
            setSvgDepiction(data.data.svg);
            setMonomers(data.data.monomers);
            setSequences(getSequences(bilnValue));

            setFetchError(null);
        } catch (error) {
            console.error(error);
            setFetchError(error);
        }
    }


    const handleGenerate3D = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/core/molecules/generate_3d`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sequence: bilnValue,
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('3D Generation error:', err.message);
                return;
            }

            const result = await response.json();
            setStructureOutput(result.data); // save the full structure payload
            const pdbUrl = `${API_BASE_URL}${result.data.pdb_download_url}`;
            // console.log('Generated data:', result.data);
            // setGeneratedPdbUrl(pdbUrl);
        } catch (error) {
            console.error('Error during 3D generation:', error);
            setGenerate3DError(error);
        }
    };


    const handleDeleteMonomerItem = (monomer) => {
        if (!monomer) return;

        const resIdx = parseInt(monomer['res-idx'].split('-')[1], 10); // 0-based
        const { tokens, seps } = decomposeBiln(bilnValue);

        const targetToken = tokens[resIdx];

        // 1. Extract connection IDs from the token to remove
        const linkIds = Array.from(targetToken.matchAll(/\((\d+),\d+\)/g)).map((m) => m[1]);

        // 2. Remove all matching links from other tokens
        if (linkIds.length > 0) {
            tokens.forEach((tok, i) => {
                if (i !== resIdx) {
                    linkIds.forEach((id) => {
                        tokens[i] = tok.replace(new RegExp(`\\(${id},\\d+\\)`, 'g'), '');
                    });
                }
            });
        }

        // 3. Remove the token and its associated separator
        tokens.splice(resIdx, 1);

        // 4. Handle separator removal carefully
        if (seps.length > 0) {
            const isNextSepRowSplit = seps[resIdx] === '.';
            const sepIdxToRemove = isNextSepRowSplit ? resIdx - 1 : resIdx;

            if (sepIdxToRemove >= 0 && sepIdxToRemove < seps.length) {
                seps.splice(sepIdxToRemove, 1);
            }
        }

        // 5. Rebuild the BILN
        const newBiln = tokens.map((t, i) => t + (seps[i] || '')).join('').replace(/[-.\s]+$/g, '');
        setBilnValue(newBiln);
    };


    const handleMonomerHover = useCallback((data) => {
        if (typeof data === 'object') {
            const monomer = monomers.find((ele) =>
                ele['res-idx'].split('-')[1] == (data.resid - 1)
            );

            if (!monomer) {
                console.warn('No matching monomer found for:', data);
                return;
            }

            setHoveredMonomer(monomer['res-idx']);
        } else {
            setHoveredMonomer(data);
        }
    }, [monomers]);


    const handleMonomerLinking = (monomer1, monomer2) => {
        const res_idx1 = parseInt(monomer1.residue.split('-')[1]);
        const res_idx2 = parseInt(monomer2.residue.split('-')[1]);
        const rgroup1 = parseInt(monomer1.rgroup) + 1;
        const rgroup2 = parseInt(monomer2.rgroup) + 1;
        console.log(
            `Linking ${res_idx1}-${rgroup1} and ${res_idx2}-${rgroup2} with connection ${connectionCounter}`
        );

        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res_idx1 * 2] += `(${connectionCounter},${rgroup1})`;
        bilnParts[res_idx2 * 2] += `(${connectionCounter},${rgroup2})`;

        console.log(bilnParts.join(''));
        setBilnValue(bilnParts.join(''));
        setConnectionCounter((prev) => prev + 1);
    };


    const handlebondBreaking = (residues, rgroups) => {
        const res_idx1 = parseInt(residues[0]);
        const res_idx2 = parseInt(residues[1]);
        const rgroup1 = parseInt(rgroups[0]);
        const rgroup2 = parseInt(rgroups[1]);

        // 1. Find the connectionId (linkMap key) being removed
        const linkMapIdToRemove = Object.entries(linkMap).find(([connId, pairs]) => {
            const ids = pairs.map(p => `${p.monomerIdx}-${p.rgroup}`);
            const target1 = `${res_idx1}-${rgroup1}`;
            const target2 = `${res_idx2}-${rgroup2}`;

            return ids.includes(target1) && ids.includes(target2);
        })?.[0];

        const removedId = parseInt(linkMapIdToRemove, 10);


        // 2. Remove the bond from the relevant monomers in bilnParts
        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res_idx1 * 2] = removeGroup(bilnParts[res_idx1 * 2], rgroup1);
        bilnParts[res_idx2 * 2] = removeGroup(bilnParts[res_idx2 * 2], rgroup2);

        // 3. Decrement all connection IDs > removedId throughout the BILN string
        let newBiln = bilnParts.join('');
        newBiln = newBiln.replace(/\((\d+),(\d+)\)/g, (match, n, rg) => {  // Pattern: \(N,rg\) where N > removedId
            const nNum = parseInt(n, 10);
            if (nNum > removedId) {
                return `(${nNum - 1},${rg})`;
            }
            return match;
        });

        // 4. Update bilnValue and connectionCounter
        setBilnValue(newBiln);
        setConnectionCounter((prev) => prev - 1);
    };


    const handleDownloadArchive = () => {
        if (!structureOutput?.zip_download_url) return;

        const link = document.createElement('a');
        link.href = `${API_BASE_URL}${structureOutput.zip_download_url}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };


    useEffect(() => {
        if (!bilnValue) {
            setSvgDepiction('');
            setMonomers([]);
            setSequences([]);
            setRowMonomerLists([]);
            setStructureOutput(null);
            return;
        }

        const loadAndGenerate = async () => {
            await fetchData();         // Wait until monomers are actually updated
            await handleGenerate3D();  // THEN trigger 3D generation
        };

        loadAndGenerate();
    }, [bilnValue, isShowingAtomIndices]);


    useEffect(() => {
        if (!sequences.length || !monomers.length) return;

        console.log('Sequences:', sequences);
        console.log("rowMonomerLists", rowMonomerLists);

        let offset = 0;  // offset for slicing monomers

        const lists = sequences.map((seq) => {
            const count = seq.split('-').length;  // how many residues in this row
            const slice = monomers.slice(offset, offset + count);  // take that many monomers from the current offset
            offset += count;  // advance for next row
            return slice;
        });

        setRowMonomerLists(lists);
    }, [monomers, sequences]);


    /**
     * Rebuild the BILN string from the reordered monomer lists.
     * @param {Array} rowLists - Array of rows, each row is an array of monomer objects in new order.
     * @param {string} prevBiln - The original BILN string, e.g. "A-C-K-A-C".
     * @returns {string} - The new BILN string.
     */
    function buildBilnFromRowMonomerLists(rowLists, prevBiln) {
        const { tokens: origTokens } = decomposeBiln(prevBiln);

        // for each row, map your reordered monomers back to the original tokens
        const rowStrs = rowLists.map((row) => {
            const newTokens = row.map((m) => {
                // extract the original position index from "C-4"
                const idx = parseInt(m['res-idx'].split('-')[1], 10);
                // grab the exact token (with any (id,rg) suffix) from origTokens
                return origTokens[idx];
            });
            // join residues with '-' within a row
            return newTokens.join('-');
        });

        // Join rows and clean any trailing characters on the final biln
        return rowStrs.join('.').replace(/[-.\s]+$/g, '');
    }

    /**
     * Add a monomer to the current BILN string.
     * @param {Object} monomer - The monomer object to add.
     * @param {number} activeSeqIdx - The index of the active sequence.
     * @param {string} bilnValue - The current BILN string.
     * @param {Array} monomers - The list of all monomers.
     * @param {Function} setBilnValue - Function to update the BILN string.
     */
    function addMonomerToBiln(monomer) {
        if (!monomer) return;

        const code = monomer.symbol || monomer.m_abbr;
        const isNterCap =
            monomer.m_subtype === "cap" && monomer.m_RgroupIdx[1] != null;
        const isCterCap =
            monomer.m_subtype === "cap" && monomer.m_RgroupIdx[0] != null;

        // 1. split into segments and trim stray separators
        const trimmed = bilnValue.replace(/^[.-]+|[.-]+$/g, "");
        const segments = trimmed.split(".");

        // 2. target segment string and its monomer codes
        const seg = segments[activeSeqIdx] || "";
        const segMonomers = seg ? seg.split("-") : [];

        // 3. find “global” offsets to look up current terminal monomers
        const offset = segments
            .slice(0, activeSeqIdx)
            .reduce((sum, s) => sum + (s ? s.split("-").length : 0), 0);
        const nterGlobalIdx = offset;
        const cterGlobalIdx = offset + segMonomers.length - 1;

        // 4. grab the actual monomer objects
        const nterMonomer = monomers.find(
            (m) => parseInt(m["res-idx"].split("-")[1], 10) === nterGlobalIdx
        );
        const cterMonomer = monomers.find(
            (m) => parseInt(m["res-idx"].split("-")[1], 10) === cterGlobalIdx
        );

        // 5. detect if they’re already caps
        const isNterCapped =
            nterMonomer?.m_subtype === "cap" && nterMonomer.m_RgroupIdx[1] != null;
        const isCterCapped =
            cterMonomer?.m_subtype === "cap" && cterMonomer.m_RgroupIdx[0] != null;

        // 6. build the new segment
        let newSegMonomers = segMonomers.slice(); // copy array

        if (isNterCap) {
            if (isNterCapped) {
                // replace index 0
                newSegMonomers[0] = code;
            } else {
                // prepend
                newSegMonomers.unshift(code);
            }
        } else {
            if (isCterCap && isCterCapped) {
                // replace last
                newSegMonomers[newSegMonomers.length - 1] = code;
            } else {
                // append
                newSegMonomers.push(code);
            }
        }

        // 7. write back full BILN
        segments[activeSeqIdx] = newSegMonomers.join("-");
        const newBiln = segments.join(".");

        setBilnValue(newBiln);
        console.log("Updated BILN:", newBiln);
    }

    const handleOnDragEnd = (result) => {
        // console.log('Drag result:', result);
        const { source, destination, draggableId } = result;

        if (!destination) {
            return; // dropped outside the list
        }
        if (source.droppableId === destination.droppableId) {
            // Reorder within the same list
            const reorderedList = Array.from(rowMonomerLists[source.droppableId]);
            const [removed] = reorderedList.splice(source.index, 1);
            reorderedList.splice(destination.index, 0, removed);

            setRowMonomerLists((prev) => {
                const next = [...prev];
                next[source.droppableId] = reorderedList;

                const newBiln = buildBilnFromRowMonomerLists(next, bilnValue);
                setBilnValue(newBiln);
                console.log("Updated BILN:", newBiln);
                return next;
            });
        }
        else {
            // Move between lists
            const sourceList = Array.from(rowMonomerLists[source.droppableId]);
            const destList = Array.from(rowMonomerLists[destination.droppableId]);
            const [removed] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, removed);

            setRowMonomerLists((prev) => {
                const next = [...prev];
                next[source.droppableId] = sourceList;
                next[destination.droppableId] = destList;

                const newBiln = buildBilnFromRowMonomerLists(next, bilnValue);
                setBilnValue(newBiln);
                console.log("Updated BILN:", newBiln);
                return next;
            });
        }
    }


    return (
        <>
            <div className="flex flex-col md:flex-row-reverse m-4 max-h-[85vh]">
                <DragDropContext
                    onDragEnd={handleOnDragEnd}
                >


                    {/* === Right Panel: Monomer Library (Visible on md+) === */}
                    <div className="hidden md:block w-full md:w-1/3 border p-4 rounded-md shadow-sm max-h-[80vh] overflow-hidden">
                        <h2 className="text-lg font-semibold mb-2">Monomer Library</h2>

                        <MonomerLibraryContainer filterValue={searchValue} onMonomerItemDoubleClick={addMonomerToBiln} />
                    </div>

                    {/* === Search input for small screens === */}
                    <div className="block md:hidden mb-4 w-full">
                        <input
                            type="text"
                            placeholder="Search monomers..."
                            className="w-full px-3 py-2 border rounded-md shadow-sm"
                        />
                    </div>

                    {/* === Main Content Area === */}
                    <div className="flex-1 overflow-hidden">
                        <div className="border border-red-500 p-2 mx-auto w-fit">

                            <div className=''>
                                <InputSearch value={searchValue} onChangeValue={(e) => setSearchValue(e.target.value)} />
                            </div>

                            <div className=''>
                                <InputBiln value={bilnValue} onChangeValue={(e) => setBilnValue(e.target.value)} />
                            </div>


                            {rowMonomerLists.map((list, seqIdx) => (
                                <div
                                    key={seqIdx}
                                    onMouseEnter={() => setActiveSeqIdx(seqIdx)}
                                    className={seqIdx === activeSeqIdx ? 'ring-1 ring-blue-300 rounded-md' : ''}
                                >
                                    <Droppable droppableId={`${seqIdx}`} direction='horizontal' className='border border-stone-500'>
                                        {(provided, snapshot) => (
                                            <MonomerList
                                                {...provided.droppableProps}
                                                droppableRef={provided.innerRef}
                                                monomers={list}
                                                linkMap={linkMap}
                                                handleMonomerHover={handleMonomerHover}
                                                hoveredMonomer={hoveredMonomer}
                                                onDelete={handleDeleteMonomerItem}
                                            >
                                                {provided.placeholder}
                                            </MonomerList>
                                        )}
                                    </Droppable>
                                </div>
                            ))}


                            <div className="flex flex-col lg:flex-row items-start gap-x-2 mt-4 w-full">
                                <div className="flex-1 flex flex-col items-center border p-4 mx-auto w-full">
                                    <SvgDepictionContainer
                                        svgData={svgDepiction}
                                        svgContainer={svgContainer}
                                        handleMonomerHover={handleMonomerHover}
                                        hoveredMonomer={hoveredMonomer}
                                        isShowingAtomIndices={isShowingAtomIndices}
                                        handleShowingAtomIndices={() => setIsShowingAtomIndices((prev) => !prev)}
                                        handleMonomerLinking={handleMonomerLinking}
                                        handlebondBreaking={handlebondBreaking}
                                        error={fetchError}
                                    />
                                    <div className="flex justify-center flex-wrap gap-x-4">
                                        <button onClick={handleGenerate3D} className="text-sm bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm">
                                            Generate 3D
                                        </button>
                                        <button onClick={handleDownloadArchive} disabled={!structureOutput} className={`text-sm font-medium py-2 px-4 rounded ${structureOutput ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                            Download Archive
                                        </button>
                                    </div>
                                </div>

                                <div className="w-[400px] h-[400px] lg:mt-12 mx-auto border border-slate-400 bg-white rounded-md overflow-hidden flex items-center justify-center relative">
                                    {structureOutput?.pdb ? (
                                        <MolStarViewer
                                            pdbRawData={structureOutput?.pdb}
                                            hoveredMonomer={hoveredMonomer}
                                            handleMonomerHover={handleMonomerHover}
                                            defaultRepresentation="ball-and-stick"
                                            defaultColorScheme="residue-name"
                                            height="400px"
                                            width="100%"
                                            error={generate3DError}
                                        />
                                    ) : (
                                        <div className="text-xl text-slate-500">No structure</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DragDropContext>
            </div >
        </>
    );
}

export default DesignPeptideContainer;
