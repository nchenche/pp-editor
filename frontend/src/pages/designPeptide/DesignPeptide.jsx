import { useEffect, useState, useRef } from 'react';
import { log } from '../../utils/dev';

import SvgDepictionContainer from './components/SVGMolDepiction';

import Box from '@mui/material/Box';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
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


const MonomerItem = ({
    monomer,
    hoveredMonomer,
    handleMonomerHover,
    extrema,
    selectedMonomer,
    setSelectedMonomer,
    handleMonomerLinking
}) => {
    const isHovered = monomer['res-idx'] === hoveredMonomer;
    const isSelected = selectedMonomer ? selectedMonomer['res-idx'] === monomer['res-idx'] : false;
    const [hoveredBranch, setHoveredBranch] = useState(null);

    // Determine whether branching groups are present:
    const hasR3 = monomer.m_RgroupIdx && monomer.m_RgroupIdx[2] != null;
    const hasR4 = monomer.m_RgroupIdx && monomer.m_RgroupIdx[3] != null;


    // Build container class names.
    let containerClasses =
        "relative text-md border border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg font-medium text-[0.8rem] select-none cursor-pointer";
    if (isHovered) containerClasses += " outline outline-2";
    if (isSelected) containerClasses += " selected-monomer bg-yellow-200/50 ";
    if (extrema.isNter) containerClasses += " is-n-ter";
    if (extrema.isCter) containerClasses += " is-c-ter";
    if (hasR3) containerClasses += " has-r3";
    if (hasR4) containerClasses += " has-r4";

    const handleR3Click = (e) => {
        if (!selectedMonomer) {
            setSelectedMonomer(monomer);
        } else {
            handleMonomerLinking(selectedMonomer, monomer);
            setSelectedMonomer(null);
        }
    };

    const handleClick = (e) => {
        // console.log(monomer.m_abbr, monomer.m_attachmentPointIdx);
        console.log(monomer.m_abbr, monomer.m_attachmentPointIdx.map((idx) => idx !== null ? idx + monomer.offset : null));
        console.log(monomer);
    };

    return (
        <div
            className={containerClasses}
            onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
            onMouseLeave={() => handleMonomerHover('')}
            onClick={handleClick}
        >
            {monomer.m_abbr}

            {/* N-terminal indicator: two spans for circle and line */}
            {extrema && extrema.isNter && (
                <>
                    <span className="absolute nter-circle" />
                    <span className="absolute nter-line" />
                </>
            )}
            {/* C-terminal indicator: two spans for circle and line */}
            {extrema && extrema.isCter && (
                <>
                    <span className="absolute cter-circle" />
                    <span className="absolute cter-line" />
                </>
            )}
            {/* R3 indicator with its own hover logic */}
            {hasR3 && (
                <div
                    className=""
                    onMouseEnter={(e) => {
                        setHoveredBranch('r3');
                    }}
                    onMouseLeave={(e) => {
                        setHoveredBranch(null);
                    }}
                    onClick={handleR3Click}
                >
                    <span
                        className={`absolute r3-circle ${hoveredBranch === 'r3' ? 'branch-highlight' : ''}`}
                    />
                    <span
                        className={`absolute r3-line ${hoveredBranch === 'r3' ? 'branch-highlight' : ''}`}
                    />
                </div>
            )}
            {/* R4 indicator with its own hover logic */}
        </div>
    );
}

const MonomerList = ({
    monomers,
    monomerListRef,
    handleMonomerHover,
    hoveredMonomer,
    selectedMonomer,
    setSelectedMonomer,
    handleMonomerLinking
}) => {
    return (
        <div
            ref={monomerListRef}
            className='flex min-h-12 border p-4 gap-x-1 m-1'
        >
            {monomers.map((monomer, index) => {
                const isNter = index === 0 ? true : false;
                const isCter = index === monomers.length - 1 ? true : false;
                return (
                    <MonomerItem
                        key={monomer['res-idx']}
                        monomer={monomer}
                        hoveredMonomer={hoveredMonomer}
                        handleMonomerHover={handleMonomerHover}
                        extrema={{ isNter, isCter }}
                        selectedMonomer={selectedMonomer}
                        setSelectedMonomer={setSelectedMonomer}
                        handleMonomerLinking={handleMonomerLinking}
                    />
                )
            })}
        </div>
    );
}

