import { useCallback, useEffect, useState } from 'react';

const emptyMapping = {
    enabled: false,
    chainId: null,
    start: null,
    end: null,
    offset: 0,
};

export function useScaffoldMappings(rowMonomerLists) {
    const [scaffoldMappings, setScaffoldMappings] = useState([]);

    const handleEditScaffoldMapping = useCallback((seqIdx, patch) => {
        setScaffoldMappings((prev) => {
            const next = prev.slice();
            next[seqIdx] = { ...(next[seqIdx] ?? emptyMapping), ...patch };
            return next;
        });
    }, []);

    useEffect(() => {
        setScaffoldMappings((prev) => {
            const targetLen = rowMonomerLists.length;
            if (prev.length === targetLen) return prev;
            return Array.from({ length: targetLen }, (_, i) => prev[i] ?? emptyMapping);
        });
    }, [rowMonomerLists]);

    return { scaffoldMappings, handleEditScaffoldMapping };
}