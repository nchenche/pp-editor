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

    const handleMonomerHover = useCallback((data) => {
        if (isDragging) return; // Ignore hover events while dragging

        if (!data) {
            setHoveredMonomer('');
            return;
        }
        if (typeof data === 'string') {
            setHoveredMonomer(data);
            return;
        }
        if (data.origin === 'molstarViewer') {
            // Only allow hover from the main structure to drive chain-slot highlighting.
            // Template/unknown hover should not affect peptide UI.
            if (data.target && data.target !== 'main') {
                setHoveredMonomer('');
                return;
            }
        }

        if (data.origin === 'molstarViewer' && data.resid) {
            const monomer = monomers.find((ele) =>
                ele['res-idx'].split('-')[1] == (data.resid - 1)
            );
            const newResIdx = monomer ? monomer['res-idx'] : '';
            if (newResIdx) {
                setHoveredMonomer(newResIdx);
            } else {
                console.warn('No matching monomer found for resid:', data.resid);
                setHoveredMonomer('');
            }
        }
    }, [monomers, setHoveredMonomer, isDragging]);

    return {
        handleMonomerEnter,
        handleMonomerLeave,
        handleMonomerHover,
    };
}