const parseBilnSequence = (sequence) => {
    return sequence.replace(/\([^)]*\)/g, '');
};

const DesignPeptideContainer = ({ children }) => {
    const [fetchError, setFetchError] = useState(null);
    const [bilnValue, setBilnValue] = useState('A-C-K-G-F-C');
    const [svgDepiction, setSvgDepiction] = useState('');
    const [monomers, setMonomers] = useState([]);
    const [hoveredMonomer, setHoveredMonomer] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [selectedMonomer, setSelectedMonomer] = useState(null);
    const [connectionCounter, setConnectionCounter] = useState(1);
    // const [monomersToLink, setMonomersToLink] = useState([]);


    const svgContainer = useRef(null);
    const monomerListRef = useRef(null);

    log('RENDERING DesignPeptideContainer');
    const URL = 'http://0.0.0.0:5000/api/core/molecules/depiction/2d';
    let query = `?sequence=${bilnValue}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;

    // Ensure to treat as a single sequence if the input doesn't include dots
    const getSequences = (input) => {
        const seqArr = input.includes('.') ? input.split('.') : [input];
        return seqArr.map(parseBilnSequence);
    };

    const fetchData = async () => {
        // console.log(query);
        try {
            const response = await fetch(URL + query);
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

    const handleMonomerHover = (monomerIdx) => {
        setHoveredMonomer(monomerIdx);
    }

    const handleMonomerLinking = (monomer1, monomer2) => {

        const res_idx1 = parseInt(monomer1.residue.split('-')[1]);
        const res_idx2 = parseInt(monomer2.residue.split('-')[1]);
        const rgroup1 = parseInt(monomer1.rgroup) + 1;
        const rgroup2 = parseInt(monomer2.rgroup) + 1;
        console.log(
            `Linking ${res_idx1}-${rgroup1} and ${res_idx2}-${rgroup2} with connection ${connectionCounter}`
        );

        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res_idx1*2] += `(${connectionCounter},${rgroup1})`;
        bilnParts[res_idx2*2] += `(${connectionCounter},${rgroup2})`;

        console.log(bilnParts.join(''));
        setBilnValue(bilnParts.join(''));
        setConnectionCounter( (prev) => prev + 1);

    };

    useEffect(() => {
        if (!bilnValue) {
            setSvgDepiction('');
            setMonomers([]);
            setSequences([]);
            return;
        }
        fetchData();
    }, [query, bilnValue]);


    let globalResidueIndex = 0;
    return (
        <>
            <div className="border border-red-500 p-2 m-4 w-3/5 mx-auto">
                <div className='flex'>
                    <InputBiln value={bilnValue} onChangeValue={(e) => { setBilnValue(e.target.value) }} />
                </div>
     
                {/* Render one monomer list per sequence */}
                { /*sequences.map((seq, seqIdx) => {
                    // For each sequence, split it into monomers by hyphen
                    // and assign a global residue index.
                    const filteredMonomers = seq
                        .split('-')
                        .map((monomer) => {
                            const currentIndex = globalResidueIndex;
                            globalResidueIndex++;
                            // Look up the monomer in the monomers array by its 'res-idx' property.
                            return monomers.find((m) => m['res-idx'] === `${monomer}-${currentIndex}`);
                        })
                        .filter(Boolean); // Remove any undefined results

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
                        />
                    );
                }) */}


                <SvgDepictionContainer
                    svgData={svgDepiction}
                    svgContainer={svgContainer}
                    handleMonomerHover={handleMonomerHover}
                    hoveredMonomer={hoveredMonomer}
                    isShowingAtomIndices={isShowingAtomIndices}
                    handleShowingAtomIndices={(e) => setIsShowingAtomIndices(e.target.checked)}
                    handleMonomerLinking={handleMonomerLinking}
                    error={fetchError}
                />
            </div>

        </>
    );
}

export default DesignPeptideContainer;
