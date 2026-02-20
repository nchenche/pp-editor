import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, getScrollbarSize } from 'react-window';

import { Card, CardContent, CardActions, IconButton, Box, Tooltip, Typography } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Chip from "@mui/material/Chip";

import { getMissingRequiredRgroups } from '../../../../utils/replacementCompatibility';
import { getMonomerTag, sideTagSx } from '../../../../utils/monomerTagStyles';
import MonomerDetailsDialog from './MonomerDetailsDialog';

const EMPTY_CELL_PROPS = {};

// Size tokens
const SIZE = {
    sm: {
        cardW: 112,
        sidebarW: 20,
        imgW: 90,
        imgH: 72,
        imgMinH: 72,
        titleFs: '0.68rem',
        nameFs: '0.62rem',
        gap: 2,
    },
    // xs: {
    //     cardW: 128,
    //     sidebarW: 22,
    //     imgW: 100,
    //     imgH: 80,
    //     imgMinH: 80,
    //     titleFs: '0.72rem',
    //     nameFs: '0.66rem',
    //     gap: 2.5,
    // },
    lg: {
        cardW: 144,
        sidebarW: 24,
        imgW: 110,
        imgH: 88,
        imgMinH: 96,
        titleFs: '0.76rem',
        nameFs: '0.70rem',
        gap: 2.75,
    },
    // lg: {
    //     cardW: 160,
    //     sidebarW: 26,
    //     imgW: 120,
    //     imgH: 96,
    //     imgMinH: 112,
    //     titleFs: '0.80rem',
    //     nameFs: '0.72rem',
    //     gap: 3,
    // }
};

const MonomerLibraryItem = memo(
    ({ monomer, onMonomerAdd, onInfo = () => { }, itemSize = 'sm', transformOrigin = 'center center', replaceActive = false, replaceRequiredKey = '' }) => {
    const tag = useMemo(() => getMonomerTag(monomer), [monomer]);
    const sz = SIZE[itemSize] || SIZE.sm;
    console.log(monomer);

    const requiredRgroups = useMemo(() => {
        if (!replaceActive) return [];
        const raw = String(replaceRequiredKey || '').trim();
        if (!raw) return [];
        return raw
            .split(',')
            .map((s) => parseInt(String(s).trim(), 10))
            .filter((n) => Number.isFinite(n) && n > 0);
    }, [replaceActive, replaceRequiredKey]);

    const missingRgroups = useMemo(() => {
        if (!replaceActive) return [];
        return getMissingRequiredRgroups({ candidate: monomer, requiredRgroups });
    }, [replaceActive, monomer, requiredRgroups]);

    const addDisabled = replaceActive && missingRgroups.length > 0;

    const addTooltipTitle = addDisabled
        ? `Cannot replace here: missing required linking groups (${missingRgroups.map((r) => `R${r}`).join(', ')})`
        : 'Add monomer';

    const imageBase64 = monomer?.image_binary || monomer?.image_url || monomer?.image_base64 || monomer?.imageBase64 || '';

    const detailsTooltip = (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                columnGap: 1,
                rowGap: 0.5,
                fontSize: 12,
            }}
        >
            <strong>Name:</strong> {monomer.m_name}
            <strong>BILN symbol:</strong> {monomer.symbol}
            <strong>PDB code:</strong> {monomer.pdbName}
        </Box>
    );


    return (
        <Card
            variant="outlined"
            sx={{
                width: sz.cardW,
                minWidth: 0,
                p: 0,
                borderRadius: 2,
                boxShadow: 2,
                transition: "transform 0.2s",
                transformOrigin,
                "&:hover": { transform: "scale(1.1)", zIndex: 20 },
                bgcolor: "background.paper",
                position: "relative",
                opacity: addDisabled ? 0.45 : 1,
            }}
        >
            {/* Vertical side tag (left) */}
            {tag && (
                <Box sx={sideTagSx(tag, sz.sidebarW)}>
                    {tag}
                </Box>
            )}

            {/* Top bar: actions */}
            <CardActions
                disableSpacing={false}
                sx={{
                    p: 0,
                    pb: 0,
                    px: 0.5,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 3,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 0.5,
                    background: "rgba(30,41,59,0.97)",
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                }}
            >
                <Tooltip title={addTooltipTitle} placement="top" arrow>
                    <span style={{ display: 'inline-flex' }}>
                        <IconButton
                            size="small"
                            color="success"
                            disabled={addDisabled}
                            onClick={() => onMonomerAdd(monomer)}
                            sx={{ p: 0.6, color: "grey.400" }}
                            className='hover:text-slate-200'
                        >
                            <AddCircleIcon fontSize="small" sx={{ fontSize: 15 }} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Tooltip
                    arrow
                    placement="top"
                    disableInteractive
                    title={detailsTooltip}
                >
                    <IconButton
                        size="small"
                        color="info"
                        onClick={onInfo}
                        sx={{ p: 0.6, color: "grey.400" }}
                        className="hover:text-slate-200"
                    >
                        <InfoOutlinedIcon fontSize="small" sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
            </CardActions>

            {/* Main area: structure image */}
            <Box
                sx={{
                    mt: 3.8,
                    pt: 0.05,
                    ml: tag ? `${sz.sidebarW}px` : 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: sz.imgMinH,
                    overflow: "hidden",
                }}
                onMouseDown={e => e.preventDefault()}
            >
                <Box
                    component="img"
                    src={`data:image/png;base64,${imageBase64}`}
                    alt={`Structure of ${monomer.symbol}`}
                    loading="lazy"
                    decoding="async"
                    width={sz.imgW}
                    height={sz.imgH}
                    sx={{
                        objectFit: "contain",
                        maxHeight: sz.imgMinH,
                        userSelect: "none",
                        pointerEvents: "none",
                        display: "block",
                    }}
                />
            </Box>

            {/* PDB code (bold) and name (ellipsis) */}
            <CardContent sx={{ p: 0.75, textAlign: "center", pb: "6px !important", ml: tag ? `${sz.sidebarW}px` : 0 }}>
                <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.primary"
                    sx={{ display: "block", fontSize: sz.titleFs, lineHeight: 1.15, mb: 0.25 }}
                    noWrap
                >
                    {monomer.symbol}
                </Typography>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: "block",
                        fontSize: sz.nameFs,
                        lineHeight: 1.05,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                    }}
                    noWrap
                >
                    {monomer.pdbName}
                </Typography>
            </CardContent>
        </Card>
    );
    }
);

