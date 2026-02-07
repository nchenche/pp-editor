import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { alpha, keyframes } from '@mui/material/styles';

import { OverlayPortalProvider } from '../components/common/OverlayPortalContext';
import { useShellTheme } from '../theme/ShellThemeProvider';

import { Box, Paper } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const SidebarCollapseContext = createContext(null);

export function useSidebarCollapse() {
    const ctx = useContext(SidebarCollapseContext);
    if (!ctx) {
        throw new Error('useSidebarCollapse must be used within DesignPageLayoutMUI');
    }
    return ctx;
}


// Use outside the component, only defined once
const shakeX = keyframes`
  0% { transform: translateX(0); }
  15% { transform: translateX(-2px); }
  30% { transform: translateX(2px); }
  45% { transform: translateX(-2px); }
  60% { transform: translateX(2px); }
  75% { transform: translateX(-1px); }
  100% { transform: translateX(0); }
`;

const ringPulse = keyframes`
  0%   { box-shadow: none; }
  40%  { box-shadow: 0 0 0 2px rgba(0,0,0,0.28), 0 0 0 6px rgba(0,0,0,0.12); }
  100% { box-shadow: none; }
`;

// Accepts any slot-like children for each zone
export const DesignPageLayout = ({
    leftPanel,  // e.g. MonomerLibrary
    mainPanel,  // main app content
    mobileTopPanel, // for mobile-specific stuff if needed
    ...rest
}) => (
    <div className="flex flex-col md:flex-row-reverse m-4" {...rest}>
        {/* Side panel (right on desktop, top on mobile if you want) */}
        <div className="hidden md:block w-full md:w-1/3 border p-4 rounded-md shadow-sm max-h-[80vh] overflow-hidden">
            {leftPanel}
        </div>
        {/* Mobile top panel (visible only on mobile) */}
        {mobileTopPanel && (
            <div className="block md:hidden mb-4 w-full">{mobileTopPanel}</div>
        )}
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
            {mainPanel}
        </div>
    </div>
);



