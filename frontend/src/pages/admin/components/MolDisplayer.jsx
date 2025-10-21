/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/Fetchers'
import { useFetchMolecule } from '../../../hooks/Fetchers'

import { API_URL } from '../../../config';


// MolDisplayer.js
import PropTypes from 'prop-types';



export const MoleculeDisplay = ({
    data,
    isLoading,
    error,
    selectedBonds = [],
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
}) => {

    const svgContainer = useRef(null);

    // Utility functions to add/remove class names
    const addClassName = (targetSelector, newClassName) => {
        if (!svgContainer.current) return;
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((element) => {
            element.classList.add(newClassName);
        });
    };

    const removeClassName = (targetSelector, className) => {
        if (!svgContainer.current) return;
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((element) => {
            element.classList.remove(className);
        });
    };

    // Handle bond click events
    useEffect(() => {
        if (svgContainer.current && onBondClick) {
            svgContainer.current.addEventListener('click', onBondClick, true);
        }

        return () => {
            if (svgContainer.current && onBondClick) {
                svgContainer.current.removeEventListener('click', onBondClick, true);
            }
        };
    }, [onBondClick, data]);

    // Make bonds selectable
    useEffect(() => {
        if (!svgContainer.current || !selectableBonds) return;
        addClassName('.bond-highlight-path', 'selectable');

        return () => {
            removeClassName('.bond-highlight-path', 'selectable');
        };
    }, [selectableBonds, data]);

    // Make molecules selectable
    useEffect(() => {
        if (!svgContainer.current || !selectableMolecules) return;
        addClassName('g.group-molecule', 'selectable');

        return () => {
            removeClassName('g.group-molecule', 'selectable');
        };
    }, [selectableMolecules, data]);

    // Highlight selected bonds
    useEffect(() => {
        if (!selectedBonds.length || !svgContainer.current) return;

        selectedBonds.forEach((idx) => {
            const bondGroup = svgContainer.current.querySelector(`g.group-bond-${idx}`);
            if (bondGroup) {
                bondGroup.classList.add('selected');
            }
        });

        return () => {
            if (!selectedBonds.length || !svgContainer.current) return;

            const allBondGroups = svgContainer.current.querySelectorAll('g.group-bond');
            allBondGroups.forEach((group) => {
                group.classList.remove('selected');
            });
        };
    }, [selectedBonds, data]);

    // Highlight selected fragment
    useEffect(() => {
        if (selectedFragment === -1 || !svgContainer.current) return;
        addClassName(`.molecule-${selectedFragment}`, 'selected');

        return () => {
            removeClassName(`.molecule-${selectedFragment}`, 'selected');
        };
    }, [selectedFragment, data]);

    // if (isLoading) {
    //     return <p>Loading...</p>;
    // }

    if (error && selectedBonds.length == 0) {
        return (
            <div>
                <div className="w-80 h-80 border mx-auto mt-2 bg-white">
                </div>
                <p className="text-red-500 text-xs mt-2">No bonds selected</p>
            </div>

        )
    } else if (error) {
        return (
            <div>
            <div className="w-80 h-80 border mx-auto mt-2 bg-white">
            </div>
            <p className="text-red-500 text-xs mt-2">{error}</p>
        </div>  
        )
    }

    return (
        <div>
            <div className="w-80 h-80 border mx-auto mt-2 bg-white">

                {data?.data && (
                    <div
                        ref={svgContainer}
                        className="w-full h-full overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: data.data }} // Inject SVG into the DOM
                    />
                )}
            </div>
        </div>
    );
};

MoleculeDisplay.propTypes = {
    data: PropTypes.object,
    isLoading: PropTypes.bool,
    error: PropTypes.string,
    selectedBonds: PropTypes.array,
    onBondClick: PropTypes.func,
    selectableBonds: PropTypes.bool,
    selectableMolecules: PropTypes.bool,
    selectedFragment: PropTypes.number,
};




export const MoleculeDisplayContainer = ({
    smiles,
    selectedBonds = [],
    queryParams = {},
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
}) => {
    const { data, isLoading, error } = useFetchMolecule(smiles, queryParams);

    if (!smiles) return null;

    return (
        <MoleculeDisplay
            data={data}
            isLoading={isLoading}
            error={error}
            selectedBonds={selectedBonds}
            onBondClick={onBondClick}
            selectableBonds={selectableBonds}
            selectableMolecules={selectableMolecules}
            selectedFragment={selectedFragment}
        />
    );
};




export const MolDisplayer = ({
    smiles,
    selectedBonds = [],
    queryParams = {},
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
}) => {
    const baseURL = `${API_URL}/molecules/svg-rendering`;
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
