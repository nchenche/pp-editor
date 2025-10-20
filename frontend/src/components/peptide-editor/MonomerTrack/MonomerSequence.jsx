import React, { useRef } from "react";

import { MonomerItem } from "./MonomerItem";

import { Box, Typography, IconButton, Tooltip, useTheme, ListItem } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";

function mergeRefs(...refs) {
    return (node) => {
        refs.forEach((ref) => {
            if (typeof ref === "function") ref(node);
            else if (ref && typeof ref === "object") ref.current = node;
        });
    };
}


// helper: allowed letters and tint map
const ALLOWED = new Set(['H', 'E', 'C', 'T', 'G', 'I', 'B', '-']);
const letterTint = (t, ch) => {
    const map = {
        H: { bg: alpha('#16a34a', 0.14), bd: alpha('#16a34a', 0.35), fg: '#064e3b' },    // green
        E: { bg: alpha('#1d4ed8', 0.14), bd: alpha('#1d4ed8', 0.35), fg: '#0b3a9a' },    // blue
        T: { bg: alpha('#d97706', 0.14), bd: alpha('#d97706', 0.35), fg: '#7c2d12' },    // amber
        C: { bg: alpha('#64748b', 0.14), bd: alpha('#64748b', 0.35), fg: '#1f2937' },    // gray
        G: { bg: alpha('#0d9488', 0.14), bd: alpha('#0d9488', 0.35), fg: '#064e3b' },    // teal
        I: { bg: alpha('#7c3aed', 0.14), bd: alpha('#7c3aed', 0.35), fg: '#3b0764' },    // purple
        B: { bg: alpha('#4338ca', 0.14), bd: alpha('#4338ca', 0.35), fg: '#1e1b4b' },    // indigo
        '-': { bg: alpha('#94a3b8', 0.10), bd: alpha('#94a3b8', 0.28), fg: '#475569' },
    };
    return map[ch] || map['-'];
};

