import { useEffect, useState } from 'react';
// import '../../styles/SvgDepictionContainer.css';

import { FaEye, FaEyeSlash } from 'react-icons/fa';
import panzoom from 'panzoom';


export const SvgDepictionContainer = ({
    svgData,
    svgContainer,
    handleMonomerHover,
    hoveredMonomer,
    isShowingAtomIndices,
    handleShowingAtomIndices,
    handleMonomerLinking,
    handleBondBreaking,
    error
}) => {
    const [isShowRGroups, setIsShowRGroups] = useState(false);
    const [isShowBonds, setIShowBonds] = useState(false);
    const [monomersToLink, setMonomersToLink] = useState([]);

    const _addClassName = (element, className) => {
        if (!element) return;
        element.classList.add(className);
    };

    const _removeClassName = (element, className) => {
        if (!element) return;
        element.classList.remove(className);
    };

    const _createRect = (group, attr, pad) => {
        // Default padding value
        const padding = pad ? pad : 10;

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

        for (const [key, value] of Object.entries(attr)) {
            rect.setAttribute(key, value);
        }
        return rect;
    };

    const handleShowRGroups = () => {
        setIsShowRGroups((prevState) => {
            const newState = !prevState;
            if (newState) {
                svgContainer.current
                    .querySelectorAll('svg g .r-group rect')
                    .forEach((rect) => {
                        rect.classList.add('visible');
                    });
            } else {
                svgContainer.current
                    .querySelectorAll('svg g .r-group rect')
                    .forEach((rect) => {
                        rect.classList.remove('visible');
                    });
            }
            return newState;
        });
    };


    const handleShowBonds = () => {
        setIShowBonds((prevState) => {
            const newState = !prevState;
            if (newState) {
                svgContainer.current
                    .querySelectorAll('svg g.bond.type-other rect')
                    .forEach((rect) => {
                        rect.classList.add('visible');
                    });
            } else {
                svgContainer.current
                    .querySelectorAll('svg g.bond.type-other rect')
                    .forEach((rect) => {
                        rect.classList.remove('visible');
                    });
            }
            return newState;
        });
    };

    const onMouseEnterGroup = (event) => {
        const group = event.currentTarget;
        const residueIndex = group.className.baseVal?.split('residue-')[1];
        handleMonomerHover(residueIndex);
    };

    const onMouseLeaveGroup = () => {
        handleMonomerHover('');
    };

    const onRGroupClick = (event) => {
        if (!svgData || !svgContainer?.current) return;

        // 1. grab the class string
        const base = event.currentTarget.className.baseVal;

        // 2. extract the indices_<whatever> token
        const match = base.match(/(?:^|\s)indices_([^\s]+)/);
        if (!match) return;
        const indices = match[1];         // e.g. "D_Pen-0_2" or "C-1_2"

        // 3. split on the *last* underscore
        const sep = indices.lastIndexOf('_');
        const residue = indices.slice(0, sep);    // "D_Pen-0"
        const rgroup = indices.slice(sep + 1);   // "2"

        console.log('parsed→', { residue, rgroup, indices });

        // 4. update state
        setMonomersToLink((prev) => [
            ...prev,
            { residue, rgroup, indices }
        ]);
    };

    const onBondClick = (event) => {
        if (!svgData || !svgContainer?.current) return;
        event.preventDefault();
        event.stopPropagation();

        const group = event.currentTarget.className.baseVal;

        // For residues, we capture numbers after "residues_" and after a preceding underscore with letters and a dash.
        // For rgroups, we capture numbers after "rgroups_" and then those following an underscore preceded by digits (from the first number)
        const regex_residues = /(?<=residues_[A-Za-z]+-)(\d+)|(?<=_[A-Za-z]+-)(\d+)/g;
        const regex_rgroups = /(?<=rgroups_)(\d+)|(?<=rgroups_\d+_)(\d+)/g;

        // Extract indices using matchAll
        const residue_indices = Array.from(group.matchAll(regex_residues), m => Number(m[1] || m[2]));
        const rgroup_indices = Array.from(group.matchAll(regex_rgroups), m => Number(m[1] || m[2]));

        handleBondBreaking(residue_indices, rgroup_indices);
    };

    // Effect to watch for changes to monomersToLink
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        if (monomersToLink.length === 0) {
            return;
        }

        const svgRect = svgContainer.current.querySelector('svg rect');

        // Get the group corresponding to the selected monomer
        const resGroup_idx = monomersToLink[0].indices;
        const group = svgContainer.current.querySelector(`.indices_${resGroup_idx}`);

        // When one monomer is selected, log it.
        if (monomersToLink.length === 1) {
            console.log("Selected monomer:", monomersToLink[0]);
            if (!group) return;
            _addClassName(group, 'selected');
            _addClassName(svgRect, 'linking-mode');
        }
        // When two monomers are selected, perform linking.
        else if (monomersToLink.length === 2) {
            // If the selected monomers are different, link them.
            if (monomersToLink[0].indices !== monomersToLink[1].indices) {
                handleMonomerLinking(monomersToLink[0], monomersToLink[1]);
            } else {
                console.log("Same monomer selected. Resetting selection.");
            }

            // Reset the selection:
            setMonomersToLink(() => []);
            _removeClassName(group, 'selected');
            _removeClassName(svgRect, 'linking-mode');
        }
    }, [monomersToLink]);

    // Effect to add rect elements and event listeners for hover functionality
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const groups = svgContainer.current.querySelectorAll('svg g');
        groups.forEach(group => {
            let padding = 10;
            const groupClasses = group.classList;
            const attr = { 'fill': 'transparent' };
            const rect = _createRect(group, attr, padding);

            const bbox = group.getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;

            // Set the attributes for the rect element
            if (groupClasses.contains('r-group')) {
                padding = 10;
                if (isShowRGroups) {
                    rect.classList.add("visible");
                }
                group.addEventListener("click", onRGroupClick);
            } else if (groupClasses.contains('bond') && groupClasses.contains('type-other')) {
                padding = 8;
                if (isShowBonds) {
                    rect.classList.add("visible");
                }
                group.addEventListener("dblclick", onBondClick);

                // // Create an <image> element for the bond-break icon.
                // const imageElem = document.createElementNS("http://www.w3.org/2000/svg", "image");
                // imageElem.setAttribute("href", "/icon_bond-break2.svg");
                // imageElem.setAttribute("width", "20%");
                // imageElem.setAttribute("transform", `translate(${centerX - 8}, ${centerY - 8}) scale(0.25)`);
                // // Optionally, add a class so you can adjust positioning in CSS.
                // imageElem.classList.add("bond-break-icon");
                // // Append the image element to the group (or insert it after the rect).
                // group.appendChild(imageElem);

            } else {
                rect.classList.add("hover-residue");
            }

            // Insert the rect as the first child so it lies behind the other elements
            group.insertBefore(rect, group.firstChild);

            // Add hover event listeners
            group.addEventListener("mouseenter", onMouseEnterGroup);
            group.addEventListener("mouseleave", onMouseLeaveGroup);
        });

        return () => {
            if (svgContainer?.current) {
                //     svgContainer.current.querySelectorAll('svg g').forEach(group => {
                //         group.removeEventListener("mouseenter", onMouseEnterGroup);
                //         group.removeEventListener("mouseleave", onMouseLeaveGroup);
                //     });
                svgContainer.current.querySelectorAll('svg g').forEach(group => {
                    group.removeEventListener("click", onRGroupClick);
                    group.removeEventListener("click", onBondClick);
                });
            }
        };
    }, [svgData, svgContainer]);

    // Effect to highlight the group corresponding to the hovered monomer
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const svgElement = svgContainer.current.querySelector('svg');
        if (!svgElement) return;

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
            svgElement.classList.add('monomer-hover');
        } else {
            svgElement.classList.remove('monomer-hover');
        }
    }, [svgData, hoveredMonomer, svgContainer]);

    // Effect to add panzoom functionality
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const svgElement = svgContainer.current.querySelector('svg');
        if (!svgElement) return;

        // Initialize panzoom on the svg element.
        const panZoomInstance = panzoom(svgElement, {
            minZoom: 0.1,
            bounds: true,
            boundsPadding: 0.1,
            zoomSpeed: 0.1,
        });

        // Double-click handler to reset pan/zoom.
        const dblClickHandler = (event) => {
            event.preventDefault();
            panZoomInstance.moveTo(0, 0);
            panZoomInstance.zoomAbs(0, 0, 0.5);
        };

        svgElement.addEventListener('dblclick', dblClickHandler);

        return () => {
            svgElement.removeEventListener('dblclick', dblClickHandler);
            panZoomInstance.dispose();
        };
    }, [svgData, svgContainer]);

    return (
        // <div className="flex flex-col items-center mt-4 border mx-auto">
        <div className="flex flex-col items-center">
            <div className="relative w-[400px] h-[400px] mt-8 mx-10">
                {/* SVG Container */}
                <div
                    ref={svgContainer}
                    className="border border-slate-400 w-full h-full rounded-md overflow-hidden bg-white"
                >
                    {svgData ? (
                        <div dangerouslySetInnerHTML={{ __html: svgData }} />
                    ) : (
                        <div className="text-xl flex items-center justify-center h-full">
                            No data
                        </div>
                    )}
                </div>

                {/* Controls above the SVG */}
                <div className="absolute -top-6 left-0 right-0 flex justify-evenly">
                    {/* R-groups toggle */}
                    <div className="flex items-center text-sm">
                        <button
                            onClick={handleShowRGroups}
                            className="mr-2 focus:outline-none"
                            aria-label="Toggle atom indices"
                        >
                            {isShowRGroups ? <FaEye className="text-lg text-slate-700 w-4 h-4" /> : <FaEyeSlash className="text-lg text-slate-700 w-4 h-4" />}
                        </button>
                        <label htmlFor="show-rgroups">R-groups</label>
                    </div>

                    {/* Atom indices toggle */}
                    <div className="flex items-center text-sm">
                        <button
                            onClick={handleShowingAtomIndices}
                            className="mr-2 focus:outline-none"
                            aria-label="Toggle atom indices"
                        >
                            {isShowingAtomIndices ? <FaEye className="text-lg text-slate-700 w-4 h-4" /> : <FaEyeSlash className="text-lg text-slate-700 w-4 h-4" />}
                        </button>
                        <label htmlFor="show-atom-indices">Atom indices</label>
                    </div>

                    {/* Bonds toggle */}
                    <div className="flex items-center text-sm">
                        <button
                            onClick={handleShowBonds}
                            className="mr-2 focus:outline-none"
                            aria-label="Toggle atom indices"
                        >
                            {isShowBonds ? <FaEye className="text-lg text-slate-700 w-4 h-4" /> : <FaEyeSlash className="text-lg text-slate-700 w-4 h-4" />}
                        </button>
                        <label htmlFor="show-bonds">Bonds</label>
                    </div>
                </div>

            </div>

            {/* Error text under SVG */}
            <div className="text-red-500 text-sm text-center h-6">
                {error}
            </div>

        </div>
    );
};
