import React, { useMemo, useRef } from "react";

import { MonomerItem } from "./MonomerItem";

import { Box, Typography, IconButton, Tooltip, useTheme, ListItem } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";

import { LINK_COLORS } from './linkColors';

function mergeRefs(...refs) {
    return (node) => {
        refs.forEach((ref) => {
            if (typeof ref === "function") ref(node);
            else if (ref && typeof ref === "object") ref.current = node;
        });
    };
}

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
    isDragging = false, // suppress link highlights during drag
    dndDisabled = false,

    // global token index offset for this sequence (0-based), used to match linkMap while reordering
    sequenceOffset = 0,

    constraintsMode = false,
    constraints = [],
    onEditConstraint = () => { },
}) => {
        const linkColorIndexById = useMemo(() => {
            if (!linkMap) return {};

            // Deterministic + distinct color per linkId (for complete links)
            const completeLinkIds = Object.entries(linkMap)
                .filter(([, pairs]) => Array.isArray(pairs) && pairs.length === 2)
                .map(([linkId]) => linkId)
                .sort((a, b) => Number(a) - Number(b));

            const out = {};
            for (let i = 0; i < completeLinkIds.length; i++) {
                out[completeLinkIds[i]] = i % LINK_COLORS.length;
            }
            return out;
        }, [linkMap]);
    const theme = useTheme();

    const gridGap = 0.5; // spacing between chips (theme spacing units)
    const cellSize = 18; // px height for constraints cells

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
                my: 0.125,
                mt: 0.25,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                minHeight: 34, // reduced height
                bgcolor: "background.paper",
                overflow: "visible",
                position: "relative",
                transition: 'min-height 140ms ease',
                ...(constraintsMode ? { minHeight: 38 + 6 + cellSize } : null), // room for micro-row
            }}
            // for screen readers, let the item be selectable
            aria-selected={isActive || undefined}
        >

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
                            const globalIdx = Number(sequenceOffset) + Number(index);
                            linkIndices = Object.entries(linkMap)
                                .filter(([, pairs]) => pairs?.some((p) => Number(p?.monomerIdx) === globalIdx))
                                .map(([linkId]) => linkId);
                        }
                        // Keep ordering stable
                        linkIndices = (linkIndices || []).slice().sort((a, b) => Number(a) - Number(b));
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
                                linkColorIndexById={linkColorIndexById}
                                isHovered={isHovered}
                                dndDisabled={dndDisabled}
                            />
                        );
                    })}
                    {children}
                </Box>
            </Box>

            {/* Right — delete whole sequence (plain icon, no color) */}
            {/* <Box sx={{ display: "flex", alignItems: "center", pl: 0.5, pr: 0.5 }}>
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
            </Box> */}
        </ListItem>
    );
};