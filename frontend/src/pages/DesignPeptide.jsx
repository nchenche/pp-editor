import { useEffect, useState, useRef } from 'react';
import { log } from '../utils/dev';

import Box from '@mui/material/Box';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch'; import TextField from '@mui/material/TextField';

import panzoom from 'panzoom';


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


const SvgDepictionContainer = ({ svgData, svgContainer, handleMonomerHover, hoveredMonomer }) => {
    const padding = 10;

    const onMouseEnterGroup = (event) => {
        const group = event.currentTarget;
        let residueIndex = group.className.baseVal?.split('residue-')[1];
        handleMonomerHover(residueIndex);
    }

    const onMouseLeaveGroup = () => {
        handleMonomerHover('');
    }

    useEffect(() => {
        if (!svgData || !svgContainer) return;

        svgContainer.current.querySelectorAll('svg g').forEach(group => {

            // Compute the bounding box of the group
            const bbox = group.getBBox();

            // Adjust the bounding box values by adding a padding
            const paddedX = bbox.x - padding;
            const paddedY = bbox.y - padding;
            const paddedWidth = bbox.width + padding * 2;
            const paddedHeight = bbox.height + padding * 2;

            // Create a new rect covering that bounding box
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", paddedX);
            rect.setAttribute("y", paddedY);
            rect.setAttribute("width", paddedWidth);
            rect.setAttribute("height", paddedHeight);
            rect.setAttribute("fill", "transparent");
            rect.setAttribute("pointer-events", "all");

            // Add a class for styling.
            rect.classList.add("hover-rect");

            // Insert the rect as the first child so it lies behind the other elements
            group.insertBefore(rect, group.firstChild);

            // Optionally, add a hover effect on the group via CSS or JS
            group.addEventListener("mouseenter", onMouseEnterGroup);
            group.addEventListener("mouseleave", onMouseLeaveGroup);
        });

        return () => {
            svgContainer.current.querySelectorAll('svg g').forEach(group => {
                group.removeEventListener("mouseenter", onMouseEnterGroup);
                group.removeEventListener("mouseleave", onMouseLeaveGroup);
            });
        }
    }, [svgData]);


    // Second effect: highlight the group corresponding to hoveredMonomer
    useEffect(() => {
        if (!svgData || !svgContainer.current) return;

        const svgElement = svgContainer.current.querySelector('svg');

        // Remove highlight from all groups
        svgContainer.current.querySelectorAll('svg g').forEach(group => {
            group.classList.remove('highlighted');
        });

        // If there is a hoveredMonomer, add the highlight to its corresponding group.
        if (hoveredMonomer) {
            const targetGroup = svgContainer.current.querySelector(`svg g.residue-${hoveredMonomer}`);
            if (targetGroup) {
                targetGroup.classList.add('highlighted');
            }
            // Required for svg opacity handling from monomer item hovering
            svgElement.classList.add('monomer-hover');
        } else {
            svgElement.classList.remove('monomer-hover');
        }
    }, [hoveredMonomer]);

    // Add panzoom functionality
    useEffect(() => {
        if (!svgContainer.current || !svgData) return;

        // Query for the inner SVG element.
        const svgElement = svgContainer.current.querySelector('svg');
        if (!svgElement) return;

        // Add a double-click event listener to reset the pan/zoom.
        const dblClickHandler = (event) => {
            event.preventDefault(); // Prevent default behavior (if any)
            // Move to (0, 0)
            panZoomInstance.moveTo(0, 0);
            // Set the zoom level to 1. The parameters (0, 0) are used here to indicate the focal point for the zoom.
            panZoomInstance.zoomAbs(0, 0, 0.5);
        };

        // Attach panzoom to the SVG element.
        const panZoomInstance = panzoom(svgElement, {
            // maxZoom: 2,
            minZoom: 0.1,
            bounds: true,
            boundsPadding: 0.1, // Use 0 to restrict movement strictly to the container
            zoomSpeed: 0.1,
            // onDoubleClick: dblClickHandler
        });



        svgElement.addEventListener('dblclick', dblClickHandler);

        // Cleanup on unmount:
        return () => {
            svgElement.removeEventListener('dblclick', dblClickHandler);
            panZoomInstance.dispose();
        };
    }, [svgData]);

    return (
        <div
            ref={svgContainer}
            className="border border-slate-400 m-4 w-[400px] h-[400px] mx-auto rounded-md overflow-hidden bg-white"
        >
            {svgData ? (
                <div dangerouslySetInnerHTML={{ __html: svgData }}></div>
            ) : (
                <div className="text-xl flex items-center justify-center h-full">
                    No data
                </div>
            )}
        </div>
    );
};


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

    return (
        <div
            className={containerClasses}
            onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
            onMouseLeave={() => handleMonomerHover('')}
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
    const [bilnValue, setBilnValue] = useState('A-C');
    const [svgDepiction, setSvgDepiction] = useState('');
    const [monomers, setMonomers] = useState([]);
    const [hoveredMonomer, setHoveredMonomer] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [selectedMonomer, setSelectedMonomer] = useState(null);

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
                console.error('Failed to fetch data');
                return;
            }
            const data = await response.json();
            setSvgDepiction(data.data.svg);
            setMonomers(data.data.monomers);
            setSequences(getSequences(bilnValue));
        } catch (error) {
            console.error(error);
        }
    }

    const handleMonomerHover = (monomerIdx) => {
        setHoveredMonomer(monomerIdx);
    }

    const handleMonomerLinking = (monomer1, monomer2) => {
        // For now, assume the new connection should use these values:
        const connectionCounter = 1; // In a real scenario, you’d update/increment this
        const fixedR3 = 3; // Fixed R3 number for this example

        const res_idx1 = monomer1['res-idx'];
        const res_idx2 = monomer2['res-idx'];
        console.log('bilnValue', bilnValue);
        console.log('Linking monomers', res_idx1, res_idx2);
        
        const bilnParts = bilnValue.split(/([.-])/);
        for (let i=0 ; i < bilnParts.length; i+=2) {
            console.log(bilnParts[i]);
        }

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
                    <FormGroup>
                        <FormControlLabel
                            control={<Switch
                                size="small"
                                checked={isShowingAtomIndices}
                                onChange={(e) => setIsShowingAtomIndices(e.target.checked)}
                            />}
                            label="Show bond indices"
                        />
                    </FormGroup>
                </div>

                {/* Render one monomer list per sequence */}
                {sequences.map((seq, seqIdx) => {
                    // For each sequence, split it into monomers by hyphen
                    // and assign a global residue index.
                    const filteredMonomers = seq
                        .split('-')
                        .map((monomer) => {
                            const currentIndex = globalResidueIndex;
                            globalResidueIndex++;
                            // Look up the monomer in the monomers array by its 'res-idx' property.
                            // For example, if monomer is "A" and currentIndex is 0, we look for "A-0".
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
                            handleMonomerLinking={handleMonomerLinking}
                        />
                    );
                })}

                <SvgDepictionContainer
                    svgData={svgDepiction}
                    svgContainer={svgContainer}
                    handleMonomerHover={handleMonomerHover}
                    hoveredMonomer={hoveredMonomer}
                />
            </div>

        </>
    );
}

export default DesignPeptideContainer;

// {sequences.map((seq, seqIdx) => (
//     <div key={seqIdx}>
//         {seq.split('-').map((monomer) => {
//             const currentIndex = globalResidueIndex;
//             globalResidueIndex++;
//             return (
//                 <span key={currentIndex}>
//                     {monomer}{currentIndex}{" "}
//                 </span>
//             );
//         })}
//     </div>
// ))}