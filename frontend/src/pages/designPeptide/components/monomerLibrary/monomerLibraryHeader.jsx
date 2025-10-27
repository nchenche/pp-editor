import React, { useMemo, useState, useRef, memo, useEffect } from "react";
import {
    Box, Typography, IconButton, InputBase, ToggleButtonGroup, ToggleButton,
    Popover, Slider, Divider, useTheme,
    MenuItem, Stack, Tooltip, Menu, ButtonBase
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { alpha } from '@mui/material/styles';

// Linking constants (unchanged)
export const LINKING_MODES = {
    append: 'append',      // C-ter
    prepend: 'prepend',    // N-ter
    // insert: 'insert',      // pick residue
    newSeq: 'new-sequence' // new sequence
};
export const LINK_CHOICES = {
    peptide: 'peptide',     // automatic peptide bond (R1 or R2)
    r3_r1: 'r3->r1',
    r3_r2: 'r3->r2',
    r3_r3: 'r3->r3',
};

// Dense styling helpers
const denseToggleSx = { ".MuiToggleButton-root": { px: 1, py: 0.25, fontSize: 11 } };

// Advanced filters popover (kept)
function AdvancedFilterPopover({ anchorEl, open, onClose, range, onRangeChange }) {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            slotProps={{ paper: { sx: { p: 2, minWidth: 230, bgcolor: 'background.paper' } } }}
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
        </Popover>
    );
}

// Quick filters (kept)
function QuickFilterBar({ value, onChange, onShowAdvanced }) {
    let selected = "all";
    if (value.caps) selected = "caps";
    else if (value.natural) selected = "natural";
    else if (value.nonNatural) selected = "nonNatural";

    const handleToggle = (_, v) => {
        if (!v || v === "all") onChange({ caps: false, natural: false, nonNatural: false });
        else onChange({ caps: v === "caps", natural: v === "natural", nonNatural: v === "nonNatural" });
    };

    return (
        <Box display="flex" alignItems="center" gap={1}>
            <ToggleButtonGroup
                value={selected}
                exclusive
                onChange={handleToggle}
                size="small"
                sx={denseToggleSx}
            >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="caps">Caps</ToggleButton>
                <ToggleButton value="natural">Natural</ToggleButton>
                <ToggleButton value="nonNatural">Non‑Natural</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={onShowAdvanced} size="small">
                <FilterAltIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Compact chip-like select
function CompactSelect({
    label,
    value,
    onChange,
    options,
    icon,
    minWidth = 140,
    disabled = false,
    placeholder = '—',
    optionDisabled, // optional: (opt) => boolean
}) {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    // Do not fall back to the first option; show placeholder when value is unset/invalid
    const current = options.find(o => o.value === value);
    const open = Boolean(anchorEl);

    const handleOpen = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleSelect = (val) => { onChange?.(val); handleClose(); };

    const labelText = (!disabled && current) ? current.label : placeholder;

    return (
        <>
            <ButtonBase
                onClick={disabled ? undefined : handleOpen}
                disabled={disabled}
                sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 9999,
                    px: 1,
                    py: 0.25,
                    height: 28,
                    minWidth,
                    maxWidth: 260,
                    justifyContent: 'flex-start',
                    gap: 0.5,
                    fontSize: 12,
                    color: 'text.secondary',
                    bgcolor: 'transparent',
                    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.35) },
                    // allow shrinking to keep one row as long as possible
                    flex: '0 1 auto',
                }}
            >
                {icon ? <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>{icon}</Box> : null}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}:</Typography>
                <Typography variant="caption" sx={{ color: disabled ? 'text.disabled' : 'text.primary' }} noWrap>
                    {labelText}
                </Typography>
                {!disabled && <ExpandMoreIcon fontSize="small" sx={{ ml: 'auto', opacity: 0.7 }} />}
            </ButtonBase>

            {!disabled && (
                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{ dense: true }}
                    slotProps={{
                        sx: {
                            minWidth,
                            bgcolor: 'background.paper',
                            '& .MuiMenuItem-root': { fontSize: 12, minHeight: 28, py: 0.25 }
                        }
                    }}
                >
                    {options.map((opt, idx) => (
                        <MenuItem
                            key={idx}
                            selected={opt.value === value}
                            onClick={() => handleSelect(opt.value)}
                            disabled={optionDisabled ? optionDisabled(opt) : false}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                        >
                            {opt.icon ? <Box sx={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</Box> : null}
                            <Box sx={{ flex: 1 }}>
                                {opt.label}
                            </Box>
                            {opt.hint ? (
                                <Tooltip arrow title={opt.hint} placement="right-start">
                                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </Tooltip>
                            ) : null}
                        </MenuItem>
                    ))}
                </Menu>
            )}
        </>
    );
}

