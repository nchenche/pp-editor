import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { Box, Paper } from '@mui/material';


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
            <div className="border-2 border-yellow-400 rounded-lg p-4 shadow-sm flex-1 min-h-0 min-w-[480px]">
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
    minLeftPx = 600,   // minimum sidebar width 
    maxLeftFrac = 0.45, // maximum sidebar width as fraction of viewport width
    handleWidth = 6,   // draggable handle width (px)
    ...rest
}) => {
    const containerRef = useRef(null);
    const [leftPx, setLeftPx] = useState(420);
    const [dragging, setDragging] = useState(false);
    const draggingRef = useRef(false); // NEW: source of truth for listeners

    const clampLeft = useCallback((px) => {
        const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
        const maxLeft = Math.floor(vw * maxLeftFrac);
        return Math.min(Math.max(px, minLeftPx), maxLeft);
    }, [minLeftPx, maxLeftFrac]);

    useEffect(() => {
        const init = () => setLeftPx(prev => clampLeft(prev || Math.floor((window.innerWidth || 1200) * 0.4)));
        init();
        const onResize = () => setLeftPx(prev => clampLeft(prev));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [clampLeft]);

    // Stable move handler (no dragging in deps)
    const onMouseMove = useCallback((e) => {
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const desired = e.clientX - rect.left;
        setLeftPx(clampLeft(desired));
    }, [clampLeft, containerRef]);

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
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
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

    const gridTemplateColumns = useMemo(() => `${leftPx}px ${handleWidth}px 1fr`, [leftPx, handleWidth]);

    return (
        <Box
            ref={containerRef}
            sx={{
                height,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns,
                gap: 0,
                px: 1,
                py: 1,
                overflow: 'hidden',
            }}
            {...rest}
        >
            {/* Left: Sidebar (scrollable) */}
            <Paper
                variant="outlined"
                square
                sx={{
                    height: '100%',
                    minWidth: minLeftPx,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    borderRadius: 1,
                    p: 1,
                }}
            >
                {sidebar}
            </Paper>

            {/* Vertical handle (draggable) */}
            <Box
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                tabIndex={0}
                onMouseDown={startDrag}
                onKeyDown={(e) => { if (e.key === 'Escape') stopDrag(); }}
                onDoubleClick={() => setLeftPx(clampLeft(Math.floor((window.innerWidth || 1200) * 0.4)))}
                sx={{
                    cursor: 'col-resize',
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
                        width: '2px',
                        bgcolor: dragging ? 'primary.main' : 'divider',
                        borderRadius: 1,
                    },
                    '&:hover::before': { bgcolor: 'text.disabled' },
                    '&': { zIndex: 1 },
                }}
            />

            {/* Right: Two rows; top ~65%, bottom ~35% */}
            <Box
                sx={{
                    height: '100%',
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateRows: '70% 30%',
                    gap: 1,
                    overflow: 'hidden', // this column doesn't scroll as a whole
                }}
            >
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
            </Box>
        </Box>
    );
};