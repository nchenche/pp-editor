import { useCallback, useEffect, useRef, useState } from 'react';

export function useBilnHistory(initialBiln, maxHistory = 20) {
    const [value, setValue] = useState(initialBiln);
    const pastRef = useRef([]);
    const futureRef = useRef([]);

    // Reset when initialBiln changes (e.g. loaded from storage)
    useEffect(() => {
        setValue(initialBiln);
        pastRef.current = [];
        futureRef.current = [];
    }, [initialBiln]);

    const set = useCallback(
        (updater) => {
            setValue((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                if (next === prev) return prev;

                const past = [...pastRef.current, prev];
                pastRef.current = past.length > maxHistory ? past.slice(-maxHistory) : past;
                futureRef.current = [];
                return next;
            });
        },
        [maxHistory],
    );

    const undo = useCallback(() => {
        const past = pastRef.current;
        if (!past.length) return;

        setValue((current) => {
            const prev = past[past.length - 1];
            pastRef.current = past.slice(0, -1);
            futureRef.current = [current, ...futureRef.current];
            return prev;
        });
    }, []);

    const redo = useCallback(() => {
        const future = futureRef.current;
        if (!future.length) return;

        setValue((current) => {
            const [next, ...rest] = future;
            futureRef.current = rest;
            const past = [...pastRef.current, current];
            pastRef.current = past.length > maxHistory ? past.slice(-maxHistory) : past;
            return next;
        });
    }, [maxHistory]);

    const canUndo = pastRef.current.length > 0;
    const canRedo = futureRef.current.length > 0;

    return {
        value,
        setValue: set,
        undo,
        redo,
        canUndo,
        canRedo,
    };
}