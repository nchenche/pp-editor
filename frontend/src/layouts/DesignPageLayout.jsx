import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { alpha, keyframes } from '@mui/material/styles';

import { OverlayPortalProvider } from '../components/common/OverlayPortalContext';

import { Box, Paper } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';


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
    height = '85vh',   // keep page from scrolling; adjust if you have a fixed header
    minLeftFrac = 0.25,   // minimum sidebar width 
    maxLeftFrac = 0.45, // maximum sidebar width as fraction of viewport width
    handleWidth = 6,   // draggable handle width (px)
    defaultLeftFrac = 0.3,
    defaultSidebarCollapsed = false,
    collapsedSidebarWidth = 34,
    collapsedStorageKey = 'pp-editor:rightSidebarCollapsed',
    ...rest
}) => {
    const containerRef = useRef(null);
    const overlayRootRef = useRef(null); // right-panel root for overlays
    const [overlayActive, setOverlayActive] = useState(false);

    const [leftPx, setLeftPx] = useState(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        return Math.floor(vw * defaultLeftFrac);
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
    const [dragging, setDragging] = useState(false);
    const draggingRef = useRef(false); // NEW: source of truth for listeners
    const userResizedRef = useRef(false);

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
    }, [onMouseMove]);

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
                        variant="outlined"
                        square
                        sx={{
                            minHeight: 0,
                            height: '100%',
                            overflow: 'hidden', // prevent internal scroll
                            borderRadius: 1,
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
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
                    setLeftPx(clampLeft(Math.floor((window.innerWidth || 1200) * defaultLeftFrac)));
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
                        // bgcolor: dragging ? 'primary.main' : 'divider',
                        bgcolor: 'divider',
                        // borderRadius: 1,
                    },
                    '&:hover': { bgcolor: 'text.secondary' },
                    // '&': { zIndex: 1 },
                }}
            />

            {/* Left: Sidebar (scrollable) */}
            <Paper
                variant="outlined"
                square
                sx={{
                    height: '100%',
                    minWidth: sidebarCollapsed
                        ? `${collapsedSidebarWidth}px`
                        : `${Math.floor((window.innerWidth || 1200) * Math.min(minLeftFrac, maxLeftFrac))}px`,
                    overflow: 'hidden',
                    // overflowX: 'hidden',
                    borderRadius: 1,
                    p: 1,
                    borderWidth: overlayActive ? 2 : 1,
                    // bgcolor: '#a5aa52',
                    position: 'relative',
                    borderColor: (t) =>
                        overlayActive
                            ? (t.palette.mode === 'dark'
                                ? alpha(t.palette.common.white, 0.35)
                                : alpha(t.palette.common.black, 0.55))
                            : t.palette.divider,
                    boxShadow: (t) =>
                        overlayActive
                            ? `
                               inset 0 0 0 2px ${alpha(t.palette.common.black, 0.48)}`
                            : 'none',
                    // animation: overlayActive ? `${ringPulse} 600ms ease-out` : 'none',
                    willChange: 'transform, box-shadow',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
            >
                {/* Keep the sidebar mounted even when collapsed (prevents library/output from reloading) */}
                <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Hide button */}
                    <Box sx={{ mb: 0, position: 'relative', display: sidebarCollapsed ? 'none' : 'block' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -8,
                                left: -8,
                            }}
                        >
                            <Tooltip title="Hide panels" placement="left" arrow>
                                <Button
                                    size="small"
                                    color="inherit"
                                    onClick={() => setSidebarCollapsed(true)}
                                    startIcon={<ChevronRightIcon fontSize="small" />}
                                    sx={{
                                        minWidth: 0,
                                        px: 0.75,
                                        py: 0.25,
                                        textTransform: 'none',
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        borderColor: 'divider',
                                        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
                                    }}
                                    aria-label="hide right panels"
                                >
                                    Hide panels
                                </Button>
                            </Tooltip>

                            {/* icon-only fallback for narrow widths */}
                            <Tooltip title="Hide panels" placement="left" arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => setSidebarCollapsed(true)}
                                    sx={{
                                        display: { xs: 'inline-flex', sm: 'none' },
                                        ml: 0.5,
                                        color: 'text.secondary',
                                    }}
                                    aria-label="hide right panels (icon)"
                                >
                                    <ChevronRightIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Sidebar content (mounted; just hidden when collapsed) */}
                    <Box
                        sx={{
                            mt: 3,
                            flex: 1,
                            minHeight: 0,
                            display: sidebarCollapsed ? 'none' : 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {sidebar}
                    </Box>
                </Box>

                {/* Collapsed handle overlay */}
                <Tooltip title="Show panels" placement="left" arrow>
                    <Box
                        onClick={() => setSidebarCollapsed(false)}
                        role="button"
                        aria-label="expand right panel"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSidebarCollapsed(false);
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