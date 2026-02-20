import { useSyncExternalStore } from 'react';

/**
 * Tiny external store for the currently-hovered template residue.
 * Value is either `null` (nothing hovered) or `{ chainId, resid }`.
 *
 * Kept separate from hoveredMonomerStore so that template hovers
 * never leak into the sequence-track highlight path.
 */

let hoveredTemplateResidue = null;
const listeners = new Set();

function emit() {
    for (const l of listeners) l();
}

export const hoveredTemplateResidueStore = {
    getSnapshot() {
        return hoveredTemplateResidue;
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    set(next) {
        // Normalise: null means "nothing hovered"
        const v = next && next.resid != null ? next : null;
        if (
            v === hoveredTemplateResidue ||
            (v != null &&
                hoveredTemplateResidue != null &&
                v.chainId === hoveredTemplateResidue.chainId &&
                v.resid === hoveredTemplateResidue.resid)
        ) {
            return; // no change
        }
        hoveredTemplateResidue = v;
        emit();
    },
    clear() {
        hoveredTemplateResidueStore.set(null);
    },
};

export function useHoveredTemplateResidue() {
    return useSyncExternalStore(
        hoveredTemplateResidueStore.subscribe,
        hoveredTemplateResidueStore.getSnapshot,
        hoveredTemplateResidueStore.getSnapshot,
    );
}
