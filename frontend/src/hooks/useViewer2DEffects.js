// src/hooks/useViewer2DEffects.js
import { useEffect } from "react";
import { addClassName, removeClassName, createRect } from "../components/peptide-editor/Viewer2D/utils";


export function useViewer2DEffects({
    svgData,
    svgContainer,
    onMouseEnterGroup,
    onMouseLeaveGroup,
    onRGroupClick,
    onBondClick,
    hoveredMonomer,
    cancelLinking,
    isShowBonds
}) {

    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const root = svgContainer.current;
        const groups = root.querySelectorAll('svg g');

        groups.forEach(group => {
            // If we've already instrumented this group (direct child overlay), skip
            if (group.querySelector(':scope > rect[data-overlay="1"]')) {
                return;
            }

            const padding = 10;
            const groupClasses = group.classList;
            const attr = { fill: "transparent" };
            const rect = createRect(group, attr, padding);

            // Mark overlay so we can style and clean it up reliably
            rect.setAttribute('data-overlay', '1');

            if (groupClasses.contains("r-group")) {
                // mark rect so CSS can toggle it
                rect.classList.add("r-group");
                group.addEventListener("click", onRGroupClick);
            } else if (groupClasses.contains("bond") && groupClasses.contains("type-other")) {
                // mark rect so CSS can toggle it
                rect.classList.add("extra-bond");
                group.addEventListener("dblclick", onBondClick);
            } else {
                rect.classList.add("hover-residue");
            }

            group.insertBefore(rect, group.firstChild);
            group.addEventListener("mouseenter", onMouseEnterGroup);
            group.addEventListener("mouseleave", onMouseLeaveGroup);
        });

        return () => {
            if (!svgContainer?.current) return;

            // Clean up all groups and their event listeners
            svgContainer.current.querySelectorAll('svg g').forEach(group => {
                group.removeEventListener("mouseenter", onMouseEnterGroup);
                group.removeEventListener("mouseleave", onMouseLeaveGroup);
                group.removeEventListener("click", onRGroupClick);
                group.removeEventListener("dblclick", onBondClick);
            });

            // Remove overlays we injected (fixes StrictMode double-invoke)
            svgContainer.current
                .querySelectorAll('svg rect[data-overlay="1"]')
                .forEach(node => node.remove());

        };
    }, [svgData, svgContainer, onMouseEnterGroup, onMouseLeaveGroup, onRGroupClick, onBondClick]);

    useEffect(() => {
        const container = svgContainer?.current;
        if (!container) return;
        const svg = container.querySelector('svg');
        if (!svg) return;

        // Clear previous atom highlights (when toggling or on new SVG)
        svg.querySelectorAll('.highlight-extra-bond-atom')
            .forEach(el => el.classList.remove('highlight-extra-bond-atom'));

        if (!isShowBonds) return; // nothing to add if mode is off

        // For each extra-bond, mark the two atoms involved
        const extraBondGroups = container.querySelectorAll('svg g.type-other');
        extraBondGroups.forEach(g => {
            const cls = g.getAttribute('class') || '';
            const m = cls.match(/atoms_(\d+)-(\d+)/);
            if (!m) return;
            const ids = [m[1], m[2]];

            ids.forEach(id => {
                // Select atom glyphs (skip bond segments that also carry atom-* class)
                svg.querySelectorAll(`.atom-${id}`).forEach(node => {
                    const cn = node.getAttribute('class') || '';
                    if (/\bbond-\d+\b/.test(cn)) return; // ignore bond paths
                    node.classList.add('highlight-extra-bond-atom');
                });
            });
        });
    }, [svgData, svgContainer, isShowBonds]);

    // Effect to highlight the group corresponding to the hovered monomer
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const svgElement = svgContainer.current.querySelector('svg');
        if (!svgElement) return;

        // Remove highlight from all groups
        svgContainer.current.querySelectorAll('svg g').forEach(group => {
            group.classList.remove('highlighted');
        });

        // If there is a hoveredMonomer, add the highlight to its corresponding group.
        if (hoveredMonomer) {
            const targetGroup = svgContainer.current.querySelector(`svg g.residue-${hoveredMonomer}`);
            if (targetGroup) {
                targetGroup.classList.add('highlighted');
            }
            svgElement.classList.add('monomer-hover');
        } else {
            svgElement.classList.remove('monomer-hover');
        }
    }, [svgData, hoveredMonomer, svgContainer]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && svgContainer.current?.classList.contains('linking-mode')) {
                e.preventDefault();
                cancelLinking();
                // If focus is inside the SVG container, blur it
                const active = document.activeElement;
                if (active && svgContainer.current?.contains(active)) {
                    // defer to after DOM/state updates
                    requestAnimationFrame(() => active.blur());
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [cancelLinking, svgContainer]);
}