export const MonomerLibraryHeader = memo(function MonomerLibraryHeader(props) {
    const {
        // Search + filters
        searchValue, onSearchChange,
        quickFilter, onQuickFilterChange,
        range, onRangeChange,

        // Controlled UI state (source of truth)
        uiState,
        setUiState,

        // Uncontrolled defaults + snapshot emitter
        defaultLinkingSnapshot,    // { mode, activeSequenceIdx, link }
        onLinkingSnapshotChange,
    } = props;

    const theme = useTheme();
    const [popoverAnchor, setPopoverAnchor] = useState(null);

    // Keep mode/link as local state
    const [modeState, setModeState] = useState(defaultLinkingSnapshot?.mode ?? LINKING_MODES.append);
    const [linkState, setLinkState] = useState(defaultLinkingSnapshot?.link ?? LINK_CHOICES.peptide);

    // Controlled sequence index and options from uiState
    const seqCount = Math.max(0, Number(uiState?.seqNumber) || 0);
    const noSeq = seqCount === 0;
    const seqIdx = uiState?.activeSeqIdx ?? null;
    const seqOptions = useMemo(() => Array.from({ length: seqCount }, (_, i) => ({ value: i, label: String(i + 1) })), [seqCount]);

    // When sequence count changes, coerce mode accordingly
    const prevSeqCountRef = useRef(seqCount);
    useEffect(() => {
        const prev = prevSeqCountRef.current;

        // check if a new sequence was added (+1) or removed (-1)
        if (seqCount === prev + 1) {
            setModeState(LINKING_MODES.append);
            onLinkingSnapshotChange?.({ mode: LINKING_MODES.append });
        }

        // No sequence left => force "New seq"
        if (seqCount === 0 && modeState !== LINKING_MODES.newSeq) {
            const next = LINKING_MODES.newSeq;
            setModeState(next);
            onLinkingSnapshotChange?.({ mode: next });
        }

        // First sequence appears => default to "Append" if we were in "New seq"
        if (prev === 0 && seqCount > 0 && modeState === LINKING_MODES.newSeq) {
            const next = LINKING_MODES.append;
            setModeState(next);
            onLinkingSnapshotChange?.({ mode: next });
        }

        prevSeqCountRef.current = seqCount;
    }, [seqCount, modeState, onLinkingSnapshotChange]);

    // Setters that also emit snapshot
    const setMode = (v) => {
        const next = noSeq && v !== LINKING_MODES.newSeq ? LINKING_MODES.newSeq : v;
        setModeState(next);
        onLinkingSnapshotChange?.({ mode: next });
    };
    const setSeq = (v) => {
        setUiState?.((prev) => (prev.activeSeqIdx === v ? prev : { ...prev, activeSeqIdx: v }));
        onLinkingSnapshotChange?.({ activeSequenceIdx: v });  // keep ref in sync
    };
    const setLink = (v) => {
        setLinkState(v);
        onLinkingSnapshotChange?.({ link: v });  // keep ref in sync
    };

    // Compact option lists
    const modeOptions = useMemo(() => ([
        { value: LINKING_MODES.append, label: 'Append', hint: 'Add to C‑terminus if free; offer to replace C‑ter cap.' },
        { value: LINKING_MODES.prepend, label: 'Prepend', hint: 'Add to N‑terminus if free; replace N‑ter cap if needed.' },
        // { value: LINKING_MODES.insert, label: 'Insert', hint: 'Pick a residue, then choose side or R‑group.' },
        { value: LINKING_MODES.newSeq, label: 'New chain', hint: 'Start a new chain (unlinked).' },
    ]), []);

    const linkOptions = useMemo(() => ([
        { value: LINK_CHOICES.peptide, label: 'Peptide', hint: 'Automatic peptide bond using R1 or R2.', icon: <LinkOutlinedIcon fontSize="small" /> },
        { value: LINK_CHOICES.r3_r1, label: 'R3 → R1', hint: 'Link library R3 to target R1.' },
        { value: LINK_CHOICES.r3_r2, label: 'R3 → R2', hint: 'Link library R3 to target R2.' },
        { value: LINK_CHOICES.r3_r3, label: 'R3 → R3', hint: 'Link library R3 to target R3.' },
    ]), []);

    return (
        <Box
            position="sticky"
            top={0}
            zIndex={2}
            p={1}
            sx={{
                bgcolor: 'transparent',
                borderBottom: `1px solid ${theme.palette.divider}`,
                pb: 3,
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* SECTION TITLE — Search and filters */}
            {/* <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle4" sx={{ fontWeight: 600, color: 'text.primary', letterSpacing: '0.5px' }}>
                    MONOMER LIBRARY
                </Typography>
            </Box> */}

            <Box mt={2}>
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.6 }}>
                    Search and filters
                </Typography>

                {/* SECTION 1 — Search + Filters */}
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", mt: 0.5 }}>

                    {/* Search bar (dense) */}
                    <Box display="flex" alignItems="center" sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 1, py: 0.25, minHeight: 34, bgcolor: 'transparent' }} component="form" onSubmit={e => e.preventDefault()}>
                        <SearchIcon fontSize="small" sx={{ color: "grey.600", mr: 0.75 }} />
                        <InputBase placeholder="Search monomers…" value={searchValue} onChange={e => onSearchChange(e.target.value)} sx={{ fontSize: 14, width: "100%" }} inputProps={{ "aria-label": "search monomers" }} />
                    </Box>

                    {/* Quick filter toggles + advanced */}
                    <Box display="flex" justifyContent="flex-end">
                        <QuickFilterBar value={quickFilter} onChange={onQuickFilterChange} onShowAdvanced={e => setPopoverAnchor(e.currentTarget)} />
                    </Box>
                </Box>

            </Box>




            <Divider sx={{ my: 1.25 }} />

            {/* SECTION TITLE — Linking process mode with help */}
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.5 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.6 }}>
                    Linking process mode
                </Typography>
                <Tooltip arrow title={<Box><Typography variant="subtitle2" sx={{ mb: 0.5 }}>What happens when you click “+”</Typography><Typography variant="body2">Choose how the library monomer is placed (append, prepend, insert, or new sequence). “Link via” picks R‑groups (Peptide auto R1/R2, or R3→R1/R2/R3).</Typography></Box>}>
                    <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
            </Stack>

            {/* SECTION 2 — One-line compact selectors (wrap if needed) */}
            <Stack direction="row" alignItems="center" gap={1} flex="1 1 auto" flexWrap="wrap">
                <CompactSelect
                    label="Mode"
                    value={modeState}
                    onChange={setMode}
                    options={modeOptions}
                    minWidth={120}
                    optionDisabled={(opt) => noSeq && opt.value !== LINKING_MODES.newSeq}
                />
                <CompactSelect
                    label="Sequence"
                    value={seqIdx ?? -1}
                    onChange={setSeq}
                    options={seqOptions}
                    minWidth={70}
                    disabled={noSeq}
                    placeholder="—"
                />
                {/* <CompactSelect
                    label="Link via"
                    value={linkState}
                    onChange={setLink}
                    options={linkOptions}
                    minWidth={140}
                    icon={<LinkOutlinedIcon fontSize="small" />}
                /> */}
            </Stack>

            {/* Advanced filter popover */}
            <AdvancedFilterPopover anchorEl={popoverAnchor} open={!!popoverAnchor} onClose={() => setPopoverAnchor(null)} range={range || [50, 800]} onRangeChange={onRangeChange || (() => { })} />
        </Box>
    );
}, areEqualHeader);

// Re-render header when search/filter change or uiState parts used by header change
function areEqualHeader(prev, next) {
    if (prev.searchValue !== next.searchValue) return false;
    if (prev.quickFilter?.caps !== next.quickFilter?.caps) return false;
    if (prev.quickFilter?.natural !== next.quickFilter?.natural) return false;
    if (prev.quickFilter?.nonNatural !== next.quickFilter?.nonNatural) return false;

    // Re-render when the sequence count or active index changes
    if ((prev.uiState?.seqNumber ?? 0) !== (next.uiState?.seqNumber ?? 0)) return false;
    if ((prev.uiState?.activeSeqIdx ?? 0) !== (next.uiState?.activeSeqIdx ?? 0)) return false;

    return true;
}