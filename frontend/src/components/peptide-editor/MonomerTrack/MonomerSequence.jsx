import { useRef, useEffect } from "react";

import { MonomerItem } from './MonomerItem';

function mergeRefs(...refs) {
    return (node) => {
        refs.forEach(ref => {
            if (typeof ref === "function") {
                ref(node);
            } else if (ref && typeof ref === "object") {
                ref.current = node;
            }
        });
    };
}


export const MonomerSequence = ({
    monomers,
    linkMap,
    hoveredMonomer,
    onDelete,
    children,  // placeholder will be passed here
    droppableRef,
    handleMonomerEnter,
    handleMonomerLeave,
}) => {

    return (
        <div
            ref={mergeRefs(droppableRef)}
            className='monomer-sequence flex min-h-12 border p-2 gap-x-1 m-1'
        >
            {monomers.map((monomer, index) => {
                const isNterCap = monomer.m_subtype === 'cap' && monomer.m_RgroupIdx[1] !== null;
                const isCterCap = monomer.m_subtype === 'cap' && monomer.m_RgroupIdx[0] !== null;
                const isHovered = monomer['res-idx'] === hoveredMonomer;


                const monomerIdx = parseInt(monomer['res-idx'].split('-')[1]);


                // Find all link IDs where this monomerIdx appears
                const linkIndices = Object.entries(linkMap)
                    .filter(([linkId, pairs]) => pairs.some(p => p.monomerIdx === monomerIdx))
                    .map(([linkId]) => linkId);

                return (
                    <MonomerItem
                        key={monomer['res-idx']}
                        index={index}
                        monomer={monomer}
                        handleMonomerEnter={handleMonomerEnter}
                        handleMonomerLeave={handleMonomerLeave}
                        onDelete={onDelete}
                        isNterCap={isNterCap}
                        isCterCap={isCterCap}
                        linkIndices={linkIndices}
                        isHovered={isHovered}
                    />
                )
            })}
            {children}
        </div>
    );
};