export const DesignPageLayout2 = ({
    sidebar,
    sequenceEditor,
    viewerContainer,
    outputPanel,
    ...rest
}) => (
    <div
        className="
            grid
            grid-cols-1
            lg:grid-cols-[550px_1fr_400px
            lg:grid-cols-3
            h-[85vh] min-h-0
            gap-4 p-2
        "
    >
        {/* Sidebar */}
        <aside
            className="
                flex flex-col
                overflow-hidden
                border-2 border-blue-400 rounded-lg p-0 shadow-sm
                order-1 lg:col-span-1 lg:row-span-2 lg:order-none
                "
        >
            {/* Only this child will scroll */}
            <div className="flex-1 overflow-y-auto p-2">
                {sidebar}
            </div>
        </aside>

        {/* Center main interface */}
        <section
            className="
                flex flex-col gap-4 min-h-0
                order-2
                lg:col-start-2 lg:col-end-3 lg:row-span-2 lg:order-none resize-x
            "
        >
            <div className="border-2 border-yellow-400 rounded-lg p-4 shadow-sm flex-1 min-h-0 mi-w-[480px]">
                {viewerContainer}
            </div>
        </section>

        {/* Output panel */}
        <aside
            className="
                h-full min-h-0
                border-2 border-purple-400 bg-purple-50 rounded-lg p-4 shadow-sm overflow-auto
                order-3
                lg:col-start-3 lg:col-end-4 lg:row-span-2 lg:order-none min-w-[300px]
            "
        >
            {outputPanel}
        </aside>
    </div>
);


// New MUI layout with resizable left column and 2-row right column
export const DesignPageLayoutMUI = ({
    sidebar,           // left: Monomer library container
    viewerContainer,   // right/top: main interface (sequence input, 2D/3D viewers, tracks)
    outputPanel,       // right/bottom: output details
    height = '100%',   // fill available space (prevents overlapping the global footer)
    minLeftFrac = 0.25,   // minimum sidebar width 
    maxLeftFrac = 0.6, // maximum sidebar width as fraction of viewport width
    handleWidth = 6,   // draggable handle width (px)
    defaultLeftFrac = 0.3,
    defaultSidebarCollapsed = false,
    collapsedSidebarWidth = 34,
    collapsedStorageKey = 'pp-editor:rightSidebarCollapsed',
    widthStorageKey = 'pp-editor:rightSidebarWidthPx:v1',
    ...rest
}) => {
    const containerRef = useRef(null);
    const overlayRootRef = useRef(null); // right-panel root for overlays
    const [overlayActive, setOverlayActive] = useState(false);
    const { shell } = useShellTheme();

    const userResizedRef = useRef(false);

    const [leftPx, setLeftPx] = useState(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const fallback = Math.floor(vw * defaultLeftFrac);

        if (typeof window === 'undefined') return fallback;
        try {
            const raw = window.localStorage.getItem(widthStorageKey);
            const v = raw == null ? NaN : Number(raw);
            if (!Number.isFinite(v)) return fallback;
            // Treat a stored width as an explicit user resize.
            userResizedRef.current = true;
            return v;
        } catch {
            return fallback;
        }
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return !!defaultSidebarCollapsed;
        try {
            const raw = window.localStorage.getItem(collapsedStorageKey);
            if (raw === null) return !!defaultSidebarCollapsed;
            return raw === '1' || raw === 'true';
        } catch {
            return !!defaultSidebarCollapsed;
        }
    });
    const [showPanelsTooltipOpen, setShowPanelsTooltipOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const draggingRef = useRef(false); // NEW: source of truth for listeners

    const leftPxRef = useRef(leftPx);
    useEffect(() => {
        leftPxRef.current = leftPx;
    }, [leftPx]);

    const lastNonMaxWidthRef = useRef(null);

    const clampLeft = useCallback((px) => {
        const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
        const minLeft = Math.floor(vw * Math.min(minLeftFrac, maxLeftFrac));
        const maxLeft = Math.floor(vw * maxLeftFrac);
        return Math.min(Math.max(px, minLeft), maxLeft);
    }, [minLeftFrac, maxLeftFrac]);

    useEffect(() => {
        const init = () => setLeftPx(prev => clampLeft(prev));
        init();
        const onResize = () => setLeftPx(prev => clampLeft(prev));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [clampLeft, defaultLeftFrac]);

    // If defaultLeftFrac prop changes and user hasn't resized, apply it
    useEffect(() => {
        if (userResizedRef.current) return;
        const vw = window.innerWidth || 1200;
        setLeftPx(clampLeft(Math.floor(vw * defaultLeftFrac)));
    }, [defaultLeftFrac, clampLeft]);

    // Stable move handler (no dragging in deps)
    const onMouseMove = useCallback((e) => {
        if (sidebarCollapsed) return;
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Right sidebar: width = distance from mouse to right edge
        const desired = rect.right - e.clientX;
        setLeftPx(clampLeft(desired));
    }, [clampLeft, containerRef, sidebarCollapsed]);

    const stopDrag = useCallback(() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setDragging(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('blur', stopDrag);

        // Persist final sidebar width after drag.
        try {
            window?.localStorage?.setItem(widthStorageKey, String(leftPxRef.current));
        } catch {
            // ignore
        }
    }, [onMouseMove, widthStorageKey]);

    const toggleMaximizeSidebar = useCallback(() => {
        if (sidebarCollapsed) return;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
        const maxPx = clampLeft(Math.floor(vw * maxLeftFrac));
        const isAtMax = leftPxRef.current >= maxPx - 2;

        userResizedRef.current = true;

        if (isAtMax) {
            const restore = lastNonMaxWidthRef.current
                ?? clampLeft(Math.floor(vw * defaultLeftFrac));
            setLeftPx(restore);
            try { window?.localStorage?.setItem(widthStorageKey, String(restore)); } catch { }
            return;
        }

        lastNonMaxWidthRef.current = leftPxRef.current;
        setLeftPx(maxPx);
        try { window?.localStorage?.setItem(widthStorageKey, String(maxPx)); } catch { }
    }, [sidebarCollapsed, clampLeft, maxLeftFrac, defaultLeftFrac, widthStorageKey]);

    const startDrag = useCallback((e) => {
        if (sidebarCollapsed) return;
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        userResizedRef.current = true;
        setDragging(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('blur', stopDrag); // end drag if window loses focus
    }, [onMouseMove, stopDrag]);

    useEffect(() => {
        // Safety: cleanup on unmount
        return () => {
            draggingRef.current = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('blur', stopDrag);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [onMouseMove, stopDrag]);

    // Persist collapsed state
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(collapsedStorageKey, sidebarCollapsed ? '1' : '0');
        } catch {
            // ignore storage errors
        }
    }, [collapsedStorageKey, sidebarCollapsed]);

    const sidebarWidthPx = sidebarCollapsed ? collapsedSidebarWidth : leftPx;
    const gridTemplateColumns = useMemo(() => `1fr ${handleWidth}px ${sidebarWidthPx}px`, [sidebarWidthPx, handleWidth]);

    return (
        <Box
            ref={containerRef}
            sx={{
                height,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns,
                gap: 1,
                px: 1,
                py: 1,
                // Let the global page background show through between panels.
                bgcolor: 'transparent',
                overflow: 'hidden',
            }}
            {...rest}
        >

            {/* Right: Two rows; top ~65%, bottom ~35% */}
            <Box
                ref={overlayRootRef}
                sx={{
                    height: '100%',
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateRows: '100% 0%',
                    gap: 1,
                    overflow: 'hidden', // this column doesn't scroll as a whole
                    position: 'relative', // for overlay portal
                }}
            >
                <OverlayPortalProvider rootRef={overlayRootRef} overlayActive={overlayActive} setOverlayActive={setOverlayActive}>
                    {/* Top: Viewer/Editor area (no scroll) */}
                    <Paper
                        // variant="outlined"
                        square
                        sx={{
                            minHeight: 0,
                            height: '100%',
                            overflow: 'hidden', // prevent internal scroll
                            borderRadius: 1,
                            pl: 0,
                            display: 'flex',
                            position: overlayActive ? 'relative' : 'static',
                            zIndex: (t) => (overlayActive ? t.zIndex.modal + 2 : 'auto'),
                            boxShadow: overlayActive
                                ? '0 10px 22px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.16)'
                                : undefined,
                            flexDirection: 'column',
                            bgcolor: 'transparent',
                        }}
                    >
                        {viewerContainer}
                    </Paper>

                    {/* Bottom: Output panel (scrollable) */}
                    <Paper
                        variant="outlined"
                        square
                        sx={{
                            minHeight: 0,
                            height: '100%',
                            overflowY: 'auto', // scrolls
                            overflowX: 'hidden',
                            borderRadius: 1,
                            p: 1,
                        }}
                    >
                        {outputPanel}
                    </Paper>
                </OverlayPortalProvider>
            </Box>

            {/* Vertical handle (draggable) */}
            <Box
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={0}
                onMouseDown={startDrag}
                onKeyDown={(e) => { if (e.key === 'Escape') stopDrag(); }}
                onDoubleClick={() => {
                    if (sidebarCollapsed) return;
                    userResizedRef.current = false;
                    const next = clampLeft(Math.floor((window.innerWidth || 1200) * defaultLeftFrac));
                    setLeftPx(next);
                    try { window?.localStorage?.setItem(widthStorageKey, String(next)); } catch { }
                }}
                sx={{
                    cursor: 'col-resize',
                    pointerEvents: sidebarCollapsed ? 'none' : 'auto',
                    position: 'relative',
                    height: '100%',
                    outline: 'none',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '4px',
                        borderRadius: '2px',
                        bgcolor: shell.resizeBar,
                    },
                    '&:hover::before': { bgcolor: shell.resizeBarHover },
                }}
            />

            {/* Left: Sidebar (scrollable) */}
            <Paper
                variant="outlined"
                square
                sx={{
                    height: '100%',
                    minWidth: 0,
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: 1,
                    p: 1,
                    borderWidth: overlayActive ? 2 : 1,
                    position: overlayActive ? 'relative' : 'static',
                    zIndex: (t) => (overlayActive ? t.zIndex.modal + 20 : 'auto'),
                    borderColor: (t) =>
                        overlayActive
                            ? (t.palette.mode === 'dark'
                                ? alpha(t.palette.common.white, 0.35)
                                : alpha(t.palette.common.black, 0.55))
                            : t.palette.divider,
                    boxShadow: (t) =>
                        overlayActive
                            ? '0 10px 22px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.16)'
                            : 'none',
                    willChange: 'transform, box-shadow',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
            >
                {/* Keep the sidebar mounted even when collapsed (prevents library/output from reloading) */}
                <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>

                    {/* Sidebar content (mounted; just hidden when collapsed) */}
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            display: sidebarCollapsed ? 'none' : 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <SidebarCollapseContext.Provider
                            value={{
                                sidebarCollapsed,
                                setSidebarCollapsed,
                                toggleMaximizeSidebar,
                            }}
                        >
                            {sidebar}
                        </SidebarCollapseContext.Provider>
                    </Box>
                </Box>

                {/* Collapsed handle overlay */}
                <Tooltip
                    title="Show panels"
                    placement="left"
                    arrow
                    open={showPanelsTooltipOpen}
                    onOpen={() => setShowPanelsTooltipOpen(true)}
                    onClose={() => setShowPanelsTooltipOpen(false)}
                    disableFocusListener
                    disableTouchListener
                >
                    <Box
                        onClick={() => {
                            setShowPanelsTooltipOpen(false);
                            requestAnimationFrame(() => setSidebarCollapsed(false));
                        }}
                        role="button"
                        aria-label="expand right panel"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                setShowPanelsTooltipOpen(false);
                                requestAnimationFrame(() => setSidebarCollapsed(false));
                            }
                        }}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: sidebarCollapsed ? 'flex' : 'none',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}
                    >
                        <ChevronLeftIcon fontSize="small" />
                        <Box
                            component="span"
                            sx={{
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                fontSize: 11,
                                color: 'text.secondary',
                                letterSpacing: 0.5,
                            }}
                        >
                            Show panels
                        </Box>
                    </Box>
                </Tooltip>
            </Paper>

        </Box>
    );
};