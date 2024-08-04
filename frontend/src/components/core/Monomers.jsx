/* eslint-disable react/prop-types */
import { useState, useEffect, useRef,  } from 'react';
import { Sortable } from 'sortablejs';

import { MONOMERS } from '../../data/monomers'


function Checkboxes({ filters }) {
    const { isNaturalsOnly, isNonNaturalsOnly, isCapsOnly, setIsNaturalsOnly, setIsNonNaturalsOnly, setIsCapsOnly } = filters;

    return (
        <>
            <form className="flex justify-center space-x-8">
                <label className="label cursor-pointer flex items-center space-x-2">
                    <input
                        className="checkbox checkbox-xs"
                        type="checkbox"
                        checked={isNaturalsOnly}
                        onChange={ (e) => setIsNaturalsOnly(e.target.checked) }
                    />
                    <span className="label-text">Naturals</span>
                </label>

                <label className="label cursor-pointer flex items-center space-x-2">
                    <input
                        className="checkbox checkbox-xs"
                        type="checkbox"
                        checked={isNonNaturalsOnly}
                        onChange={ (e) => setIsNonNaturalsOnly(e.target.checked) }
                    />
                    <span className="label-text">Non-naturals</span>
                </label>

                <label className="label cursor-pointer flex items-center space-x-2">
                    <input
                        className="checkbox checkbox-xs"
                        type="checkbox"
                        checked={isCapsOnly}
                        onChange={ (e) => setIsCapsOnly(e.target.checked) }
                    />
                    <span className="label-text">Caps</span>
                </label>
            </form>
        </>
    );
}


function SelectOptions() {
    return (
        <div>
            <select className="select select-secondary select-xs w-56 max-w-xs">
                <option disabled selected>Choose the name to display</option>
                <option>Name</option>
                <option>Symbol</option>
                <option>PDB code</option>
            </select>
        </div>
    );
}


function SearchBar({ filters }) {
    const { filterText, setFilterText } = filters;

    return (
        <>
            <form className='mb-1'>
                <label className="flex items-center gap-2 input input-bordered">
                    <input
                        type="text"
                        className="grow"
                        placeholder="Search"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 opacity-70">
                        <path
                        fillRule="evenodd"
                        d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                        clipRule="evenodd" />
                    </svg>
                </label>

            </form>

            <div className='flex items-center justify-between'>
                <Checkboxes filters={filters}/>
                <SelectOptions className='' />
            </div>

            <div className="divider"></div>
        </>
    );
}


// export function Monomer({name, subtype='natural', index}) {
//     const colorClassMap = {
//         'natural': 'bg-yellow-300/50',
//         'non-natural': 'bg-gray-400/50',
//         'cap': 'bg-red-400/50'
//     }    
    
//     return (
//         <div 
//         className={`monomer-item border-2 border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg ${colorClassMap[subtype]} font-medium text-[0.5rem] select-none cursor-pointer`}
//         data-name={name} data-index={index}>
//             {name}
//         </div>
//     );
// }


export function Monomer({ monomer, index}) {
    const colorClassMap = {
        'natural': 'bg-yellow-300/50',
        'non-natural': 'bg-gray-400/50',
        'cap': 'bg-red-400/50'
    }    
    
    return (
        <div 
        className={`monomer-item border-2 border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg ${colorClassMap[monomer.m_subtype]} font-medium text-[0.5rem] select-none cursor-pointer`}
        data-name={monomer.m_name} data-index={index} data-symbol={monomer.symbol} >
            {monomer.symbol}
        </div>
    );
}


function MonomerLibrary( {monomers, filters, onMonomerClick} ) {
    const { filterText, isNaturalsOnly, isNonNaturalsOnly, isCapsOnly } = filters;
    const componentElements = [];

    const handleMonomerClick = (event) => {
        const { dataset, classList } = event.target;

        if (!classList.contains("monomer-item")) return

        const monomer = monomers.find((m) => m.pdbName === dataset.name);
        if (monomer) {
            onMonomerClick(monomer);
        }
    };

    monomers.forEach((monomer) => {
        if ( !isNaturalsOnly && monomer.m_subtype === "natural") return
        if ( !isNonNaturalsOnly && monomer.m_subtype === "non-natural") return
        if ( !isCapsOnly && monomer.m_subtype === "cap") return
        if ( monomer.m_name.toLowerCase().indexOf(filterText.toLowerCase()) === -1) return

        componentElements.push(
            <Monomer name={monomer.pdbName} subtype={monomer.m_subtype} key={monomer.symbol} />
        )
    })

    return (
            <div className='flex gap-3 flex-wrap' onClick={handleMonomerClick}>
                {componentElements}
            </div>
    );
}


function FilterableMonomerLibrary() {
    const [filterText, setFilterText] = useState('');
    const [isNaturalsOnly, setIsNaturalsOnly] = useState(true);
    const [isNonNaturalsOnly, setIsNonNaturalsOnly] = useState(true);
    const [isCapsOnly, setIsCapsOnly] = useState(true);
    const [sequence, setSequence] = useState([]);  // State for the sequence of selected monomers

    const filters = {
        filterText,
        setFilterText,
        isNaturalsOnly,
        setIsNaturalsOnly,
        isNonNaturalsOnly,
        setIsNonNaturalsOnly,
        isCapsOnly,
        setIsCapsOnly,
    };

    const handleMonomerClick = (monomer) => {
        setSequence([...sequence, monomer]);
    };

    return (
        <div className='container mx-auto min-w-[600px] w-6/12 border border-slate-500 rounded-md p-2 mt-4'>
            <SearchBar filters={filters} />
            <MonomerLibrary monomers={MONOMERS} filters={filters} onMonomerClick={handleMonomerClick}  />
            <SequenceContainer sequence={sequence} />
        </div>
    );
}

function SequenceContainer({ sequence }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            // Initialize SortableJS on the container element
            Sortable.create(containerRef.current, {
                animation: 150,
                ghostClass: 'bg-blue-600',
            });
        }
    }, [sequence]); // Re-run effect if the `sequence` prop changes

    const monomerSequence = []
    sequence.map( (monomer, index) => {
        monomerSequence.push(<Monomer name={monomer.symbol} subtype={monomer.m_subtype} key={index} />)
    });

    return (
        <div ref={containerRef} className='flex justify-center mx-auto min-w-[600px] w-6/12 min-h-[250px] border border-slate-500 rounded-md p-2 mt-4 gap-1'>
            {monomerSequence}
        </div>
    );
}

export default FilterableMonomerLibrary;