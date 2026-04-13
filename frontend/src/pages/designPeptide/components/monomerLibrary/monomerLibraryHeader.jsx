import React, { useMemo, useState, useRef, memo, useEffect } from "react";
import {
    Box, Typography, IconButton, InputBase, ToggleButtonGroup, ToggleButton,
    Popover, Slider, Divider, useTheme,
    MenuItem, Stack, Tooltip, Menu, ButtonBase, Collapse,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, Chip,
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import QuestionMarkSharpIcon from '@mui/icons-material/QuestionMarkSharp';
import { alpha } from '@mui/material/styles';

import { useSidebarCollapse } from '../../../../layouts/DesignPageLayout';

// Linking constants (unchanged)
export const LINKING_MODES = {
    append: 'append',      // C-ter
    prepend: 'prepend',    // N-ter
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

// The 20 standard amino acids (single-letter code → 3-letter + name)
const STANDARD_AMINO_ACIDS = [
    { code: 'A', pdb: 'Ala', name: 'Alanine' },
    { code: 'C', pdb: 'Cys', name: 'Cysteine' },
    { code: 'D', pdb: 'Asp', name: 'Aspartic acid' },
    { code: 'E', pdb: 'Glu', name: 'Glutamic acid' },
    { code: 'F', pdb: 'Phe', name: 'Phenylalanine' },
    { code: 'G', pdb: 'Gly', name: 'Glycine' },
    { code: 'H', pdb: 'His', name: 'Histidine' },
    { code: 'I', pdb: 'Ile', name: 'Isoleucine' },
    { code: 'K', pdb: 'Lys', name: 'Lysine' },
    { code: 'L', pdb: 'Leu', name: 'Leucine' },
    { code: 'M', pdb: 'Met', name: 'Methionine' },
    { code: 'N', pdb: 'Asn', name: 'Asparagine' },
    { code: 'P', pdb: 'Pro', name: 'Proline' },
    { code: 'Q', pdb: 'Gln', name: 'Glutamine' },
    { code: 'R', pdb: 'Arg', name: 'Arginine' },
    { code: 'S', pdb: 'Ser', name: 'Serine' },
    { code: 'T', pdb: 'Thr', name: 'Threonine' },
    { code: 'V', pdb: 'Val', name: 'Valine' },
    { code: 'W', pdb: 'Trp', name: 'Tryptophan' },
    { code: 'Y', pdb: 'Tyr', name: 'Tyrosine' },
    { code: 'X', pdb: 'Other', name: 'No natural analog (caps, linkers, exotic)' },
];

// Analog selector chip row
function AnalogSelector({ selectedAnalogs, onChangeAnalogs }) {
    const allCodes = STANDARD_AMINO_ACIDS.map(a => a.code);
    const allSelected = allCodes.every(c => selectedAnalogs.includes(c));
    const noneSelected = selectedAnalogs.length === 0;

    const toggle = (code) => {
        onChangeAnalogs(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    return (
        <Box sx={{ mt: 1, mb: 0.5 }}>
            <Stack direction="row" alignItems="center" gap={0.5} mb={0.75}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                    Filter by natural analog:
                </Typography>
                <Button
                    size="small"
                    onClick={() => onChangeAnalogs(allCodes)}
                    disabled={allSelected}
                    sx={{ fontSize: 10, minWidth: 0, px: 0.75, py: 0, textTransform: 'none' }}
                >
                    Select all
                </Button>
                <Button
                    size="small"
                    onClick={() => onChangeAnalogs([])}
                    disabled={noneSelected}
                    sx={{ fontSize: 10, minWidth: 0, px: 0.75, py: 0, textTransform: 'none' }}
                >
                    Clear all
                </Button>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {STANDARD_AMINO_ACIDS.map(({ code, pdb, name }) => {
                    const active = selectedAnalogs.includes(code);
                    return (
                        <Tooltip key={code} title={name} arrow placement="top">
                            <Chip
                                label={pdb}
                                size="small"
                                variant={active ? 'filled' : 'outlined'}
                                color={active ? 'primary' : 'default'}
                                onClick={() => toggle(code)}
                                sx={{
                                    fontSize: 11,
                                    height: 24,
                                    cursor: 'pointer',
                                    fontWeight: active ? 700 : 400,
                                }}
                            />
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
}

// Quick filters
function QuickFilterBar({ value, onChange }) {
    let selected = "all";
    if (value.caps) selected = "caps";
    else if (value.natural) selected = "natural";
    else if (value.nonNatural) selected = "nonNatural";

    const handleToggle = (_, v) => {
        if (!v || v === "all") onChange({ caps: false, natural: false, nonNatural: false });
        else onChange({ caps: v === "caps", natural: v === "natural", nonNatural: v === "nonNatural" });
    };

    return (
        <ToggleButtonGroup
            value={selected}
            exclusive
            onChange={handleToggle}
            size="small"
            sx={denseToggleSx}
        >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="caps">Capping</ToggleButton>
            <ToggleButton value="natural">Natural</ToggleButton>
            <ToggleButton value="nonNatural">Non‑Natural</ToggleButton>
        </ToggleButtonGroup>
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
    const { sidebarCollapsed } = useSidebarCollapse();
    const [anchorEl, setAnchorEl] = useState(null);
    // Do not fall back to the first option; show placeholder when value is unset/invalid
    const current = options.find(o => o.value === value);
    const open = Boolean(anchorEl);

    const handleOpen = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleSelect = (val) => { onChange?.(val); handleClose(); };

    useEffect(() => {
        if (sidebarCollapsed) setAnchorEl(null);
    }, [sidebarCollapsed]);

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
                                    <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}>
                                        <QuestionMarkSharpIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 15 }} />
                                    </Box>
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

        // Analog filter (lifted to container)
        selectedAnalogs, onSelectedAnalogsChange,

        // Controlled UI state (source of truth)
        uiState,
        setUiState,

        // Uncontrolled defaults + snapshot emitter
        defaultLinkingSnapshot,    // { mode, activeSequenceIdx, link }
        onLinkingSnapshotChange,
    } = props;

    const theme = useTheme();
    const [popoverAnchor, setPopoverAnchor] = useState(null);

    const [linkingOpen, setLinkingOpen] = useState(true);
    const [linkingHelpOpen, setLinkingHelpOpen] = useState(false);
    const [searchHelpOpen, setSearchHelpOpen] = useState(false);

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
                width: '100%',
                minWidth: 0,
                overflowX: 'hidden',
            }}
        >

            <Box>
                {/* Section title with help icon */}
                <Stack direction="row" alignItems="center" gap={0.25}>
                    <Typography
                        variant="overline"
                        sx={{ color: 'text.secondary', letterSpacing: 0.6, lineHeight: 1 }}
                    >
                        Search &amp; filters
                    </Typography>
                    <IconButton
                        onClick={() => setSearchHelpOpen(true)}
                        sx={{ color: 'text.disabled', p: 0.25, ml: 0.25, '&:hover': { color: 'text.secondary' } }}
                    >
                        <QuestionMarkSharpIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                </Stack>

                {/* SECTION 1 — Search + Filters */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: { xs: 1, sm: 1.5 },
                        mt: 0.5,
                    }}
                >
                    {/* Search bar (dense) */}
                    <Box
                        component="form"
                        onSubmit={e => e.preventDefault()}
                        display="flex"
                        alignItems="center"
                        sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            px: 1,
                            py: 0.25,
                            minHeight: 34,
                            bgcolor: 'transparent',
                            flex: '1 1 180px',
                            minWidth: 160,
                            maxWidth: '100%',
                        }}
                    >
                        <SearchIcon fontSize="small" sx={{ color: 'grey.600', mr: 0.75 }} />
                        <InputBase
                            placeholder="Search by name, symbol, PDB, SMILES…"
                            value={searchValue}
                            onChange={e => onSearchChange(e.target.value)}
                            sx={{ fontSize: 14, width: '100%' }}
                            inputProps={{ 'aria-label': 'search monomers' }}
                        />
                    </Box>

                    {/* Quick filter toggles */}
                    <Box
                        display="flex"
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                        sx={{
                            flex: { xs: '1 1 100%', sm: '0 0 auto' },
                        }}
                    >
                        <QuickFilterBar
                            value={quickFilter}
                            onChange={onQuickFilterChange}
                        />
                    </Box>
                </Box>

                {/* Analog selector — always visible */}
                <AnalogSelector
                    selectedAnalogs={selectedAnalogs}
                    onChangeAnalogs={onSelectedAnalogsChange}
                />
            </Box>




            <Divider sx={{ my: 1.25 }} />

            {/* Search help dialog */}
            <Dialog
                open={searchHelpOpen}
                onClose={() => setSearchHelpOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Monomer search</DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        typography: 'body2',
                        p: { xs: 2, sm: 3 },
                        lineHeight: 1.8,
                        '& strong': { fontWeight: 800 },
                        '& ul': {
                            margin: 0,
                            paddingLeft: 2.75,
                            listStylePosition: 'outside',
                            listStyleType: 'disc',
                        },
                        '& li': { marginBottom: 1 },
                        '& li::marker': { color: 'text.secondary', fontWeight: 700 },
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Paper
                            variant="outlined"
                            sx={(theme) => ({
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                borderColor: 'info.main',
                                backgroundColor: alpha(
                                    theme.palette.info.main,
                                    theme.palette.mode === 'dark' ? 0.14 : 0.08
                                ),
                            })}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                What is searched?
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                                The search field filters monomers across <strong>multiple attributes simultaneously</strong>.
                                Any text you type is matched against:
                            </Typography>
                            <ul>
                                <li><Typography component="span"><strong>Name</strong> — e.g. Alanine, D-Phenylalanine</Typography></li>
                                <li><Typography component="span"><strong>Symbol</strong> — the monomer symbol used in BILN notation (e.g. A, dF, Aib)</Typography></li>
                                <li><Typography component="span"><strong>PDB code</strong> — the 3-letter PDB residue name (e.g. ALA, PHE)</Typography></li>
                                <li><Typography component="span"><strong>Natural analog</strong> — single-letter code of the parent amino acid</Typography></li>
                                <li><Typography component="span"><strong>SMILES</strong> — the molecular structure string</Typography></li>
                            </ul>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                Examples
                            </Typography>
                            <ul>
                                <li><Typography component="span"><strong>phe</strong> — matches Phenylalanine, D-Phenylalanine, Chloro-Phenylalanine, and all variants</Typography></li>
                                <li><Typography component="span"><strong>ala</strong> — matches Alanine (ALA), beta-Alanine, D-Alanine, etc.</Typography></li>
                                <li><Typography component="span"><strong>cys</strong> — finds Cysteine and its analogs (useful for thiol-containing residues)</Typography></li>
                                <li><Typography component="span"><strong>aib</strong> — finds alpha-aminoisobutyric acid by its symbol</Typography></li>
                            </ul>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                Tips
                            </Typography>
                            <ul>
                                <li><Typography component="span">The search is <strong>case-insensitive</strong> — "PHE", "Phe", and "phe" all work.</Typography></li>
                                <li><Typography component="span">Use the <strong>Analogs</strong> quick filter to browse all natural and non-natural analogs of a specific amino acid.</Typography></li>
                                <li><Typography component="span">Combine quick filters with text search to narrow down results further.</Typography></li>
                            </ul>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSearchHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>

            {/* SECTION TITLE — Linking process mode with help (collapsible) */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ cursor: 'pointer' }}
                onClick={() => setLinkingOpen(prev => !prev)}
            >
                <Stack direction="row" alignItems="center" gap={0.25}>
                    <Typography
                        variant="overline"
                        sx={{ color: 'text.secondary', letterSpacing: 0.6, lineHeight: 1 }}
                    >
                        Linking process mode
                    </Typography>
                    <IconButton
                        onClick={(e) => { e.stopPropagation(); setLinkingHelpOpen(true); }}
                        size="small"
                        sx={{ color: 'text.disabled', p: 0.25, ml: 0.25, '&:hover': { color: 'text.secondary' } }}
                    >
                        <QuestionMarkSharpIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                </Stack>

                <IconButton
                    size="small"
                    edge="end"
                    onClick={(e) => {
                        e.stopPropagation();
                        setLinkingOpen(prev => !prev);
                    }}
                    sx={{
                        ml: 0.5,
                        transform: linkingOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 120ms ease-out',
                    }}
                >
                    <ExpandMoreIcon fontSize="small" />
                </IconButton>
            </Stack>

            {/* Linking-help dialog */}
            <Dialog
                open={linkingHelpOpen}
                onClose={() => setLinkingHelpOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Linking process mode</DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        typography: 'body2',
                        p: { xs: 2, sm: 3 },
                        lineHeight: 1.8,
                        '& strong': { fontWeight: 800 },
                        '& ul': {
                            margin: 0,
                            paddingLeft: 2.75,
                            listStylePosition: 'outside',
                            listStyleType: 'disc',
                        },
                        '& li': { marginBottom: 1 },
                        '& li::marker': { color: 'text.secondary', fontWeight: 700 },
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* ── Placement mode ── */}
                        <Paper
                            variant="outlined"
                            sx={(theme) => ({
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                borderColor: 'info.main',
                                backgroundColor: alpha(
                                    theme.palette.info.main,
                                    theme.palette.mode === 'dark' ? 0.14 : 0.08
                                ),
                            })}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                Placement mode
                            </Typography>
                            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                                Controls where the monomer is placed when you click the
                                <strong> + </strong> button next to a library monomer.
                            </Typography>
                            <ul>
                                <li>
                                    <Typography component="span">
                                        <strong>Append</strong> — adds the monomer at the
                                        C-terminus (end) of the selected chain.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Prepend</strong> — inserts the monomer at the
                                        N-terminus (beginning) of the selected chain.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>New chain</strong> — starts a brand-new chain
                                        with the selected monomer. This is the only available
                                        option when the editor is empty.
                                    </Typography>
                                </li>
                            </ul>
                        </Paper>

                        {/* ── Chain selector ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                Chain selector
                            </Typography>
                            <Typography>
                                When multiple chains exist, the <strong>Chain</strong> selector
                                lets you choose which chain receives the monomer.
                                The currently active chain is pre-selected, but you can
                                switch to any existing chain.
                            </Typography>
                        </Paper>

                        {/* ── Tips ── */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 1.75, sm: 2.25 },
                                borderRadius: 2,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    lineHeight: 1.25,
                                    mb: 1.25,
                                    pb: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                Tips
                            </Typography>
                            <ul>
                                <li>
                                    <Typography component="span">
                                        <strong>Drag-and-drop:</strong> You can drag a monomer
                                        from the library directly onto the 2D graph for
                                        precise placement.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Persistent mode:</strong> The linking mode
                                        persists across clicks — append several monomers in a
                                        row without re-selecting the mode each time.
                                    </Typography>
                                </li>
                                <li>
                                    <Typography component="span">
                                        <strong>Auto-switch:</strong> When the first chain
                                        appears, the mode switches from <em>New chain</em> to
                                        <em> Append</em> automatically.
                                    </Typography>
                                </li>
                            </ul>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkingHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>

            {/* SECTION 2 — One-line compact selectors (wrap if needed) */}
            <Collapse in={linkingOpen} timeout="auto" unmountOnExit={false}>
                <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    flex="1 1 auto"
                    flexWrap="wrap"
                    sx={{ mt: 0.1 }}
                >
                    <CompactSelect
                        label="Mode"
                        value={modeState}
                        onChange={setMode}
                        options={modeOptions}
                        minWidth={120}
                        optionDisabled={(opt) => noSeq && opt.value !== LINKING_MODES.newSeq}
                    />
                    <CompactSelect
                        label="Chain"
                        value={seqIdx ?? -1}
                        onChange={setSeq}
                        options={seqOptions}
                        minWidth={70}
                        disabled={noSeq}
                        placeholder="—"
                    />
                </Stack>
            </Collapse>
            {/* Advanced filter popover */}
            {/* <AdvancedFilterPopover anchorEl={popoverAnchor} open={!!popoverAnchor} onClose={() => setPopoverAnchor(null)} range={range || [50, 800]} onRangeChange={onRangeChange || (() => { })} /> */}
        </Box>
    );
}, areEqualHeader);

// Re-render header when search/filter change or uiState parts used by header change
function areEqualHeader(prev, next) {
    if (prev.searchValue !== next.searchValue) return false;
    if (prev.quickFilter?.caps !== next.quickFilter?.caps) return false;
    if (prev.quickFilter?.natural !== next.quickFilter?.natural) return false;
    if (prev.quickFilter?.nonNatural !== next.quickFilter?.nonNatural) return false;
    if (prev.selectedAnalogs !== next.selectedAnalogs) return false;

    // Re-render when the sequence count or active index changes
    if ((prev.uiState?.seqNumber ?? 0) !== (next.uiState?.seqNumber ?? 0)) return false;
    if ((prev.uiState?.activeSeqIdx ?? 0) !== (next.uiState?.activeSeqIdx ?? 0)) return false;

    return true;
}