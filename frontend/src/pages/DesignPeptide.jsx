import { useEffect, useState, useRef } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

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

    const containerSize = 400;
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
            group.addEventListener("mouseenter", onMouseEnterGroup, this);
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
            className={`border border-slate-400 m-4 w-[${containerSize}px] mx-auto rounded-md overflow-hidden bg-white`}
        >
            {svgData ? (
                <div className="" dangerouslySetInnerHTML={{ __html: svgData }}></div>
            ) : (
                <div className='text-2xl'>No data</div>
            )}
        </div>
    );
};


const MonomerItem = ({ monomer, hoveredMonomer, handleMonomerHover }) => {
    const isHovered = monomer['res-idx'] === hoveredMonomer;

    return (
        <div
            className={`
                text-md border border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg 
                font-medium text-[0.8rem] select-none cursor-pointer
                ${isHovered ? 'outline outline-2' : ''}`}
            onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
            onMouseLeave={() => handleMonomerHover('')}
        >
            {monomer.m_abbr}
        </div>
    );
}


const MonomerList = ({ monomers, monomerListRef, handleMonomerHover, hoveredMonomer }) => {
    return (
        <div
            ref={monomerListRef}
            className='flex min-h-12 border p-2 gap-x-1'
        >
            {monomers.map((monomer, index) => (
                <MonomerItem
                    key={index}
                    monomer={monomer}
                    hoveredMonomer={hoveredMonomer}
                    handleMonomerHover={handleMonomerHover}
                />
            ))}
        </div>
    );
}


const DesignPeptideContainer = ({ children }) => {
    const [bilnValue, setBilnValue] = useState('A-C');
    const [svgDepiction, setSvgDepiction] = useState('');
    const [monomers, setMonomers] = useState([]);

    const [hoveredMonomer, setHoveredMonomer] = useState(null);
    const svgContainer = useRef(null);
    const monomerListRef = useRef(null);

    const URL = 'http://0.0.0.0:5000/api/core/molecules/depiction/2d'
    const query = `?sequence=${bilnValue}&mode=rdkit`

    const fetchData = async () => {
        try {
            const response = await fetch(URL + query);
            if (!response.ok) {
                console.error('Failed to fetch data');
                return;
            }
            const data = await response.json();
            setSvgDepiction(data.data.svg);
            setMonomers(data.data.monomers);
        } catch (error) {
            console.error(error);
        }
    }

    const handleMonomerHover = (monomerIdx) => {
        setHoveredMonomer(monomerIdx);
    }

    useEffect(() => {
        if (!bilnValue) return;
        fetchData();

    }, [query]);

    return (
        <div className="border border-red-500 p-2 m-4 w-3/5 mx-auto">
            <InputBiln value={bilnValue} onChangeValue={(e) => { setBilnValue(e.target.value) }}></InputBiln>

            <MonomerList
                monomers={monomers}
                monomerListRef={monomerListRef}
                handleMonomerHover={handleMonomerHover}
                hoveredMonomer={hoveredMonomer}
            />

            <SvgDepictionContainer
                svgData={svgDepiction}
                svgContainer={svgContainer}
                handleMonomerHover={handleMonomerHover}
                hoveredMonomer={hoveredMonomer}
            />
        </div>
    );
}

export default DesignPeptideContainer;