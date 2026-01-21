import { useCallback, useEffect, useMemo, useRef } from "react";


export function useUIHandlers({ monomers, setHoveredMonomer, isDragging }) {
    const resIdxByZeroBasedSeqId = useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(monomers) ? monomers : [];
        for (const m of arr) {
            const key = m?.['res-idx'];
            if (!key) continue;
            const parts = String(key).split('-');
            const idx = parts?.[1] != null ? parseInt(parts[1], 10) : NaN;
            if (!Number.isFinite(idx)) continue;
            map.set(idx, String(key));
        }
        return map;
    }, [monomers]);

    const lastHoverRef = useRef('');
    const pendingHoverRef = useRef(null);
    const rafIdRef = useRef(null);

    const flushHover = useCallback(() => {
        rafIdRef.current = null;
        const next = pendingHoverRef.current;
        pendingHoverRef.current = null;
        if (typeof next !== 'string') return;
        if (next === lastHoverRef.current) return;
        lastHoverRef.current = next;
        setHoveredMonomer(next);
    }, [setHoveredMonomer]);

    const setHoverBatched = useCallback((next) => {
        if (isDragging) return;
        const v = typeof next === 'string' ? next : '';
        if (v === lastHoverRef.current) return;
        pendingHoverRef.current = v;
        if (rafIdRef.current) return;
        rafIdRef.current = requestAnimationFrame(flushHover);
    }, [flushHover, isDragging]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
            pendingHoverRef.current = null;
        };
    }, []);

    const handleMonomerEnter = useCallback((newIdx) => {
        if (isDragging) return; // Ignore hover events while dragging

        let newResIdx = newIdx;
        if (typeof newIdx === 'object' && newIdx !== null) {
            const resid = Number(newIdx?.resid);
            const zeroBased = Number.isFinite(resid) ? resid - 1 : NaN;
            newResIdx = Number.isFinite(zeroBased) ? (resIdxByZeroBasedSeqId.get(zeroBased) || '') : '';
        }
        setHoverBatched(String(newResIdx || ''));
    }, [isDragging, resIdxByZeroBasedSeqId, setHoverBatched]);

    const handleMonomerLeave = useCallback(() => {
        if (isDragging) return; // Ignore hover events while dragging

        setHoverBatched('');
    }, [setHoverBatched, isDragging]);

    const handleMonomerHover = useCallback((data) => {
        if (isDragging) return; // Ignore hover events while dragging

        if (!data) {
            setHoverBatched('');
            return;
        }
        if (typeof data === 'string') {
            setHoverBatched(data);
            return;
        }
        if (data.origin === 'molstarViewer') {
            // Only allow hover from the main structure to drive chain-slot highlighting.
            // Template/unknown hover should not affect peptide UI.
            if (data.target === 'template') {
                setHoverBatched('');
                return;
            }
        }

        if (data.origin === 'molstarViewer' && data.resid) {
            const resid = Number(data.resid);
            const zeroBased = Number.isFinite(resid) ? resid - 1 : NaN;
            const newResIdx = Number.isFinite(zeroBased) ? (resIdxByZeroBasedSeqId.get(zeroBased) || '') : '';
            setHoverBatched(newResIdx);
        }
    }, [isDragging, resIdxByZeroBasedSeqId, setHoverBatched]);

    return {
        handleMonomerEnter,
        handleMonomerLeave,
        handleMonomerHover,
    };
}