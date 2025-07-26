import React, { useState } from "react";
import {
    Box, Typography, IconButton, InputBase, ToggleButtonGroup, ToggleButton,
    Popover, Slider, Divider, useTheme
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";



// 2. Advanced filters as a Popover (not Drawer)
function AdvancedFilterPopover({ anchorEl, open, onClose, range, onRangeChange }) {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            // transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { p: 2, minWidth: 230 } } }}
        >
            <Typography fontWeight="bold" fontSize={15} gutterBottom>
                Advanced Filters
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography fontSize={13} color="text.secondary" mb={1}>
                Molecular Weight (g/mol)
            </Typography>
            <Slider
                min={50}
                max={800}
                value={range}
                onChange={(_, val) => onRangeChange(val)}
                valueLabelDisplay="auto"
                size="small"
            />
            {/* Add more sliders here as needed */}
        </Popover>
    );
}


// 1. Quick filters: Only one can be active at a time.
function QuickFilterBar({ value, onChange, onShowAdvanced }) {
    // Determine which filter is active
    let selected = "all";
    if (value.caps) selected = "caps";
    else if (value.natural) selected = "natural";
    else if (value.nonNatural) selected = "nonNatural";

    const handleToggle = (_, v) => {
        // v is the selected value or null if deselected
        if (!v || v === "all") {
            onChange({ caps: false, natural: false, nonNatural: false });
        } else {
            onChange({
                caps: v === "caps",
                natural: v === "natural",
                nonNatural: v === "nonNatural"
            });
        }
    };

    return (
        <Box display="flex" alignItems="center" gap={1} mt={1}>
            <ToggleButtonGroup
                value={selected}
                exclusive
                onChange={handleToggle}
                size="small"
                sx={{ ".MuiToggleButton-root": { px: 1, py: 0.25, fontSize: 10 } }}
            >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="caps">Caps</ToggleButton>
                <ToggleButton value="natural">Natural</ToggleButton>
                <ToggleButton value="nonNatural">Non-Natural</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onShowAdvanced} size="small" sx={{ ml: 1 }}>
                <FilterAltIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}



export function MonomerLibraryHeader({
    searchValue, onSearchChange,
    quickFilter, onQuickFilterChange,
    range, onRangeChange,
}) {
    const theme = useTheme();
    const [popoverAnchor, setPopoverAnchor] = useState(null);

    return (
        <Box
            position="sticky"
            top={0}
            zIndex={2}
            bgcolor={theme.palette.mode === "dark" ? "grey.900" : "grey.100"}
            p={1}
            borderRadius={1}
            mb={1}
        >
            {/* Title and search bar in one row */}
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Typography fontWeight="bold" fontSize={17} color="text.primary" noWrap>
                    Monomer Library
                </Typography>
                <Box
                    className="border border-grey-300 rounded"
                    display="flex"
                    alignItems="center"
                    component="form"
                    sx={{ bgcolor: theme.palette.background.paper, borderRadius: 1, px: 1, py: 0.25, minWidth: 160, maxWidth: 210 }}
                    onSubmit={e => e.preventDefault()}
                >
                    <SearchIcon fontSize="small" sx={{ color: "grey.600", mr: 0.5 }} />
                    <InputBase
                        placeholder="Search…"
                        value={searchValue}
                        onChange={e => onSearchChange(e.target.value)}
                        sx={{ fontSize: 14, width: "100%" }}
                        inputProps={{ "aria-label": "search monomers" }}
                    />
                </Box>
            </Box>
            {/* Quick filters and advanced filter icon */}
            <QuickFilterBar
                value={quickFilter}
                onChange={onQuickFilterChange}
                onShowAdvanced={e => setPopoverAnchor(e.currentTarget)}
            />
            {/* Advanced filter popover */}
            <AdvancedFilterPopover
                anchorEl={popoverAnchor}
                open={!!popoverAnchor}
                onClose={() => setPopoverAnchor(null)}
                range={range || [50, 800]}
                onRangeChange={onRangeChange || (() => { })}
            />
            <Divider sx={{ my: 1 }} />
        </Box>
    );
}