export const MonomerSequence = ({
    // data
    monomers,
    linkMap,
    hoveredMonomer,

    // DnD
    children, // placeholder goes here
    droppableRef, // provided by parent DnD

    // interactions
    onDelete, // delete single monomer (passed to MonomerItem)
    onDeleteSequence, // delete the whole sequence
    onSelectSequence, // focus this sequence

    // state
    isActive = false, // highlight header when selected
    sequenceIndex = 0, // 0-based; label shows 1-based
    label = 'Unknown',

    // hover handlers
    handleMonomerEnter,
    handleMonomerLeave,

    // visuals
    isDragging = true, // suppress link highlights during drag
    dndDisabled = false,

    constraintsMode = false,
    constraints = [],
    onEditConstraint = () => { },
}) => {
    const theme = useTheme();

    const gridGap = 0.5; // spacing between chips (theme spacing units)
    const chipWidth = 32; // px; matches w-8 from MonomerItem
    const chipHeight = 20; // px; for reference only
    const cellSize = 18; // px height for constraints cells
    const seqLen = monomers.length;

    // Subtle background for selected header; otherwise paper-like
    const headerBg = isActive ? theme.palette.action.selected : theme.palette.background.paper;
    const headerHover = isActive
        ? alpha(theme.palette.action.selected, theme.palette.mode === "dark" ? 0.5 : 0.15)
        : alpha(theme.palette.action.hover, 0.15);

    return (
        <ListItem
            disableGutters
            sx={{
                display: "flex",
                alignItems: "stretch",
                p: 0,
                my: 0.4,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                minHeight: 38, // reduced height
                bgcolor: "background.paper",
                overflow: "visible",
                position: "relative",
                transition: 'min-height 140ms ease',
                ...(constraintsMode ? { minHeight: 38 + 6 + cellSize } : null), // room for micro-row
            }}
            // for screen readers, let the item be selectable
            aria-selected={isActive || undefined}
        >
            {/* Left header — fused with lane, fills height, subtle selected bg */}
            <Box
                role="button"
                tabIndex={0}
                onClick={onSelectSequence}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectSequence?.()}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    px: 1,
                    minWidth: 110,
                    userSelect: "none",
                    bgcolor: headerBg,
                    borderRight: `1px solid ${theme.palette.divider}`, // fused, just a separator line
                    cursor: "pointer",
                    "&:hover": { bgcolor: headerHover },
                    flexDirection: constraintsMode ? 'column' : 'row',
                    gap: constraintsMode ? 0.25 : 0,
                }}
            >
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: isActive ? "text.primary" : "text.secondary" }}
                >
                    {label}
                </Typography>
                {constraintsMode && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                        Constraints
                    </Typography>
                )}
            </Box>

            {/* Middle: chips + constraints stacked and scrolled together */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minWidth: 0,
                    overflowX: 'auto',          // both rows share the same scroll
                    overflowY: 'hidden',
                    overflow: 'visible',
                    // position: 'relative',
                }}
            >
                {/* Chips row (droppable) */}
                <Box
                    ref={mergeRefs(droppableRef)}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: gridGap,
                        flex: '0 0 auto',
                        minHeight: 32,
                        px: 0.75,
                        position: "relative",
                        // no overflow here; wrapper above handles scroll
                    }}
                >
                    {monomers.map((monomer, index) => {
                        const isNterCap = monomer.m_subtype === "cap" && monomer.m_RgroupIdx?.[1] != null;
                        const isCterCap = monomer.m_subtype === "cap" && monomer.m_RgroupIdx?.[0] != null;
                        const isHovered = monomer["res-idx"] === hoveredMonomer;

                        let linkIndices = Array.isArray(monomer.linkIds) ? monomer.linkIds : [];
                        if (!linkIndices.length && linkMap) {
                            const monomerIdx = parseInt(String(monomer["res-idx"]).split("-")[1], 10);
                            linkIndices = Object.entries(linkMap)
                                .filter(([, pairs]) => pairs?.some((p) => p.monomerIdx === monomerIdx))
                                .map(([linkId]) => linkId);
                        }
                        if (isDragging) linkIndices = [];

                        return (
                            <MonomerItem
                                key={monomer.uid || monomer._id || monomer["res-idx"] || index}
                                index={index}
                                monomer={monomer}
                                handleMonomerEnter={handleMonomerEnter}
                                handleMonomerLeave={handleMonomerLeave}
                                onDelete={onDelete}
                                isNterCap={isNterCap}
                                isCterCap={isCterCap}
                                linkIndices={linkIndices}
                                isHovered={isHovered}
                                dndDisabled={dndDisabled}
                            />
                        );
                    })}
                    {children}
                </Box>

                {/* Constraints micro-row (aligned under chips) */}
                {constraintsMode && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: gridGap,
                            flex: '0 0 auto',
                            px: 0.75,
                            pb: 0.5,
                            mt: 0.5,
                        }}
                    >
                        {monomers.map((m, idx) => {
                            const val = String(constraints[idx] ?? '-').toUpperCase();
                            const clamped = ALLOWED.has(val) ? val : '-';
                            return (
                                <ConstraintCell
                                    key={(m.uid || m._id || m['res-idx'] || idx) + '-cell'}
                                    index={idx}
                                    value={clamped}
                                    commitAt={(i, ch) => onEditConstraint?.(i, ch)}
                                    chipWidth={chipWidth}
                                    cellSize={cellSize}
                                />
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Right — delete whole sequence (plain icon, no color) */}
            <Box sx={{ display: "flex", alignItems: "center", pl: 0.5, pr: 0.5 }}>
                <Tooltip title="Delete sequence" placement="left" arrow>
                    <IconButton
                        size="small"
                        onClick={onDeleteSequence}
                        aria-label={`Delete ${label}`}
                        disabled={dndDisabled}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </ListItem>
    );
};


// place near bottom of file
function ConstraintCell({ index, value, commitAt, chipWidth = 32, cellSize = 18 }) {
    const ref = useRef(null);
    const theme = useTheme();

    const moveFocus = (nextIdx) => {
        const parent = ref.current?.parentElement;
        const next = parent?.querySelector(`input[data-idx="${nextIdx}"]`);
        next?.focus();
        next?.select?.();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(index - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(index + 1); return; }
        if (e.key === 'Enter') { e.preventDefault(); moveFocus(e.shiftKey ? index - 1 : index + 1); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); commitAt(index, '-'); return; }
        if (e.key && e.key.length === 1) {
            const ch = e.key.toUpperCase();
            if (ALLOWED.has(ch)) {
                e.preventDefault();
                commitAt(index, ch);
                moveFocus(index + 1);
            } else {
                ref.current?.animate(
                    [{ transform: 'translateX(0)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }],
                    { duration: 120 }
                );
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = (e.clipboardData?.getData('text') || '').toUpperCase();
        if (!text) return;
        let i = index;
        for (const raw of text) {
            if (ALLOWED.has(raw)) {
                commitAt(i, raw);
                i += 1;
            }
        }
        moveFocus(i);
    };

    const tint = letterTint(null, value); // your helper already returns colors

    return (
        <input
            ref={ref}
            data-idx={index}
            value={value}
            onChange={() => { }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            inputMode="text"
            aria-label={`Constraint at ${index + 1}`}
            style={{
                width: chipWidth,
                height: cellSize,
                lineHeight: `${cellSize}px`,
                textAlign: 'center',
                borderRadius: 6,
                border: `1px solid ${tint.bd}`,
                outline: 'none',
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                padding: 0,
                boxSizing: 'border-box',
                background: tint.bg,
                color: tint.fg,
            }}
            onFocus={(e) => { e.currentTarget.style.outline = '1px solid var(--mui-palette-primary-main)'; }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
            placeholder="-"
            maxLength={1}
        />
    );
}