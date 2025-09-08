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

        // Second selection => link and cleanup
        handleMonomerLinking(first, { residue, rgroup, indices });
        cancelLinking();
        setRgroupsEmphasis(false);
    }, [svgData, svgContainer, isRgroupsEmphasis, monomersToLink, setMonomersToLink, handleMonomerLinking, setRgroupsEmphasis, cancelLinking]);

    const onBondClick = useCallback((event) => {
        if (!svgData || !svgContainer?.current) return;
        event.preventDefault();
        event.stopPropagation();
        const group = event.currentTarget.className.baseVal;
        const regex_residues = /(?<=residues_[A-Za-z]+-)(\d+)|(?<=_[A-Za-z]+-)(\d+)/g;
        const regex_rgroups = /(?<=rgroups_)(\d+)|(?<=rgroups_\d+_)(\d+)/g;
        const residue_indices = Array.from(group.matchAll(regex_residues), m => Number(m[1] || m[2]));
        const rgroup_indices = Array.from(group.matchAll(regex_rgroups), m => Number(m[1] || m[2]));
        handleBondBreaking(residue_indices, rgroup_indices);
    }, [svgData, svgContainer, handleBondBreaking]);

    return { onMouseEnterGroup, onMouseLeaveGroup, onRGroupClick, onBondClick, cancelLinking };
}
