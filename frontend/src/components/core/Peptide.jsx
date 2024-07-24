import { React, useState, useEffect, useRef } from 'react';
import { Sortable } from 'sortablejs';

import { Monomer } from './Monomers.jsx';

import { MONOMERS } from '../../data/monomers'



function SequenceInput( {text, onInput} ) {

    return (
        <>
            <form className='mb-1'>
                <label className="flex items-center gap-2 input input-bordered">
                    <input
                        type="text"
                        className="grow"
                        placeholder="P-E-P-T-I-D-E"
                        value={text}
                        onChange={(e) => onInput(e.target.value)}
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


function SequenceContainer({ sequence, onSortEnd }) {
    const containerRef = useRef(null);
    const sequenceRef = useRef(sequence);

    useEffect(() => {
        sequenceRef.current = sequence; // Update the ref whenever the sequence changes
        console.log("SEQUENCE CHANGED")
    }, [sequence]);

    useEffect(() => {
        if (containerRef.current) {
            // Initialize SortableJS on the container element
            const sortable = Sortable.create(containerRef.current, {
                animation: 150,
                ghostClass: 'bg-blue-600',
                onEnd: (event) => {
                    console.log('Drag Ended');
                    const newSequence = [...sequenceRef.current];
                    console.log('New Sequence:', newSequence.map(ele=> ele.symbol));
                    const [movedItem] = newSequence.splice(event.oldIndex, 1);
                    newSequence.splice(event.newIndex, 0, movedItem);
                    console.log('Ordered Sequence:', newSequence.map(ele=> ele.symbol));

                    onSortEnd(newSequence);
                },
            });

            return () => {
                if (sortable) {
                    console.log('Destroying SortableJS');
                    sortable.destroy();
                }
            };
        }



    }, [onSortEnd]); // Re-run effect if the `sequence` prop or onSortEnd changes

    return (
        <div ref={containerRef} className='flex justify-center mx-auto min-w-[600px] w-9/12 min-h-[250px] border border-slate-400 rounded-md p-2 mt-4 gap-1'>
            {sequence.map((monomer, index) => (
                <Monomer name={monomer.symbol} subtype={monomer.m_subtype} key={index} />
            ))}
        </div>
    );
}


function PeptideEditor() {
    const [sequence, setSequence] = useState([]);  // State for the sequence of selected monomers
    const [inputText, setInputText] = useState("");  // State for the input text

    const handleInput = (value) => {
        setInputText(value);

        if (!value) {
            setSequence([]);
            return;
        }

        const tokens = value.trim().split("-");
        const newSequence = tokens.map((token) => MONOMERS.find((m) => m.symbol === token)).filter(Boolean);
        
        setSequence(newSequence);
    };


    const handleSortEnd = (newSequence) => {
        console.log('Sort Ended, New Sequence:', newSequence.map(ele=> ele.symbol));
        setSequence(newSequence);
        const newInputText = newSequence.map(monomer => monomer.symbol).join("-");
        setInputText(newInputText);
    };


    return (
        <div>
            <div className='container mx-auto min-w-[600px] w-6/12 border border-slate-500 rounded-md p-2 mt-4'>
                <SequenceInput text={inputText} onInput={handleInput} />
                <div className="divider"></div>
                <SequenceContainer sequence={sequence} onSortEnd={handleSortEnd} />
            </div>
        </div>
    );
}


export default PeptideEditor;