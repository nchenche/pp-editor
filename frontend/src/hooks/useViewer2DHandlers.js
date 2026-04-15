// src/hooks/useViewer2DHandlers.js
import { useCallback } from "react";

export function useViewer2DHandlers({
    svgData,
    svgContainer,
    setMonomersToLink,
    handleMonomerEnter,
    handleMonomerLeave,
    handleBondBreaking,
    isRgroupsEmphasis = false,
    setRgroupsEmphasis,
    isExtraBondEmphasis = false,
    monomersToLink,
    handleMonomerLinking
}) {
    // Mouse events
    const onMouseEnterGroup = useCallback((event) => {
        if (isRgroupsEmphasis || isExtraBondEmphasis) return; // disable hover-from-SVG while emphasizing
        const group = event.currentTarget;
        const residueIndex = group.className.baseVal?.split('residue-')[1];
        handleMonomerEnter(residueIndex);
    }, [handleMonomerEnter, isRgroupsEmphasis, isExtraBondEmphasis]);

    const onMouseLeaveGroup = useCallback(() => {
        if (isRgroupsEmphasis || isExtraBondEmphasis) return; // keep sequence-hover intact; just ignore SVG hover
        handleMonomerLeave('');
    }, [handleMonomerLeave, isRgroupsEmphasis, isExtraBondEmphasis]);


    const cancelLinking = useCallback(() => {
        const container = svgContainer?.current;
        if (!container) return;
        const first = monomersToLink[0];
        if (first) {
            const firstGroup = container.querySelector(`.indices_${first.indices}`);
            firstGroup?.classList.remove('selected');
        }
        container.classList.remove('linking-mode');
        setMonomersToLink([]);
    }, [svgContainer, monomersToLink, setMonomersToLink]);


    const onRGroupClick = useCallback((event) => {
        if (!svgData || !svgContainer?.current) return;
        if (!isRgroupsEmphasis) return; // only clickable in emphasis mode

        const groupEl = event.currentTarget;
        const base = groupEl.className.baseVal;
        const match = base.match(/(?:^|\s)indices_([^\s]+)/);
        if (!match) return;

        const indices = match[1];
        const sep = indices.lastIndexOf('_');
        const residue = indices.slice(0, sep);
        const rgroup = indices.slice(sep + 1);

        const overlayRect = svgContainer.current.querySelector('svg rect'); // first rect (used by CSS :has in your sheet)

        if (monomersToLink.length === 0) {
            // First selection: mark selected and enable linking-mode
            groupEl.classList.add('selected');
            overlayRect?.classList.add('linking-mode');
            setMonomersToLink([{ residue, rgroup, indices }]);
            return;
        }

        const first = monomersToLink[0];

        // Same group clicked again => cancel
        if (first.indices === indices) {
            cancelLinking();
            return;
        }

        // Second selection => link, then reset selection for chaining.
        // Stay in link mode so user can create additional links without
        // re-clicking the Link button.
        handleMonomerLinking(first, { residue, rgroup, indices });
        cancelLinking();
    }, [svgData, svgContainer, isRgroupsEmphasis, monomersToLink, setMonomersToLink, handleMonomerLinking, setRgroupsEmphasis, cancelLinking]);

    const onBondClick = useCallback((event) => {
        if (!svgData || !svgContainer?.current) return;
        event.preventDefault();
        event.stopPropagation();
        const groupEl = event.currentTarget;
        const group = groupEl.className.baseVal;
        const tokens = group.split(/\s+/);
        const residuesToken = tokens.find(t => t.startsWith('residues_')) || '';
        const rgroupsToken = tokens.find(t => t.startsWith('rgroups_')) || '';
        const residue_indices = (residuesToken.match(/-(\d+)/g) || []).map(s => Number(s.slice(1)));
        const rgroup_indices = (rgroupsToken.match(/\d+/g) || []).map(Number);
        const allowBackboneCut = groupEl?.classList?.contains('type-other');
        handleBondBreaking(residue_indices, rgroup_indices, { allowBackboneCut });
    }, [svgData, svgContainer, handleBondBreaking]);

    return { onMouseEnterGroup, onMouseLeaveGroup, onRGroupClick, onBondClick, cancelLinking };
}
