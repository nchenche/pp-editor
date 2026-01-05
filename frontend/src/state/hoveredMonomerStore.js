import { useSyncExternalStore } from 'react';

let hoveredMonomer = '';
const listeners = new Set();

function emit() {
    for (const l of listeners) l();
}

export const hoveredMonomerStore = {
    getSnapshot() {
        return hoveredMonomer;
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    set(next) {
        const v = next == null ? '' : String(next);
        if (v === hoveredMonomer) return;
        hoveredMonomer = v;
        emit();
    },
    clear() {
        hoveredMonomerStore.set('');
    },
};

export function useHoveredMonomer() {
    return useSyncExternalStore(
        hoveredMonomerStore.subscribe,
        hoveredMonomerStore.getSnapshot,
        hoveredMonomerStore.getSnapshot,
    );
}
