import { useEffect, useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import './viewer2D.css'; // Assuming you have a CSS file for styles

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import Box from "@mui/material/Box";





import usePanZoom from "../../../hooks/usePanZoom";
import { useViewer2DHandlers } from '../../../hooks/useViewer2DHandlers';
import { useViewer2DEffects } from "../../../hooks/useViewer2DEffects";


function makeTightResponsiveSvg(svgString, { padding = 8, preserve = 'xMidYMid meet' } = {}) {
    if (!svgString) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.documentElement;

    // Remove width/height so the SVG can be sized via CSS/attrs later
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    // Parse current viewBox if present
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(parseFloat);
    const hasVB = vb.length === 4 && vb.every(Number.isFinite);
    const [vx, vy, vw, vh] = hasVB ? vb : [0, 0, NaN, NaN];

    // Remove a full-canvas background rect if present (like RDKit's white rect)
    if (hasVB) {
        const bgRect = Array.from(svg.querySelectorAll('rect')).find(r => {
            const x = parseFloat(r.getAttribute('x') || '0');
            const y = parseFloat(r.getAttribute('y') || '0');
            const w = parseFloat(r.getAttribute('width') || '0');
            const h = parseFloat(r.getAttribute('height') || '0');
            const style = (r.getAttribute('style') || '').toLowerCase();
            const fill = (r.getAttribute('fill') || '').toLowerCase();
            const isWhite = fill === '#ffffff' || fill === '#fff' || fill === 'white' || style.includes('fill:#ffffff');
            return Math.abs(x - vx) < 0.001 && Math.abs(y - vy) < 0.001 &&
                Math.abs(w - vw) < 0.001 && Math.abs(h - vh) < 0.001 && isWhite;
        });
        if (bgRect) bgRect.remove();
    }

    // Attach to DOM (hidden) so getBBox works
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:-9999px;';
    document.body.appendChild(tmp);
    tmp.appendChild(svg);

    // Compute union bbox of visible shapes
    const shapes = svg.querySelectorAll('path, line, polyline, polygon, circle, ellipse, rect, text');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(el => {
        try {
            const b = el.getBBox();
            if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.width) || !isFinite(b.height)) return;
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
        } catch (_) { }
    });

    if (minX === Infinity) {
        // Fallback: keep existing viewBox or default
        if (hasVB) svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
        else svg.setAttribute('viewBox', '0 0 100 100');
    } else {
        const x = minX - padding;
        const y = minY - padding;
        const w = (maxX - minX) + 2 * padding;
        const h = (maxY - minY) + 2 * padding;
        svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    }

    svg.setAttribute('preserveAspectRatio', preserve);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const out = new XMLSerializer().serializeToString(svg);
    tmp.remove(); // removes svg too
    return out;
}

