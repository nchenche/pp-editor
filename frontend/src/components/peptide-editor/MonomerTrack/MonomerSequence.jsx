import { Box, Typography, IconButton, Tooltip, useTheme, ListItem } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";
import { MonomerItem } from "./MonomerItem";

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
    isDragging = true, // suppress link highlights during drag
    dndDisabled = false,
}) => {
    const theme = useTheme();

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
                minHeight: 36, // reduced height
                bgcolor: "background.paper",
                overflow: "visible",
                position: "relative",                
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
                }}
            >
                <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: isActive ? "text.primary" : "text.secondary" }}
                >
                    {label}
                </Typography>
            </Box>

            {/* Middle — droppable lane with monomers (no dashed border) */}
            <Box
                ref={mergeRefs(droppableRef)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flex: 1,
                    minHeight: 32,
                    px: 0.75,
                    overflow: "visible",
                    position: "relative",
                }}
            >
                {monomers.map((monomer, index) => {
                    const isNterCap = monomer.m_subtype === "cap" && monomer.m_RgroupIdx?.[1] != null;
                    const isCterCap = monomer.m_subtype === "cap" && monomer.m_RgroupIdx?.[0] != null;
                    const isHovered = monomer["res-idx"] === hoveredMonomer;

                    // Prefer stable link IDs precomputed on monomer
                    let linkIndices = Array.isArray(monomer.linkIds) ? monomer.linkIds : [];
                    if (!linkIndices.length && linkMap) {
                        const monomerIdx = parseInt(String(monomer["res-idx"]).split("-")[1], 10);
                        linkIndices = Object.entries(linkMap)
                            .filter(([, pairs]) => pairs?.some((p) => p.monomerIdx === monomerIdx))
                            .map(([linkId]) => linkId);
                    }
                    if (isDragging) linkIndices = []; // avoid flicker during drag

                    return (
                        <MonomerItem
                            key={monomer.uid || monomer._id || monomer["res-idx"] || index}
                            index={index} // MonomerItem should ignore when isNterCap/isCterCap
                            monomer={monomer}
                            handleMonomerEnter={handleMonomerEnter}
                            handleMonomerLeave={handleMonomerLeave}
                            onDelete={onDelete}
                            isNterCap={isNterCap}
                            isCterCap={isCterCap}
                            linkIndices={linkIndices}
                            isHovered={isHovered}  // monomer.m_abbr === 'C'  ||
                            dndDisabled={dndDisabled}
                        />
                    );
                })}
                {children}
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