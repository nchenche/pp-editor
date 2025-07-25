import { useCallback } from "react";


export function useUIHandlers({
    monomers,
    uiState,
    setUiState
}) {
    const handleMonomerHover = useCallback((data) => {
        if (typeof data === 'object') {
            const monomer = monomers.find((ele) =>
                ele['res-idx'].split('-')[1] == (data.resid - 1)
            );

            if (!monomer) {
                console.warn('No matching monomer found for:', data);
                return;
            }

            setUiState((prev) => ({
                ...prev,
                hoveredMonomer: monomer['res-idx'],
            }));
        } else {
            setUiState((prev) => ({
                ...prev,
                hoveredMonomer: data,
            }));
        }
    }, [monomers]);

    return {
        handleMonomerHover
    };
}
