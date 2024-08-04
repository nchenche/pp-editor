/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, memo } from 'react';

import { Sortable } from 'sortablejs';
// import { LeaderLine  from 'leader-line.min.js';

import { MONOMERS } from '../../data/monomers'


function SequenceInput({ value, onChange }) {
    return (
        <>
            <form className='mb-1'>
                <label className="flex items-center gap-2 input input-bordered">
                    <input
                        type="text"
                        className="grow"
                        placeholder="P-E-P-T-I-D-E"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
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

        </>
    );
}


const MonomerItem = React.memo(({
    monomer,
    isSelected,
    onSelect,
    index
}) => {
    const monomerRef = useRef(null);
    const colorClassMap = {
        'natural': 'bg-yellow-300/50',
        'non-natural': 'bg-gray-400/50',
        'cap': 'bg-red-400/50'
    };

    console.log(monomer.symbol,index);

    const handleClick = (e) => {
        e.stopPropagation(); // Prevent click from bubbling up
        onSelect(index);
    };

    return (
        <div
            ref={monomerRef}
            className={`monomer-item border-2 ${isSelected ? 'border-blue-400 border-dashed' : 'border-slate-500'} h-fit min-w-8 text-center w-fit py-1 rounded-xl ${colorClassMap[monomer.m_subtype]} font-medium text-[0.5rem] select-none cursor-move`}
            data-name={monomer.m_name}
            data-symbol={monomer.symbol}
            onClick={handleClick}
        >
            {monomer.symbol}
        </div>
    );
});


const SequenceContainer = React.memo(({ sequence, onReorder, index: containerIndex }) => {
    const [selectedMonomer, setSelectedMonomer] = useState(null);
    const [connections, setConnections] = useState([]);
    const containerRef = useRef(null);
    const linesRef = useRef({});


    useEffect(() => {
        if (containerRef.current) {
            const sortable = Sortable.create(containerRef.current, {
                animation: 150,
                onChange: (evt) => {

                    const newOrder = Array.from(containerRef.current.children).map(child => child.dataset.symbol);
                    console.log("Current Sequence:", newOrder.join('-'));

                    //   Update line positions during drag
                    if (linesRef.current) {
                        Object.values(linesRef.current).forEach(line => line.position());
                    }
                },
                onEnd: (evt) => {
                    const newOrder = Array.from(containerRef.current.children).map(child => child.dataset.symbol);                    

                    // Update connections based on the final new order
                    setConnections(prevConnections => {
                        return prevConnections.map(([start, end]) => {
                        const newStart = newOrder.indexOf(sequence[start].symbol);
                        const newEnd = newOrder.indexOf(sequence[end].symbol);
                        return [newStart, newEnd];
                        });
                    });
                
                    onReorder(newOrder, containerIndex);
                },
            });

            return () => sortable.destroy();
        }
    }, [onReorder, containerIndex, sequence]);

    useEffect(() => {
        //   Initial creation of lines
        connections.forEach(([start, end]) => {
            const connectionId = `${start}-${end}`;
            const startElement = containerRef.current.children[start];
            const endElement = containerRef.current.children[end];

            if (startElement && endElement && !linesRef.current[connectionId]) {
                const line = new LeaderLine(startElement, endElement, {
                    color: 'rgba(0, 0, 0, 0.5)',
                    size: 2,
                    startSocket: 'bottom',
                    endSocket: 'bottom',
                    startPlug: 'disc',
                    endPlug: 'disc',
                    path: 'grid'
                });
                linesRef.current[connectionId] = line;
            }
        });

        //   Cleanup function
        return () => {
            Object.values(linesRef.current).forEach(line => line.remove());
            linesRef.current = {};
        };
    }, [connections, sequence]);



    const handleSelect = useCallback((index) => {
        setSelectedMonomer(prev => {
            if (prev === null) {
                // First click, select the monomer
                return index;
            } else if (prev === index) {
                // Clicking the same monomer, deselect it
                return null;
            } else {
                // Second click on a different monomer, create connection
                setConnections(prevConnections => {
                    const newConnection = [prev, index];
                    // Check if this connection already exists
                    const connectionExists = prevConnections.some(
                        ([start, end]) => (start === prev && end === index) || (start === index && end === prev)
                    );
                    if (!connectionExists) {
                        return [...prevConnections, newConnection];
                    }

                    return prevConnections;
                });
                return null; // Deselect after creating connection
            }
        });
    }, []);


    const handleContainerClick = useCallback(() => {
        setSelectedMonomer(null);
    }, []);

    return (
        <div
            className='flex justify-center gap-x-1 mt-4'
            ref={containerRef}
            onClick={handleContainerClick}
        >
            {sequence.map((monomer, index) => (
                <MonomerItem
                    key={`${monomer.symbol}-${index}`}
                    monomer={monomer}
                    isSelected={selectedMonomer === index}
                    onSelect={handleSelect}
                    index={index}
                />
            ))}
        </div>
    );
});


function PeptideEditor() {
    console.log("%c RENDERING EDITOR", "background-color: lightgreen; padding: 1em;");
    const [inputText, setInputText] = useState('M-A-V-I-N-E-L');

    const sequences = useMemo(() => {
        return inputText.split('.').map(sequenceString => {
            const tokens = sequenceString.split('-');
            return tokens.map((token) => MONOMERS.find((m) => m.symbol === token)).filter(Boolean);
        });
    }, [inputText]);


    function handleReorder(newOrder, sequenceIndex) {
        const newSequences = [...sequences];

        // retrieve monomers as object to build the new sequence
        const reorderedSeq = newOrder.map((token) => MONOMERS.find((m) => m.symbol === token)).filter(Boolean);

        newSequences[sequenceIndex] = reorderedSeq;
        setInputText(newSequences.map(seq => seq.map(m => m.symbol).join('-')).join('.'));
    }

    return (
        <div className='container mx-auto min-w-[600px] w-6/12 border border-slate-500 rounded-md p-2 mt-4'>
            <SequenceInput value={inputText} onChange={setInputText} />
            <div className="divider"></div>

            <div className='flex flex-col gap-y-6 justify-center mx-auto min-w-[600px] w-9/12 min-h-[250px] border border-slate-400 rounded-md'>
                {sequences.map((sequence, index) => (
                    <SequenceContainer key={index} sequence={sequence} onReorder={(newOrder) => handleReorder(newOrder, index)} index={index} />
                ))}
            </div>
        </div>
    );
}


export default PeptideEditor;