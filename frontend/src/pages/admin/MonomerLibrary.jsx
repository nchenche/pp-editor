/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGetData } from '../../hooks/Fetchers'
import { Toggle } from '../../components/ui/Switch'
import { RangeSlider } from '../../components/ui/Slider';
import { API_BASE_URL } from '../../config';

import { log, initializeRangeFilter } from '../../utils/dev'
import './styles.css'

import { Box } from '@mui/material';

const MonomerItem = ({ image, name, symbol }) => {
    return (
        <div className="group relative w-44 h-48 p-2 rounded-lg overflow-hidden shadow-lg hover:scale-105 transform transition-all">
            <img
                src={`data:image/png;base64,${image}`}
                alt={name}
                className="w-[80%] object-cover rounded-lg mx-auto border p-2"  // h-/4
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-end p-2">
                <div className="text-slate-600 text-center mx-auto">
                    <h3 className="text-md font-bold">{symbol}</h3>
                    <p className="text-sm">{name}</p>
                </div>
            </div>
        </div>
    );
};


const FilterMonomerPanel = ({
    search,
    handleFilterChange,
    isCapsOnly,
    isNaturalsOnly,
    isNonNaturalsOnly,
    isBranchingGroup,
    rangeMolWeight,
    limitRangeMolWeight,
    rangeHBA,
    limitRangeHBA,
    rangeHBD,
    limitRangeHBD,
    rangeMolLogP,
    limitRangeMolLogP,
}) => {
    return (
        <>
            {/* Search field */}
            <div className="mb-4">
                <label htmlFor="search" className="block mb-1 text-md font-medium text-gray-700">
                    Filters
                </label>
                <input
                    id="search"
                    type="text"
                    placeholder="e.g. Alanine"
                    className="w-full px-2 py-1 border rounded-md"
                    value={search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
            </div>

            {/* Switch/Toggle placeholder */}
            <div className="mt-6">
                <div className="flex flex-col gap-y-2">
                    <Toggle
                        label="Caps only"
                        checked={isCapsOnly}
                        onChange={(e) => handleFilterChange('isCapsOnly', e.target.checked)}
                    />
                    <Toggle
                        label="Naturals only"
                        checked={isNaturalsOnly}
                        onChange={(e) => handleFilterChange('isNaturalsOnly', e.target.checked)}
                    />
                    <Toggle
                        label="Non-naturals only"
                        checked={isNonNaturalsOnly}
                        onChange={(e) => handleFilterChange('isNonNaturalsOnly', e.target.checked)}
                    />
                    <Toggle
                        label="With branching group"
                        checked={isBranchingGroup}
                        onChange={(e) => handleFilterChange('isBranchingGroup', e.target.checked)}
                    />

                    <RangeSlider
                        label="Molecular weight (g/mol)"
                        initialMin={rangeMolWeight.min}
                        initialMax={rangeMolWeight.max}
                        min={limitRangeMolWeight.min}
                        max={limitRangeMolWeight.max}
                        step={1}
                        onChange={(values) => handleFilterChange('rangeMolWt', values)}
                        classNames={{ parent: 'mt-6' }}
                    />

                    <RangeSlider
                        label="Number of H-bond acceptors"
                        initialMin={rangeHBA.min}
                        initialMax={rangeHBA.max}
                        min={limitRangeHBA.min}
                        max={limitRangeHBA.max}
                        step={1}
                        onChange={(values) => handleFilterChange('rangeNumHAcceptors', values)}
                        classNames={{ parent: 'mt-1' }}
                    />

                    <RangeSlider
                        label="Number of H-bond donors"
                        initialMin={rangeHBD.min}
                        initialMax={rangeHBD.max}
                        min={limitRangeHBD.min}
                        max={limitRangeHBD.max}
                        step={1}
                        onChange={(values) => handleFilterChange('rangeNumHDonors', values)}
                        classNames={{ parent: 'mt-1' }}
                    />

                    <RangeSlider
                        label="Molecular logP"
                        initialMin={rangeMolLogP.min}
                        initialMax={rangeMolLogP.max}
                        min={limitRangeMolLogP.min}
                        max={limitRangeMolLogP.max}
                        step={1}
                        onChange={(values) => handleFilterChange('rangeMolLogP', values)}
                        classNames={{ parent: 'mt-1' }}
                    />

                </div>
            </div>
        </>
    )
}

const ListMonomerLibrary = ({ monomers }) => {
    return (
        <div className="flex flex-wrap justify-center gap-6">
            {monomers.map((monomer) => (
                <MonomerItem
                    key={monomer._id}
                    image={monomer.image_url}
                    name={monomer.m_name}
                    symbol={monomer.symbol}
                />
            ))}
        </div>
    )
}


export const MonomerLibraryContainer = () => {
    const { data, isLoading, error } = useGetData(`${API_BASE_URL}/api/db/monomers?include_images=true`);
    const dataRef = useRef(null);

    const limitRangeMolWeight = useMemo(() => ({}), []);
    const limitRangeHBA = useMemo(() => ({}), []);
    const limitRangeHBD = useMemo(() => ({}), []);
    const limitRangeMolLogP = useMemo(() => ({}), []);


    const [filters, setFilters] = useState({
        search: '',
        isCapsOnly: false,
        isNaturalsOnly: false,
        isNonNaturalsOnly: false,
        isBranchingGroup: false,
        rangeMolWt: { min: -1, max: -1 },
        rangeNumHAcceptors: { min: -1, max: -1 },
        rangeNumHDonors: { min: -1, max: -1 },
        rangeMolLogP: { min: -1, max: -1 },
    });

    const [filteredMonomers, setFilteredMonomers] = useState([]);

    useEffect(() => {
        if (!isLoading && !error && data) {
            dataRef.current = data.data || data;

            // Initialize range filters
            initializeRangeFilter(data, 'MolWt', setFilters, limitRangeMolWeight);
            initializeRangeFilter(data, 'NumHAcceptors', setFilters, limitRangeHBA);
            initializeRangeFilter(data, 'NumHDonors', setFilters, limitRangeHBD);
            initializeRangeFilter(data, 'MolLogP', setFilters, limitRangeMolLogP);

            setFilteredMonomers(dataRef.current);  // Initialize filteredMonomers with fetched data
        }
    }, [data, isLoading, error]);

    useEffect(() => {
        if (dataRef.current) {
            let filtered = dataRef.current;

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                filtered = filtered.filter((monomer) => (
                    monomer.m_name.toLowerCase().includes(searchTerm) ||
                    monomer.symbol.toLowerCase().includes(searchTerm) ||
                    monomer.pdbName.toLowerCase().includes(searchTerm) ||
                    monomer.m_subtype.toLowerCase().includes(searchTerm) ||
                    monomer.natAnalog.toLowerCase().includes(searchTerm)
                ));
            }

            if (filters.isCapsOnly) {
                filtered = filtered.filter((monomer) => monomer.m_subtype === 'cap');
            }

            if (filters.isNaturalsOnly) {
                filtered = filtered.filter((monomer) => monomer.m_subtype === 'natural');
            }

            if (filters.isNonNaturalsOnly) {
                filtered = filtered.filter((monomer) => monomer.m_subtype === 'non-natural');
            }

            if (filters.isBranchingGroup) {
                filtered = filtered.filter((monomer) => {
                    return monomer.m_Rgroups[2] != null;
                });
            }

            if (filters.rangeMolWt.min !== -1 && filters.rangeMolWt.max !== -1) {
                filtered = filtered.filter((monomer) => (
                    monomer.properties.MolWt >= filters.rangeMolWt.min &&
                    monomer.properties.MolWt <= filters.rangeMolWt.max
                ));
            }

            if (filters.rangeNumHAcceptors.min !== -1 && filters.rangeNumHAcceptors.max !== -1) {
                filtered = filtered.filter((monomer) => (
                    monomer.properties.NumHAcceptors >= filters.rangeNumHAcceptors.min &&
                    monomer.properties.NumHAcceptors <= filters.rangeNumHAcceptors.max
                ));
            }

            if (filters.rangeNumHDonors.min !== -1 && filters.rangeNumHDonors.max !== -1) {
                filtered = filtered.filter((monomer) => (
                    monomer.properties.NumHDonors >= filters.rangeNumHDonors.min &&
                    monomer.properties.NumHDonors <= filters.rangeNumHDonors.max
                ));
            }

            if (filters.rangeMolLogP.min !== -1 && filters.rangeMolLogP.max !== -1) {
                filtered = filtered.filter((monomer) => (
                    monomer.properties.MolLogP >= filters.rangeMolLogP.min &&
                    monomer.properties.MolLogP <= filters.rangeMolLogP.max
                ));
            }

            setFilteredMonomers(filtered);
        }
    }, [filters]);

    const handleFilterChange = (filterType, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [filterType]: value,
        }));
    };

    if (error) return <p>Error: {error}</p>;
    if (!data) return null;

    return (
        <Box
            sx={{
                m: 2,
                height: '100%',
                minHeight: 0,
                display: 'flex',
                gap: 2,
            }}
        >
            {/* Fixed filter sidebar */}
            <Box
                component="aside"
                sx={{
                    width: 280,
                    flexShrink: 0,
                    bgcolor: 'grey.100',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    overflow: 'auto', // allow sidebar itself to scroll if it becomes taller than viewport
                }}
            >
                <FilterMonomerPanel
                    search={filters.search}
                    handleFilterChange={handleFilterChange}
                    isCapsOnly={filters.isCapsOnly}
                    isNaturalsOnly={filters.isNaturalsOnly}
                    isNonNaturalsOnly={filters.isNonNaturalsOnly}
                    isBranchingGroup={filters.isBranchingGroup}
                    rangeMolWeight={filters.rangeMolWt}
                    limitRangeMolWeight={limitRangeMolWeight}
                    rangeHBA={filters.rangeNumHAcceptors}
                    limitRangeHBA={limitRangeHBA}
                    rangeHBD={filters.rangeNumHDonors}
                    limitRangeHBD={limitRangeHBD}
                    rangeMolLogP={filters.rangeMolLogP}
                    limitRangeMolLogP={limitRangeMolLogP}
                />
            </Box>

            {/* Main content: header + scrollable list */}
            <Box
                component="main"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {isLoading ? (
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div className="loader">Loading...</div>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto', // only ListMonomerLibrary scrolls
                        }}
                    >
                        <ListMonomerLibrary monomers={filteredMonomers} />
                    </Box>
                )}
            </Box>
        </Box>
    );
};


export default MonomerLibraryContainer;