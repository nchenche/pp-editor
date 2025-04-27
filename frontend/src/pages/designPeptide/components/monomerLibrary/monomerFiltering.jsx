/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Toggle } from '../../../../components/ui/Switch'
import { RangeSlider } from '../../../../components/ui/Slider';


// import { log, initializeRangeFilter } from '../../utils/dev'
// import './styles.css'


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