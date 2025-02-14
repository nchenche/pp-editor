import { useEffect, useState } from 'react';
import '../../styles/SvgDepictionContainer.css';

import panzoom from 'panzoom';


const SvgDepictionContainer = ({
    svgData,
    svgContainer,
    handleMonomerHover,
    hoveredMonomer,
    isShowingAtomIndices,
    handleShowingAtomIndices,
    handleMonomerLinking,
    error
}) => {
    const [isShowRGroups, setIsShowRGroups] = useState(true);

    const handleShowRGroups = (event) => {
        setIsShowRGroups(event.target.checked);
        if (event.target.checked) {
            svgContainer.current.querySelectorAll('svg g .r-group rect').forEach(rect => {
                rect.classList.add('visible');
            });
        } else {
            svgContainer.current.querySelectorAll('svg g .r-group rect').forEach(rect => {
                rect.classList.remove('visible');
            })
        };
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
        const group = event.currentTarget;
        const indices = group.className.baseVal.split('indices_')[1];
        const residueIndex = indices.split('_')[0];
        const rGroupIndex = indices.split('_')[1];

        // console.log(`Residue clicked: ${residueIndex}`);
        // console.log(`R-group clicked: ${rGroupIndex}`);

        handleMonomerLinking(residueIndex, rGroupIndex);
    };

    const createRect = (group, attr, pad) => {
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

    // Effect to add rect elements and event listeners for hover functionality
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const groups = svgContainer.current.querySelectorAll('svg g');
        groups.forEach(group => {
            let padding = 10;

            // Set the attributes for the rect element
            const attr = { 'fill': 'transparent' };
            if (group.classList.contains('r-group')) {
                // attr['rx'] = '8%';
                padding = 14;
            }

            // Create a rect element
            const rect = createRect(group, attr, padding);

            // Add a class for styling.
            if (!group.classList.contains('r-group')) {
                rect.classList.add("hover-residue");
            } else {
                if (isShowRGroups) {
                    rect.classList.add("visible");
                }
                group.addEventListener("click", onRGroupClick);
            }

            // Insert the rect as the first child so it lies behind the other elements
            group.insertBefore(rect, group.firstChild);

            // Add hover event listeners
            // group.addEventListener("mouseenter", onMouseEnterGroup);
            // group.addEventListener("mouseleave", onMouseLeaveGroup);
        });

        return () => {
            if (svgContainer?.current) {
                //     svgContainer.current.querySelectorAll('svg g').forEach(group => {
                //         group.removeEventListener("mouseenter", onMouseEnterGroup);
                //         group.removeEventListener("mouseleave", onMouseLeaveGroup);
                //     });
                    svgContainer.current.querySelectorAll('svg g').forEach(group => {
                        group.removeEventListener("click", onRGroupClick);
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
        <div className="flex justify-center mt-3 mb-10">
            {/* SVG Container */}
            <div className="w-[400px] h-[400px]">
                <div
                    ref={svgContainer}
                    className="border border-slate-400 w-[400px] h-[400px] rounded-md overflow-hidden bg-white"
                >
                    {svgData ? (
                        <div dangerouslySetInnerHTML={{ __html: svgData }} />
                    ) : (
                        <div className="text-xl flex items-center justify-center h-full">
                            No data
                        </div>
                    )

                    }
                </div>
                <div className="text-red-500 text-sm text-center h-16">
                    {error}
                </div>
            </div>

            {/* Right Panel */}
            <div className="ml-4 flex flex-col gap-y-2">
                <div className="flex items-center text-sm">
                    <input
                        type="checkbox"
                        id="show-rgroups"
                        name="show-rgoups"
                        className="mr-2"
                        checked={isShowRGroups}
                        onChange={handleShowRGroups}
                    />
                    <label htmlFor="show-rgroups">Show free R-groups</label>
                </div>

                <div className="flex items-center text-sm">
                    <input
                        type="checkbox"
                        id="show-atom-indices"
                        name="show-atom-indices"
                        className="mr-2"
                        checked={isShowingAtomIndices}
                        onChange={handleShowingAtomIndices}
                    />
                    <label htmlFor="show-atom-indices">Show atom indices</label>
                </div>

            </div>
        </div>
    );
};

export default SvgDepictionContainer;