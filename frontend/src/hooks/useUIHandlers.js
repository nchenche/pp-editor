import { useCallback } from "react";


export function useUIHandlers({ monomers, setHoveredMonomer, isDragging }) {
    const handleMonomerEnter = useCallback((newIdx) => {
        if (isDragging) return; // Ignore hover events while dragging

        let newResIdx = newIdx;
        if (typeof newIdx === 'object' && newIdx !== null) {
            const monomer = monomers.find((ele) =>
                ele['res-idx'].split('-')[1] == (newIdx.resid - 1)
            );
            newResIdx = monomer ? monomer['res-idx'] : '';
            if (!monomer) {
                console.warn('No matching monomer found for:', newIdx);
            }
        }
        setHoveredMonomer(newResIdx);
    }, [monomers, setHoveredMonomer, isDragging]);

    const handleMonomerLeave = useCallback(() => {
        if (isDragging) return; // Ignore hover events while dragging

        setHoveredMonomer('');
    }, [setHoveredMonomer, isDragging]);

    return {
        handleMonomerEnter,
        handleMonomerLeave,
    };
}