/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGetData } from '../../hooks/Fetchers'

import { log } from '../../utils/dev'
import './styles.css'


const RangeSlider = ({ initialMin, initialMax, min, max, step, onChange }) => {
    const [minValue, setMinValue] = useState(initialMin);
    const [maxValue, setMaxValue] = useState(initialMax);

    useEffect(() => {
        setMinValue(initialMin);
        setMaxValue(initialMax);
    }, [initialMin, initialMax]);

    const handleMinChange = (e) => {
        const value = Math.min(Number(e.target.value), maxValue);
        setMinValue(value);
        onChange({ min: value, max: maxValue });
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), minValue);
        setMaxValue(value);
        onChange({ min: minValue, max: value });
    };

    const minPos = ((minValue - min) / (max - min)) * 100;
    const maxPos = ((maxValue - min) / (max - min)) * 100;

    return (
        <div className="relative my-8">
            {/* Custom style for range inputs */}
            <style>
                {`
            input[type="range"] {
              -webkit-appearance: none;
              appearance: none;
              height: 4px;
              width: 100%;
              position: absolute;
              background-color: transparent;
              pointer-events: none;
            }
  
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              height: 20px;
              width: 20px;
              background-color: #fff;
              border: 2px solid #3b82f6;
              border-radius: 50%;
              cursor: pointer;
              pointer-events: auto;
            }
  
            input[type="range"]::-moz-range-thumb {
              height: 20px;
              width: 20px;
              background-color: #fff;
              border: 2px solid #3b82f6;
              border-radius: 50%;
              cursor: pointer;
              pointer-events: auto;
            }
          `}
            </style>

            {/* Track line */}
            <div className="h-1 bg-gray-200 rounded-full" />

            {/* Colored range between thumbs */}
            <div
                className="absolute h-1 bg-blue-500 rounded-full top-0"
                style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
            />

            {/* Minimum input */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={minValue}
                onChange={handleMinChange}
                className="absolute top-0"
            />

            {/* Maximum input */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={maxValue}
                onChange={handleMaxChange}
                className="absolute top-0"
            />

            {/* Display values */}
            <div className="flex justify-between mt-4 text-sm text-gray-600">
                <span>${minValue}</span>
                <span>${maxValue}</span>
            </div>
        </div>
    );
};


const Toggle = ({ label, checked, onChange }) => {
    return (
        <label className="inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={onChange}
            />
            <div
                className="
                relative w-10 h-4 bg-gray-400 rounded-full 
                dark:bg-gray-700
                peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] peer-checked:after:left-[14px]
                after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all
                peer-checked:bg-blue-500
            "
            />

            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {label}
            </span>
        </label>
    );
};


const MonomerItem = ({ image, name, symbol }) => {
    return (
        <div className="group relative w-48 h-56 p-2 rounded-lg overflow-hidden shadow-lg hover:scale-105 transform transition-all">
            <img
                src={`data:image/png;base64,${image}`}
                alt={name}
                className="w-[80%] object-cover rounded-lg mx-auto border p-2"  // h-/4
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-end p-4 ">
                <div className="text-slate-600 text-center mx-auto">
                    <h3 className="text-md font-bold">{symbol}</h3>
                    <p className="text-sm">{name}</p>
                </div>
            </div>
        </div>
    );
};


const FilterMonomerPanel = ({ search, isCapsOnly, isNaturalsOnly, isNonNaturalsOnly, isBranchingGroup, handleFilterChange }) => {
    const [range, setRange] = useState({ min: 25, max: 75 });


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
                        initialMin={25}
                        initialMax={75}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(value) => setRange(value)}
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
    const { data, isLoading, error } = useGetData('http://0.0.0.0:5000/api/db/monomers/images');
    const dataRef = useRef(null);


    const [filters, setFilters] = useState({
        search: '',
        isCapsOnly: false,
        isNaturalsOnly: false,
        isNonNaturalsOnly: false,
        isBranchingGroup: false
    });

    const [filteredMonomers, setFilteredMonomers] = useState([]);

    useEffect(() => {
        if (!isLoading && !error && data) {
            dataRef.current = data.data || data;
            console.log('data', data.min_max_values);
            setFilteredMonomers(dataRef.current); // Initialize filteredMonomers with fetched data
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
        <div className="flex m-4 gap-x-2">
            {/* Left filter sidebar (static placeholders) */}
            <aside className="w-80 bg-gray-100 p-8 border">
                <FilterMonomerPanel
                    search={filters.search}
                    handleFilterChange={handleFilterChange}
                    isCapsOnly={filters.isCapsOnly}
                    isNaturalsOnly={filters.isNaturalsOnly}
                    isNonNaturalsOnly={filters.isNonNaturalsOnly}
                    isBranchingGroup={filters.isBranchingGroup}
                />
            </aside>

            {/* Main content area */}
            <main className="flex-1 p-6 border-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="loader">Loading...</div>
                    </div>
                ) : (
                    <ListMonomerLibrary monomers={filteredMonomers} />
                )}
            </main>

        </div>
    );
};


export default MonomerLibraryContainer;