function downloadSvgElement(svgEl, filename = 'pep-edit_2d.svg') {
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    // Ensure namespaces exist (some serializers/viewers rely on them)
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!clone.getAttribute('xmlns:xlink')) {
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    // Prefer explicit dimensions for downloaded files
    const vb = (clone.getAttribute('viewBox') || '').trim();
    const parts = vb.split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const w = parts[2];
        const h = parts[3];
        if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.round(w)));
        if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.round(h)));
    }

    const svgText = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export const Viewer2D = forwardRef(function Viewer2D(props, ref) {
    const {
        svgData,
        linkMap,
        hoveredMonomer,
        hoverInfo,
        handleMonomerEnter,
        handleMonomerLeave,
        isShowingAtomIndices,
        handleShowingAtomIndices,
        onLinkMonomers,
        onBreakBond,
        error,
        onModesChange
    } = props;

    const processedSvg = useMemo(() => makeTightResponsiveSvg(svgData, { padding: 16, preserve: 'xMidYMid meet' }), [svgData]);

    const svgContainer = useRef(null);
    const panZoomApi = useRef(null);

    const [isShowRGroups, setIsShowRGroups] = useState(false);
    const [isShowBonds, setIsShowBonds] = useState(false);
    const [monomersToLink, setMonomersToLink] = useState([]);

    const cuttableBondPairs = useMemo(() => {
        const out = new Set();
        const entries = Object.entries(linkMap || {});
        for (const [, pairs] of entries) {
            if (!Array.isArray(pairs) || pairs.length < 2) continue;
            const a = pairs[0];
            const b = pairs[1];
            if (a?.monomerIdx == null || a?.rgroup == null) continue;
            if (b?.monomerIdx == null || b?.rgroup == null) continue;
            const key1 = `${a.monomerIdx}-${a.rgroup}|${b.monomerIdx}-${b.rgroup}`;
            const key2 = `${b.monomerIdx}-${b.rgroup}|${a.monomerIdx}-${a.rgroup}`;
            out.add(key1);
            out.add(key2);
        }
        return out;
    }, [linkMap]);

    // Enable unlink only when there are explicit BILN connections (i.e. parentheses) to cut.
    const hasExtraBonds = useMemo(() => {
        if (!svgData) return false;
        return cuttableBondPairs.size > 0;
    }, [svgData, cuttableBondPairs]);

    // If none remain, auto turn off the toggle
    useEffect(() => {
        if (!hasExtraBonds && isShowBonds) setIsShowBonds(false);
    }, [hasExtraBonds, isShowBonds]);

    usePanZoom(svgContainer, [svgData], panZoomApi);

    const {
        onMouseEnterGroup,
        onMouseLeaveGroup,
        onRGroupClick,
        onBondClick,
        cancelLinking
    } = useViewer2DHandlers({
        svgData,
        svgContainer,
        setMonomersToLink,
        handleMonomerEnter,
        handleMonomerLeave,
        handleBondBreaking: onBreakBond,
        isRgroupsEmphasis: isShowRGroups,
        setRgroupsEmphasis: setIsShowRGroups,
        isExtraBondEmphasis: isShowBonds,
        monomersToLink,
        handleMonomerLinking: onLinkMonomers
    });

    useViewer2DEffects({
        svgData,
        svgContainer,
        cuttableBondPairs,
        isShowRGroups,
        isShowBonds,
        monomersToLink,
        setMonomersToLink,
        onMouseEnterGroup,
        onMouseLeaveGroup,
        onRGroupClick,
        onBondClick,
        hoveredMonomer,
        cancelLinking,
        setIsShowBonds
    });

    // Keep parent in sync for button highlight + canCut
    useEffect(() => {
        onModesChange?.({
            linkMode: isShowRGroups,
            bondsMode: isShowBonds,
            canCut: hasExtraBonds,
            linkSelectionCount: isShowRGroups ? (monomersToLink?.length || 0) : 0,
        });
    }, [isShowRGroups, isShowBonds, hasExtraBonds, monomersToLink, onModesChange]);

    // Escape behavior while linking:
    // - If a first monomer is selected, Esc clears the in-progress selection.
    // - Otherwise, let Esc bubble so the parent can exit link mode (and remove focus backdrop).
    useEffect(() => {
        if (!isShowRGroups) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape' && e.key !== 'Esc') return;
            if ((monomersToLink?.length || 0) <= 0) return;
            e.preventDefault();
            e.stopPropagation();
            cancelLinking?.();
        };
        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [isShowRGroups, cancelLinking, monomersToLink]);

    // Expose minimal commands
    useImperativeHandle(ref, () => ({
        setLinkMode(next) {
            const v = Boolean(next);
            // NOTE: keep state updaters free of side effects.
            // Parent syncing happens via the useEffect below (onModesChange).
            if (v) {
                setIsShowBonds(false);
            } else {
                cancelLinking?.();
            }
            setIsShowRGroups(v);
        },
        setBondsMode(next) {
            // Guard: do nothing if requesting ON but there are no extra bonds
            const v = Boolean(next);
            if (v && !hasExtraBonds) {
                setIsShowBonds(false);
                return;
            }

            if (v) {
                setIsShowRGroups(false);
                cancelLinking?.();
            }
            setIsShowBonds(v);
        },
        clearLinkSelection() {
            cancelLinking?.();
        },
        toggleLinkMode() {
            const v = !isShowRGroups;
            this.setLinkMode(v);
        },
        toggleBondsMode() {
            const v = !isShowBonds;
            this.setBondsMode(v);
        },
        resetView() { panZoomApi.current?.reset?.(); },
        getModes() { return { linkMode: isShowRGroups, bondsMode: isShowBonds }; },
        downloadSvg(filename) {
            const svgEl = svgContainer.current?.querySelector('svg');
            if (!svgEl) return;
            downloadSvgElement(svgEl, filename || 'pep-edit_2d.svg');
        },
    }));


    // Toggle link mode (emphasis). Turning off also clears any selection.
    const handleToggleLinkMode = useCallback(() => {
        setIsShowRGroups(prev => {
            const next = !prev;
            if (!next) {
                // exiting link mode: clear selection and UI classes
                cancelLinking();
            }
            return next;
        });
    }, [cancelLinking]);

    return (
        <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px dashed #cbd5e1', borderRadius: 1, position: 'relative' }}>
            <div
                id="svg-container"
                className={`relative w-full h-full overflow-hidden bg-white
                    ${isShowRGroups ? 'rgroups-emphasis' : ''}
                    ${isShowBonds ? 'bonds-on' : ''}
                    ${isShowRGroups && monomersToLink.length > 0 ? 'linking-mode' : ''}  // NEW: highlight selected`}
                ref={svgContainer}
            >
                {svgData ? (
                    <div
                        className="flex items-center justify-center h-full"
                        dangerouslySetInnerHTML={{ __html: processedSvg }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-xl text-slate-500">
                        No data
                    </div>
                )}
            </div>

            {/* Removed old vertical controls */}

            {/* Hover label – bottom-right corner */}
            {hoverInfo && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        pointerEvents: 'none',
                        zIndex: 10,
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        lineHeight: 1.35,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        maxWidth: 200,
                        textAlign: 'right',
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', letterSpacing: 0.3 }}>
                        <span style={{ opacity: 0.6, fontWeight: 500 }}>{hoverInfo.chain}</span>
                        {hoverInfo.pdbName ? (
                            <>
                                {' '}
                                <span>{hoverInfo.pdbName}</span>
                            </>
                        ) : null}
                        {' '}
                        <span style={{ fontFamily: 'monospace' }}>{hoverInfo.seq}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 700, fontFamily: 'monospace', marginTop: 1, letterSpacing: 0.3 }}>
                        {hoverInfo.bilnSymbol}
                    </div>
                    {hoverInfo.monomerName ? (
                        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 1, lineHeight: 1.2 }}>
                            {hoverInfo.monomerName}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Error below viewer */}
            {error && (
                <div className="absolute left-0 right-0 bottom-0 flex items-center justify-center text-red-500 text-sm">
                    <ErrorOutlineIcon className="mr-1" /> {error}
                </div>
            )}
        </Box>
    );
});