function MonomerLibraryItemsInner({ monomers, handleAddingMonomer, itemSize = 'lg', replaceActive = false, replaceRequiredKey = '' }) {
    const sz = SIZE[itemSize] || SIZE.sm;

    const [detailMonomer, setDetailMonomer] = useState(null);
    const handleCloseDetail = useCallback(() => setDetailMonomer(null), []);

    const containerRef = useRef(null);
    const measureRef = useRef(null);
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [measuredCardH, setMeasuredCardH] = useState(null);

    // Keep a cheap ResizeObserver on the container so the grid adapts.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => {
            const r = el.getBoundingClientRect();
            setViewport({ width: Math.max(0, Math.floor(r.width)), height: Math.max(0, Math.floor(r.height)) });
        };

        update();

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            ro?.disconnect?.();
            window.removeEventListener('resize', update);
        };
    }, []);

    const list = Array.isArray(monomers) ? monomers : [];

    // Map MUI spacing-ish values to pixels; keep it stable per size.
    const gapPx = useMemo(() => Math.max(0, Math.round(8 * (Number(sz.gap) || 2))), [sz.gap]);
    const paddingPx = 12;

    const cardW = sz.cardW;
    const fallbackCardH = itemSize === 'lg' ? 170 : 150;
    const cardH = Number.isFinite(measuredCardH) && measuredCardH > 0 ? measuredCardH : fallbackCardH;
    const rowHeight = cardH + gapPx;

    // Measure the actual card height once per itemSize using a hidden sample card.
    useEffect(() => {
        setMeasuredCardH(null);
    }, [itemSize]);

    useEffect(() => {
        const el = measureRef.current;
        if (!el) return;
        if (!list || list.length === 0) return;

        const update = () => {
            const r = el.getBoundingClientRect();
            const h = Math.max(0, Math.ceil(r.height));
            if (h > 0) setMeasuredCardH(h);
        };

        update();

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            ro?.disconnect?.();
            window.removeEventListener('resize', update);
        };
    }, [list, itemSize]);

    const safeHeight = Math.max(0, (viewport.height || 0) - paddingPx * 2);

    const baseSafeWidth = Math.max(0, (viewport.width || 0) - paddingPx * 2);
    const computeColumnCount = (usableWidthPx) => {
        const w = Math.max(0, usableWidthPx - 1); // tiny guard against fractional px + border rounding
        return Math.max(1, Math.floor((w + gapPx) / (cardW + gapPx)));
    };

    // Two-pass sizing: a vertical scrollbar reduces usable width and can cause clipped cards
    // if we compute the column count without accounting for it.
    const col1 = computeColumnCount(baseSafeWidth);
    const rows1 = Math.ceil(list.length / col1);
    const hasVScroll1 = rows1 * rowHeight > safeHeight;
    const scrollbarW = hasVScroll1 ? getScrollbarSize?.() || 0 : 0;

    const safeWidth = Math.max(0, baseSafeWidth - scrollbarW);
    const columnCount = computeColumnCount(safeWidth);
    const rowCount = Math.ceil(list.length / columnCount);

    const Row = ({ index, style, ariaAttributes }) => {
        const start = index * columnCount;
        if (start >= list.length) return null;
        const end = Math.min(list.length, start + columnCount);
        const rowItems = list.slice(start, end);

        return (
            <Box
                {...ariaAttributes}
                style={style}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: `${gapPx}px`,
                    px: `${paddingPx}px`,
                    boxSizing: 'border-box',
                    overflow: 'visible',
                }}
            >
                {rowItems.map((monomer, localIdx) => (
                    <MonomerLibraryItem
                        key={monomer?._id ?? `${start}-${localIdx}`}
                        monomer={monomer}
                        onMonomerAdd={handleAddingMonomer}
                        onInfo={() => setDetailMonomer(monomer)}
                        itemSize={itemSize}
                        transformOrigin={index === 0 ? 'center top' : 'center center'}
                        replaceActive={replaceActive}
                        replaceRequiredKey={replaceRequiredKey}
                    />
                ))}
            </Box>
        );
    };

    return (
        <Box ref={containerRef} sx={{ height: '100%', width: '100%', minHeight: 0, position: 'relative' }}>
            {/* Hidden measurer to derive the real card height (prevents huge row gaps). */}
            {list.length > 0 ? (
                <Box
                    ref={measureRef}
                    sx={{
                        position: 'absolute',
                        visibility: 'hidden',
                        pointerEvents: 'none',
                        left: 0,
                        top: 0,
                        zIndex: -1,
                    }}
                >
                    <MonomerLibraryItem
                        monomer={list[0]}
                        onMonomerAdd={() => { }}
                        onInfo={() => { }}
                        itemSize={itemSize}
                    />
                </Box>
            ) : null}
            {viewport.width > 0 && viewport.height > 0 ? (
                <List
                    defaultHeight={safeHeight}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    overscanCount={3}
                    rowProps={EMPTY_CELL_PROPS}
                    rowComponent={Row}
                    style={{ height: safeHeight, width: viewport.width, overflowX: 'hidden' }}
                />
            ) : null}

            <MonomerDetailsDialog
                open={Boolean(detailMonomer)}
                onClose={handleCloseDetail}
                monomer={detailMonomer}
            />
        </Box>
    );
}


export const MonomerLibraryItems = memo(MonomerLibraryItemsInner, areEqualItems);


function areEqualItems(prev, next) {
    // Only re-render when data or handlers change
    if (prev.monomers !== next.monomers) return false;
    if (prev.handleAddingMonomer !== next.handleAddingMonomer) return false;
    if (prev.itemSize !== next.itemSize) return false;
    if (prev.replaceActive !== next.replaceActive) return false;
    if (prev.replaceRequiredKey !== next.replaceRequiredKey) return false;
    return true;
}