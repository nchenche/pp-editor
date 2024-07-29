/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, memo } from 'react';
import { Sortable } from 'sortablejs';

import { MONOMERS } from '../../data/monomers'


// const SequenceInput = React.memo(({value, onChange}) => {
//     return (
//         <>
//             <form className='mb-1'>
//                 <label className="flex items-center gap-2 input input-bordered">
//                     <input
//                         type="text"
//                         className="grow"
//                         placeholder="P-E-P-T-I-D-E"
//                         value={value}
//                         onChange={(e) => onChange(e.target.value)}
//                     />

//                     <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         viewBox="0 0 16 16"
//                         fill="currentColor"
//                         className="h-4 w-4 opacity-70">
//                         <path
//                             fillRule="evenodd"
//                             d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
//                             clipRule="evenodd" />
//                     </svg>
//                 </label>

//             </form>

//         </>
//     );
// });


// const SequenceContainer = React.memo(({ sequence, onReorder }) => {
//     console.log("%c RENDERING SEQ CONTAINER", "background-color: lightgreen; padding: 1em;");

//     const containerRef = useRef(null);

//     useEffect(() => {
//         if (containerRef.current) {
//             const sortable = Sortable.create(containerRef.current, {
//                 animation: 150,
//                 onEnd: (evt) => {
//                     const newOrder = Array.from(containerRef.current.children).map(child => child.textContent);
//                     onReorder(newOrder);
//                 },
//             });

//             return () => sortable.destroy();
//         }
//     }, [onReorder]);

//     return (
//         <div ref={containerRef} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
//             {sequence.map((monomer, index) => (

//                 <MonomerItem monomer={monomer} key={`${monomer.symbol}-${index}`} />
//             ))}
//         </div>
//     );
// });


function SequenceInput( {value, onChange} ) {
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
};


const MonomerItem = React.memo(({ monomer }) => {
    console.log("%c RENDERING MONOMER", "background-color: lightgreen; padding: 1em;");

    const colorClassMap = {
        'natural': 'bg-yellow-300/50',
        'non-natural': 'bg-gray-400/50',
        'cap': 'bg-red-400/50'
    }    
    
    return (
        <div 
            className={`monomer-item border-2 border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg ${colorClassMap[monomer.m_subtype]} font-medium text-[0.5rem] select-none cursor-move`}
            data-name={monomer.m_name} data-symbol={monomer.symbol} >
            {monomer.symbol}
        </div>
    );
});



function SequenceContainer({ sequence, onReorder }) {
    console.log("%c RENDERING SEQ CONTAINER", "background-color: lightgreen; padding: 1em;");

    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            const sortable = Sortable.create(containerRef.current, {
                animation: 150,
                onEnd: () => {
                    const newOrder = Array.from(containerRef.current.children).map(child => child.textContent);
                    onReorder(newOrder);
                },
            });

            return () => sortable.destroy();
        }
    }, [onReorder]);

    return (
        <div ref={containerRef} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {sequence.map((monomer, index) => (

                <MonomerItem monomer={monomer} key={`${monomer.symbol}-${index}`} />
            ))}
        </div>
    );
};


function PeptideEditor() {
    console.log("%c RENDERING EDITOR", "background-color: lightgreen; padding: 1em;");

    const [inputText, setInputText] = useState('');

    const sequence = useMemo(() => {
        const tokens = inputText.split('-');
        return tokens.map((token) => MONOMERS.find((m) => m.symbol === token)).filter(Boolean);
    }, [inputText]);

    const handleReorder = (newOrder) => {
        setInputText(newOrder.join('-'));
    };

    return (
            <div className='container mx-auto min-w-[600px] w-6/12 border border-slate-500 rounded-md p-2 mt-4'>
                <SequenceInput value={inputText} onChange={setInputText} />

                <div className="divider"></div>

                <div className='flex justify-center mx-auto min-w-[600px] w-9/12 min-h-[250px] border border-slate-400 rounded-md p-2 mt-4 gap-1'>
                    <SequenceContainer sequence={sequence} onReorder={handleReorder} />
                </div>                
            </div>
    );
}



export default PeptideEditor;