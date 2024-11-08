/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/Fetchers'


export const MolDisplayer = ({
    smiles,
    selectedBonds = [],
    queryParams = {},
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
}) => {
    const baseURL = "http://0.0.0.0:5000/api/rdkit/generate-svg";
    const params = new URLSearchParams();
    const payload = JSON.stringify({ smiles });
    const isSelectableBonds = selectableBonds;
    const isSelectableMolecules = selectableMolecules;

    // Update queryParams
    for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) {
            value.forEach(val => params.append(key, val));
        } else if (value !== undefined && value !== null) {
            params.append(key, value);
        }
    }

    const url = `${baseURL}?${params.toString()}`;
    const { data, isLoading, error } = useFetchData(url, payload);
    const svgContainer = useRef(null);


    const addClassName = (targetSelector, newClassName) => {
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((bond) => {
            bond.classList.add(newClassName);
        });
    }

    const removeClassName = (targetSelector, className) => {
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((bond) => {
            bond.classList.remove(className);
        });
    }

    useEffect(() => {
        // Add event listeners if the SVG is rendered and the handlers are provided
        if (svgContainer.current && onBondClick) {
            svgContainer.current.addEventListener('click', onBondClick, true);
        };

        // Cleanup: Remove the event listeners when SVG changes or the component unmounts
        return () => {
            if (svgContainer.current && onBondClick) {
                svgContainer.current.removeEventListener('click', onBondClick, true);
            }
        };
    }, [smiles, onBondClick]);


    useEffect(() => {  // make bonds visually selectable
        if (!svgContainer.current || !isSelectableBonds) return;
        addClassName('.bond-highlight-path', 'selectable');

        return () => {
            if (!svgContainer.current) return
            removeClassName('.bond-highlight-path', 'selectable');
        };
    })

    useEffect(() => {   // make molecules visually selectable
        if (!svgContainer.current || !isSelectableMolecules) return;
        addClassName('g.group-molecule', 'selectable');

        return () => {
            if (!svgContainer.current) return
            removeClassName('g.group-molecule', 'selectable');
        };
    })

    useEffect(() => {
        // Select the SVG container
        if (!selectedBonds.length || !svgContainer.current) return;

        // Add 'selected' class to groups matching selectedBonds indices
        selectedBonds.forEach((idx) => {
            const bondGroup = svgContainer.current.querySelector(`g.group-bond-${idx}`);
            if (bondGroup) {
                bondGroup.classList.add('selected');
            }
        });

        return () => {
            if (svgContainer.current) {
                // Remove 'selected' class from all <g> elements to reset
                const allBondGroups = svgContainer.current.querySelectorAll('g.group-bond');
                allBondGroups.forEach((group) => {
                    group.classList.remove('selected');
                });
            }
        };
    });

    useEffect(() => {
        // Select the SVG container
        if (selectedFragment === -1 || !svgContainer.current) return;
        console.log("frag index:", selectedFragment);
        addClassName(`.molecule-${selectedFragment}`, 'selected');

        return () => {
            if (!svgContainer.current) return
            removeClassName(`g.molecule-${selectedFragment}`, 'selected');
        };
    });

    if (!smiles.length) return;

    return (
        <>
            {isLoading && <p>Loading...</p>}

            {/* Render the SVG if available */}
            {data && (
                <div className="w-80 h-80 border mx-auto mt-2 bg-white">
                    <div
                        ref={svgContainer}
                        className='w-full h-full overflow-hidden'
                        dangerouslySetInnerHTML={{ __html: data.data }} /> {/* Inject SVG into the DOM */}
                </div>
            )}

            {/* Error handling */}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </>
    )
}
