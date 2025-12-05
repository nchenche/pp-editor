import { useEffect, useRef } from 'react';

export const DESIGN_STORAGE_KEY = 'design-peptide-v1';

export function readPersistedDesign(storageKey = DESIGN_STORAGE_KEY) {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            biln: typeof parsed.biln === 'string' ? parsed.biln : null,
            constraints: Array.isArray(parsed.constraints) ? parsed.constraints : null,
        };
    } catch {
        return null;
    }
}

export function useInitialDesignState({ fallbackBiln = '', storageKey = DESIGN_STORAGE_KEY } = {}) {
    const persistedRef = useRef(readPersistedDesign(storageKey));
    const persisted = persistedRef.current;
    return {
        initialBiln: persisted?.biln ?? fallbackBiln,
        initialConstraints: persisted?.constraints ?? [],
    };
}

export function usePersistDesign({ biln, constraints, storageKey = DESIGN_STORAGE_KEY, delay = 200 }) {
    useEffect(() => {
        const payload = JSON.stringify({ biln, constraints });
        const id = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, payload);
            } catch {
                /* ignore quota errors */
            }
        }, delay);
        return () => clearTimeout(id);
    }, [biln, constraints, storageKey, delay]);
}