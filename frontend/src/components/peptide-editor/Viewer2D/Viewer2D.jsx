import { useEffect, useState, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import './viewer2D.css'; // Assuming you have a CSS file for styles
import { addClassName, removeClassName, createRect } from './utils';

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import LinkIcon from "@mui/icons-material/Link";
import HighlightAltIcon from "@mui/icons-material/HighlightAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Alert from '@mui/material/Alert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ContentCut from '@mui/icons-material/ContentCut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Box from "@mui/material/Box";
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';




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

export const Viewer2D = forwardRef(function Viewer2D(props, ref) {
    const {
        svgData,
        hoveredMonomer,
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

    // Simple: compute presence of extra bonds from the SVG text
    const hasExtraBonds = useMemo(() => {
        if (!svgData) return false;
        // Adjust if your exporter uses a different class pattern
        return svgData.includes('class="bond type-other"')
            || svgData.includes("class='bond type-other'")
            || /class="[^"]*\bbond\b[^"]*\btype-other\b/.test(svgData);
    }, [svgData]);

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
        onModesChange?.({ linkMode: isShowRGroups, bondsMode: isShowBonds, canCut: hasExtraBonds });
    }, [isShowRGroups, isShowBonds, hasExtraBonds, onModesChange]);

    // NEW: Cancel current linking on Escape (no focus change)
    useEffect(() => {
        if (!isShowRGroups) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                cancelLinking?.(); // keep link mode, just clear selection
            }
        };
        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [isShowRGroups, cancelLinking]);

    // Expose minimal commands
    useImperativeHandle(ref, () => ({
        setLinkMode(next) {
            setIsShowRGroups(prev => {
                const v = Boolean(next);
                if (v) {
                    setIsShowBonds(false);
                } else {
                    cancelLinking?.();
                }
                onModesChange?.({ linkMode: v, bondsMode: v ? false : isShowBonds, canCut: hasExtraBonds });
                return v;
            });
        },
        setBondsMode(next) {
            // Guard: do nothing if requesting ON but there are no extra bonds
            if (Boolean(next) && !hasExtraBonds) {
                onModesChange?.({ linkMode: isShowRGroups, bondsMode: false, canCut: hasExtraBonds });
                return;
            }
            setIsShowBonds(prev => {
                const v = Boolean(next);
                if (v) {
                    setIsShowRGroups(false);
                    cancelLinking?.();
                }
                onModesChange?.({ linkMode: v ? false : isShowRGroups, bondsMode: v, canCut: hasExtraBonds });
                return v;
            });
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


    // Palette (slate-ish)
    const uiColors = {
        ink: '#1e293b',           // primary text/icon
        inkLight: '#334155',      // strokes
        inkLighter: '#475569',    // secondary
        inkDarker: '#030404',     // added for hover (darker)
        surface: 'rgba(30,41,59,0.06)',     // banner bg
        surfaceHover: 'rgba(30,41,59,0.12)',// hover bg
    };

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

                {/* Instruction banner for linking monomers */}
                {isShowRGroups && !isShowBonds && (
                    <div className="absolute inset-x-0 top-0 z-0">
                        <Alert
                            severity="info"
                            icon={false}
                            variant="filled"
                            sx={{
                                borderRadius: 0,
                                px: 1,
                                py: 0.25,
                                minHeight: 40,
                                alignItems: 'center',
                                bgcolor: uiColors.surface,
                                color: uiColors.ink,
                                backdropFilter: 'blur(1.5px)',
                                borderBottom: `1px solid ${uiColors.surfaceHover}`,
                                '.MuiAlert-message': {
                                    p: 0,
                                    m: 0,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: 0.2,
                                    textAlign: 'center',
                                },
                            }}
                        >
                            {monomersToLink.length === 0 ? (
                                'Link monomers — Click an R‑group to start'
                            ) : (
                                <>
                                    1 selected — Click another R‑group to create a non‑peptidic bond (Esc to cancel)
                                    <Tooltip title="Cancel current selection">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => { e.stopPropagation(); cancelLinking(); }}
                                            aria-label="cancel-linking"
                                            disableRipple
                                            sx={{
                                                p: 0,
                                                width: 24,
                                                height: 24,
                                                ml: 0.5,
                                                bgcolor: 'transparent',
                                                border: 'none',
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: 16,
                                                    color: uiColors.ink,
                                                    transition: 'color 120ms ease-in-out',
                                                },
                                                '&:hover': { bgcolor: 'transparent' },
                                                '&:hover .MuiSvgIcon-root': { color: uiColors.inkDarker },
                                                '&.Mui-focusVisible': { bgcolor: 'transparent' },
                                                '& .MuiTouchRipple-root': { display: 'none' },
                                            }}
                                        >
                                            <DeleteOutlineIcon fontSize="inherit" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Alert>
                    </div>
                )}

                {/* Instruction banner to remove a bond */}
                {isShowBonds && !isShowRGroups && hasExtraBonds && (
                    <div className="absolute inset-x-0 top-0 z-0">
                        <Alert
                            severity="info"
                            icon={false}
                            variant="filled"
                            sx={{
                                borderRadius: 0,
                                px: 1,
                                py: 0.25,
                                minHeight: 40,
                                alignItems: 'center',
                                bgcolor: uiColors.surface,
                                color: uiColors.ink,
                                backdropFilter: 'blur(1.5px)',
                                borderBottom: `1px solid ${uiColors.surfaceHover}`,
                                '.MuiAlert-message': {
                                    p: 0,
                                    m: 0,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: 0.2,
                                    textAlign: 'center',
                                },
                            }}
                        >
                            Double click on a bond to remove it (Esc to cancel)
                        </Alert>
                    </div>
                )}
            </div>

            {/* Removed old vertical controls */}

            {/* Error below viewer */}
            {error && (
                <div className="absolute left-0 right-0 bottom-0 flex items-center justify-center text-red-500 text-sm">
                    <ErrorOutlineIcon className="mr-1" /> {error}
                </div>
            )}
        </Box>
    );
});
