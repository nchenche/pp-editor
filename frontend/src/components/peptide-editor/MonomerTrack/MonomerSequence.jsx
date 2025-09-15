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
    isDragging = true,
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

                // const monomerIdx = parseInt(monomer['res-idx'].split('-')[1]);
                // console.log("Monomer idx:", monomer);

                // Find all link IDs where this monomerIdx appears
                // const linkIndices = Object.entries(linkMap)
                //     .filter(([linkId, pairs]) => pairs.some(p => p.monomerIdx === monomerIdx))
                //     .map(([linkId]) => linkId);

                // Prefer stable, precomputed link IDs attached to the monomer
                let linkIndices = Array.isArray(monomer.linkIds) ? monomer.linkIds : [];

                // Fallback (only if needed): compute from linkMap by current index
                if (!linkIndices.length && linkMap) {
                    const monomerIdx = parseInt(String(monomer['res-idx']).split('-')[1], 10);
                    linkIndices = Object.entries(linkMap)
                        .filter(([, pairs]) => pairs?.some(p => p.monomerIdx === monomerIdx))
                        .map(([linkId]) => linkId);
                }

                if (isDragging) linkIndices = []; // avoid flicker during reorder

                return (
                    <MonomerItem
                        key={monomer.uid || monomer._id || monomer['res-idx']}
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