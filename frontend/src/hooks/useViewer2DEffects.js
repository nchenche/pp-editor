// src/hooks/useViewer2DEffects.js
import { useEffect, useRef } from "react";
import { addClassName, removeClassName, createRect } from "../components/peptide-editor/Viewer2D/utils";


function classListHasPrefix(classList, prefix) {
    return Array.from(classList).some((token) => token.startsWith(prefix));
}

function getBondMetaFromClassList(groupClassList) {
    const tokens = Array.from(groupClassList || []);
    const residuesToken = tokens.find((t) => t.startsWith('residues_'));
    const rgroupsToken = tokens.find((t) => t.startsWith('rgroups_'));
    if (!residuesToken || !rgroupsToken) return null;

    const residueMatches = residuesToken.match(/-(\d+)/g) || [];
    const residueNums = residueMatches.map((s) => parseInt(s.slice(1), 10)).filter(Number.isFinite);
    const rgroupNums = (rgroupsToken.match(/\d+/g) || []).map((s) => parseInt(s, 10)).filter(Number.isFinite);

    if (residueNums.length < 2 || rgroupNums.length < 2) return null;
    return {
        residues: [residueNums[0], residueNums[1]],
        rgroups: [rgroupNums[0], rgroupNums[1]],
    };
}

function isCuttableBondGroup(groupClassList, cuttableBondPairs) {
    if (!groupClassList?.contains?.("bond")) return false;
    const isSupportedType = groupClassList.contains("type-other") || groupClassList.contains("type-peptide");
    if (!isSupportedType) return false;
    const hasResidues = classListHasPrefix(groupClassList, "residues_");
    const hasRgroups = classListHasPrefix(groupClassList, "rgroups_");
    if (!hasResidues || !hasRgroups) return false;
    if (!cuttableBondPairs || cuttableBondPairs.size === 0) return false;

    const meta = getBondMetaFromClassList(groupClassList);
    if (!meta) return false;

    const [r0, r1] = meta.residues;
    const [g0, g1] = meta.rgroups;

    const candidates = [
        `${r0}-${g0}|${r1}-${g1}`,
        `${r0}-${g1}|${r1}-${g0}`,
        `${r1}-${g0}|${r0}-${g1}`,
        `${r1}-${g1}|${r0}-${g0}`,
    ];

    return candidates.some((k) => cuttableBondPairs.has(k));
}


export function useViewer2DEffects({
    svgData,
    svgContainer,
    cuttableBondPairs,
    onMouseEnterGroup,
    onMouseLeaveGroup,
    onRGroupClick,
    onBondClick,
    hoveredMonomer,
    cancelLinking,
    isShowBonds,
    setIsShowBonds,
}) {

    // ── Phase 1: Create overlay rects (expensive – calls getBBox per group) ──
    // Only runs when the SVG markup itself changes, NOT on mode toggles.
    const overlayMapRef = useRef(new Map()); // group element → overlay rect

    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const root = svgContainer.current;
        const groups = root.querySelectorAll('svg g');
        const map = new Map();

        groups.forEach(group => {
            // Reuse existing overlay if already present (avoids getBBox).
            const existingOverlay = group.querySelector(':scope > rect[data-overlay="1"]');
            const padding = 12;
            const attr = { fill: "transparent" };
            const rect = existingOverlay || createRect(group, attr, padding);
            rect.setAttribute('data-overlay', '1');

            if (!existingOverlay) {
                group.insertBefore(rect, group.firstChild);
            }
            map.set(group, rect);
        });

        overlayMapRef.current = map;

        return () => {
            if (!svgContainer?.current) return;
            // Remove overlays we injected (fixes StrictMode double-invoke)
            svgContainer.current
                .querySelectorAll('svg rect[data-overlay="1"]')
                .forEach(node => node.remove());
            overlayMapRef.current = new Map();
        };
    }, [svgData, svgContainer]);

    // ── Phase 2: Classify groups + attach listeners (lightweight – no layout) ──
    // Runs when cuttableBondPairs or event handlers change (i.e. mode toggles).
    useEffect(() => {
        if (!svgData || !svgContainer?.current) return;

        const root = svgContainer.current;
        const groups = root.querySelectorAll('svg g');

        groups.forEach(group => {
            const groupClasses = group.classList;
            const isCuttableBond = isCuttableBondGroup(groupClasses, cuttableBondPairs);
            group.classList.toggle("cuttable-bond", isCuttableBond);

            const rect = overlayMapRef.current.get(group)
                || group.querySelector(':scope > rect[data-overlay="1"]');
            if (!rect) return;

            if (groupClasses.contains("r-group")) {
                rect.classList.add("r-group");
                group.addEventListener("click", onRGroupClick);
                group.removeEventListener("dblclick", onBondClick);
                rect.classList.remove("extra-bond");
            } else if (isCuttableBond) {
                rect.classList.add("extra-bond");
                rect.classList.toggle("extra-bond-peptide", groupClasses.contains("type-peptide"));
                rect.classList.toggle("extra-bond-other", groupClasses.contains("type-other"));
                group.addEventListener("dblclick", onBondClick);
                group.removeEventListener("click", onRGroupClick);
            } else {
                rect.classList.add("hover-residue");
                rect.classList.remove("extra-bond");
                rect.classList.remove("extra-bond-peptide");
                rect.classList.remove("extra-bond-other");
                group.removeEventListener("dblclick", onBondClick);
            }

            group.addEventListener("mouseenter", onMouseEnterGroup);
            group.addEventListener("mouseleave", onMouseLeaveGroup);
        });

        return () => {
            if (!svgContainer?.current) return;
            svgContainer.current.querySelectorAll('svg g').forEach(group => {
                group.removeEventListener("mouseenter", onMouseEnterGroup);
                group.removeEventListener("mouseleave", onMouseLeaveGroup);
                group.removeEventListener("click", onRGroupClick);
                group.removeEventListener("dblclick", onBondClick);
            });
        };
    }, [svgData, svgContainer, cuttableBondPairs, onMouseEnterGroup, onMouseLeaveGroup, onRGroupClick, onBondClick]);

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
        const extraBondGroups = container.querySelectorAll('svg g.cuttable-bond');
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

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && isShowBonds) {
                e.preventDefault();
                setIsShowBonds(false);
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
    }, [svgContainer, isShowBonds, setIsShowBonds]);
}
