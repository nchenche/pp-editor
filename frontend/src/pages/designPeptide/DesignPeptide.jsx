import { useCallback, useEffect, useState, useRef } from 'react';
import { log } from '../../utils/dev';


import { SvgDepictionContainer } from './components/SVGMolDepiction';
import { MonomerItem, MonomerList } from './components/Monomers';
import { MolStarViewer, PeptideViewer } from './components/MolstarViewer';
// import MolStarViewer from './components/MolstarTest';
// import MolStarViewer from './components/MolBasicWrapper';
import { MonomerLibraryContainer } from './components/monomerLibrary/MonomerLibrary';


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



const ExtraBoundsItem = ({ label, onDelete }) => {
    return (
        <Chip
            sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                borderRadius: 2,
                display: 'flex',
                p: 1,
                '& .MuiChip-deleteIcon': {
                    ml: 1,
                },
            }}
            label={label}
            size="small"
            onDelete={onDelete(label)}
        />
    );
}


const ExtraBoundsContainer = () => {
    const [chipData, setChipData] = useState([
        { key: 0, label: 'Angular' },
        { key: 1, label: 'jQuery' },
        { key: 2, label: 'Polymer' },
        { key: 3, label: 'React' },
        { key: 4, label: 'Vue.js' },
    ]);

    const handleDelete = (label) => () => {
        setChipData((chips) => chips.filter((chip) => chip.label !== label));
    };

    return (
        <Paper className='flex p-2 min-h-12 gap-x-2 items-center'>
            {chipData.map((data) => {
                let icon;

                return (
                    <ExtraBoundsItem
                        key={data.key}
                        label={data.label}
                        onDelete={handleDelete}
                    />
                );
            })}

        </Paper>
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


    const svgContainer = useRef(null);
    const monomerListRef = useRef(null);

    // log('RENDERING DesignPeptideContainer');
    const DEPICT_2D_URL = 'http://0.0.0.0:5000/api/core/molecules/depiction/2d';
    const API_BASE_URL = 'http://0.0.0.0:5000';
    let query = `?sequence=${bilnValue}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;

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

    const _handleMonomerHover = (data) => {
        // if (!data) return;

        if (data) {
            console.log('Hovered data:', data);
            console.log(monomers);
        }

        if (typeof (data) === 'object') {
            const monomer = monomers.filter((ele) => ele['res-idx'].split('-')[1] == (data.resid - 1))[0];
            setHoveredMonomer(monomer['res-idx']);

        } else {
            setHoveredMonomer(data);
        }
    }

    const handleDeleteMonomerItem = (monomer) => {
        if (!monomer) return;

        /* 1 . get the residue index of the monomer to be deleted */        
        const resIdx = parseInt((monomer['res-idx']).split('-')[1], 10);  // 0‑based
        const bilnParts = bilnValue.split(/([.-])/);  // keep separators
        const tokenIndex = resIdx * 2;  // residue token pos
        const residueToken = bilnParts[tokenIndex];  // residue token

        /* 2 . collect all connection IDs present on that residue */
        const linkIds = Array.from(residueToken.matchAll(/\((\d+),\d+\)/g)).map((m) => m[1]);

        /* 3 . remove each (id,rg) from every other residue */
        if (linkIds.length) {
            bilnParts.forEach((tok, i) => {
                if (i % 2 === 0 && i !== tokenIndex) {                 // other residues only
                    linkIds.forEach((id) => {
                        bilnParts[i] = bilnParts[i].replace(new RegExp(`\\(${id},\\d+\\)`, 'g'), '');
                    });
                }
            });
        }

        /* 4 . delete the residue itself + one adjacent separator   */
        if (tokenIndex < bilnParts.length - 1) {
            bilnParts.splice(tokenIndex, 2);   // remove [res, "-" | "."]
        } else {
            bilnParts.splice(tokenIndex - 1, 2); // last residue: remove prev sep
        }

        /* 5 . write the new string – effects tied to bilnValue will refresh lists */
        const newBiln = bilnParts.join('');
        setBilnValue(newBiln);
    }

    const handleMonomerHover = useCallback((data) => {
        if (data) {
            console.log("length of monomers array:", monomers.length);
        }

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
        const res1Idx = residues[0];
        const res2Idx = residues[1];
        const res1RgroupIdx = rgroups[0];
        const res2RgroupIdx = rgroups[1];

        console.log(`Breaking bond between ${res1Idx}-${res1RgroupIdx} and ${res2Idx}-${res2RgroupIdx}`);

        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res1Idx * 2] = removeGroup(bilnParts[res1Idx * 2], res1RgroupIdx);
        bilnParts[res2Idx * 2] = removeGroup(bilnParts[res2Idx * 2], res2RgroupIdx);

        setBilnValue(bilnParts.join(''));
        setConnectionCounter((prev) => prev + 1);
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
            return;
        }

        const loadAndGenerate = async () => {
            await fetchData();         // Wait until monomers are actually updated
            await handleGenerate3D();  // THEN trigger 3D generation
        };

        loadAndGenerate();
    }, [bilnValue, isShowingAtomIndices]);


    useEffect(() => {
        console.log('Structure output updated:', structureOutput);
        console.log('Monomers array length:', monomers.length);
    }, [structureOutput]);

    let globalResidueIndex = 0;

    return (
        <>
            <div className="flex flex-col md:flex-row-reverse m-4 max-h-[85vh]">

                {/* === Right Panel: Monomer Library (Visible on md+) === */}
                <div className="hidden md:block w-full md:w-1/3 border p-4 rounded-md shadow-sm max-h-[80vh] overflow-hidden">
                    <h2 className="text-lg font-semibold mb-2">Monomer Library</h2>

                    <MonomerLibraryContainer filterValue={searchValue} />
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

                        {sequences.map((seq, seqIdx) => {
                            const filteredMonomers = seq
                                .split('-')
                                .map((monomer) => {
                                    const currentIndex = globalResidueIndex++;
                                    return monomers.find((m) => m['res-idx'] === `${monomer}-${currentIndex}`);
                                })
                                .filter(Boolean);

                            return (
                                <MonomerList
                                    key={seqIdx}
                                    monomers={filteredMonomers}
                                    monomerListRef={monomerListRef}
                                    handleMonomerHover={handleMonomerHover}
                                    hoveredMonomer={hoveredMonomer}
                                    selectedMonomer={selectedMonomer}
                                    setSelectedMonomer={setSelectedMonomer}
                                    handleMonomerLinking={null}
                                    onDelete={handleDeleteMonomerItem}
                                />
                            );
                        })}

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
            </div>
        </>
    );
}

export default DesignPeptideContainer;
