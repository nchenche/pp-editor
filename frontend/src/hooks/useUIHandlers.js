import { useCallback } from "react";


// export function useUIHandlers({
//     monomers,
//     setUiState
// }) {
//     const handleMonomerHover = useCallback((newIdx) => {
//         let newResIdx = newIdx;
//         if (typeof newIdx === 'object' && newIdx !== null) {
//             const monomer = monomers.find((ele) =>
//                 ele['res-idx'].split('-')[1] == (newIdx.resid - 1)
//             );
//             newResIdx = monomer ? monomer['res-idx'] : '';
//             if (!monomer) {
//                 console.warn('No matching monomer found for:', newIdx);
//             }
//         }
//         setUiState(prev => (
//             prev.hoveredMonomer === newResIdx ? prev : { ...prev, hoveredMonomer: newResIdx }
//         ));
//     }, [monomers, setUiState]);

//     return {
//         handleMonomerHover
//     };
// }

export function useUIHandlers({ monomers, setHoveredMonomer }) {
    const handleMonomerEnter = useCallback((newIdx) => {
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
    }, [monomers, setHoveredMonomer]);

    const handleMonomerLeave = useCallback(() => {
        setHoveredMonomer('');
    }, [setHoveredMonomer]);

    return {
        handleMonomerEnter,
        handleMonomerLeave,
    };
}