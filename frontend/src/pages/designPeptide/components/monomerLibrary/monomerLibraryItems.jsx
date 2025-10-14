import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardActions, IconButton, Box, Tooltip, Typography } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Chip from "@mui/material/Chip";


// Helper: derive a concise tag for the monomer
function deriveMonomerTag(m) {
    const subtype = m?.m_subtype || m?.m_type;

    // Caps: prefer m_RgroupIdx to determine N-ter vs C-ter
    if (subtype === 'cap') {
        const rg = m?.m_RgroupIdx;
        const hasIdx = Array.isArray(rg);
        const isNterCap = hasIdx && rg[1] != null; // N-ter uses index 1
        const isCterCap = hasIdx && rg[0] != null; // C-ter uses index 0

        if (isNterCap && !isCterCap) return 'N-cap';
        if (!isNterCap && isCterCap) return 'C-cap';
        if (isNterCap && isCterCap) return 'Cap'; // both present (fallback label)

        // Fallback heuristics (name/capSide) if m_RgroupIdx is absent
        const name = (m?.m_name || '').toLowerCase();
        if (name.includes('n-cap') || name.includes('ncap') || m?.capSide === 'N' || m?.cap_side === 'N') return 'N-cap';
        if (name.includes('c-cap') || name.includes('ccap') || m?.capSide === 'C' || m?.cap_side === 'C') return 'C-cap';
        return 'Cap';
    }

    // Natural / non-natural
    if (m?.m_subtype === 'natural' || m?.natural === true) return 'Natural';
    if (m?.m_subtype === 'non-natural' || m?.nonNatural === true) return 'Non-natural';

    return null;
}

// Themed styles for the vertical side tag, now parameterized by width
function sideTagSx(label, sidebarW = 22) {
    const base = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: sidebarW, // sidebar width
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        userSelect: 'none',
        pointerEvents: 'none',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        transform: 'translateY(10%) rotate(180deg)',
    };
    let color = '#1e293b', bg = 'rgba(30,41,59,0.08)'; // slate
    if (label === 'Natural') {
        color = '#166534'; bg = 'rgba(22,101,52,0.10)';
    } else if (label === 'Non-natural') {
        color = '#7c2d12'; bg = 'rgba(124,45,18,0.10)';
    } else if (label === 'N-cap' || label === 'C-cap' || label === 'Cap') {
        color = '#334155'; bg = 'rgba(51,65,85,0.10)';
    }
    return { ...base, color, backgroundColor: bg };
}

// Size tokens
const SIZE = {
    sm: {
        cardW: 128,
        sidebarW: 22,
        imgW: 92,
        imgH: 68,
        imgMinH: 84,
        titleFs: '0.72rem',
        nameFs: '0.66rem',
        gapClass: 'gap-5',
    },
    lg: {
        cardW: 160,
        sidebarW: 26,
        imgW: 120,
        imgH: 88,
        imgMinH: 112,
        titleFs: '0.80rem',
        nameFs: '0.72rem',
        gapClass: 'gap-6',
    }
};

const MonomerLibraryItem = memo(({ monomer, onMonomerAdd, onInfo = () => { }, itemSize = 'sm' }) => {
    const tag = useMemo(() => deriveMonomerTag(monomer), [monomer]);
    const sz = SIZE[itemSize] || SIZE.sm;
    
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
                "&:hover": { transform: "scale(1.04)", zIndex: 2 },
                bgcolor: "background.paper",
                position: "relative",
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
                sx={{
                    p: 0,
                    pb: 0,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 3,
                    display: "flex",
                    justifyContent: "space-around",
                    background: "rgba(30,41,59,0.97)",
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                }}
            >
                <Tooltip title="Add monomer" placement="top" arrow>
                    <IconButton
                        size="small"
                        color="success"
                        onClick={() => onMonomerAdd(monomer)}
                        sx={{ p: 0.6, color: "grey.400" }}
                        className='hover:text-slate-200'
                    >
                        <AddCircleIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="View details" placement="top" arrow>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={onInfo}
                        sx={{ p: 0.6, color: "grey.400" }}
                        className='hover:text-slate-200'
                    >
                        <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </CardActions>

            {/* Main area: structure image */}
            <Box
                sx={{
                    mt: 3.8,
                    pt: 0.75,
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
                    src={`data:image/png;base64,${monomer.image_url}`}
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
                    {monomer.pdbName}
                </Typography>
                <Tooltip title={`${monomer.m_name} (${monomer.symbol})`} placement="bottom" arrow disableInteractive>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: "block",
                            fontSize: sz.nameFs,
                            lineHeight: 1.1,
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                        }}
                        noWrap
                    >
                        {monomer.m_name}
                    </Typography>
                </Tooltip>
            </CardContent>
        </Card>
    );
});

function MonomerLibraryItemsInner({ monomers, handleAddingMonomer, itemSize = 'lg' }) {
    const gapClass = (SIZE[itemSize] || SIZE.sm).gapClass;
    return (
        <div className={`relative flex flex-wrap justify-center ${gapClass} p-2`}>
            {monomers.map((monomer) => (
                <MonomerLibraryItem
                    key={monomer._id}
                    monomer={monomer}
                    onMonomerAdd={handleAddingMonomer}
                    onInfo={() => console.log("More info for", monomer.symbol)}
                    itemSize={itemSize}
                />
            ))}
        </div>
    );
}


export const MonomerLibraryItems = memo(MonomerLibraryItemsInner, areEqualItems);


function areEqualItems(prev, next) {
    // Only re-render when data or handlers change
    if (prev.monomers !== next.monomers) return false;
    if (prev.handleAddingMonomer !== next.handleAddingMonomer) return false;
    return true;
}