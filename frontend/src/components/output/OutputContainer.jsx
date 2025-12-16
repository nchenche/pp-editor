import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Select,
    MenuItem,
    OutlinedInput,
    Chip,
    Tooltip,
    IconButton,
    Divider,
    ButtonGroup,
    Snackbar,
    Alert,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControlLabel,
    Switch,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha } from '@mui/material/styles';


const MenuProps = {
    MenuListProps: { dense: true },
    PaperProps: {
        elevation: 0,
        sx: {
            mt: 0.5,
            border: 1,
            borderColor: 'divider',
            '& .MuiMenuItem-root': {
                fontSize: 13,
                minHeight: 28,
                px: 1.25,
            },
            '& .Mui-selected': {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
            },
            '& .Mui-selected:hover': {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.16),
            },
        },
    },
};

const OUTPUT_FIELDS = Object.freeze([
    { key: 'biln', label: 'BILN', filename: 'pep-edit_biln.txt', mime: 'text/plain' },
    { key: 'helm', label: 'HELM', filename: 'pep-edit_helm.txt', mime: 'text/plain' },
    { key: 'smiles', label: 'SMILES', filename: 'pep-edit_smiles.txt', mime: 'text/plain' },
    { key: 'inchi', label: 'InChI', filename: 'pep-edit_inchi.txt', mime: 'text/plain' },
    { key: 'inchiKey', label: 'InChIKey', filename: 'pep-edit_inchikey.txt', mime: 'text/plain' },
    { key: 'structure3D', label: 'PDB', filename: 'pep-edit_structure.pdb', mime: 'chemical/x-pdb' },
    { key: 'xyz', label: 'XYZ', filename: 'pep-edit_structure.xyz', mime: 'chemical/x-xyz' },
    { key: 'sdf', label: 'SDF', filename: 'pep-edit_structure.sdf', mime: 'chemical/x-mdl-sdfile' },
    { key: 'mol2', label: 'MOL2', filename: 'pep-edit_structure.mol2', mime: 'chemical/x-mol2' },

]);

function normalizeOutputValue(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    if (value instanceof Error) return value.stack || value.message || String(value);
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export const OutputContainer = ({ outputData = {}, ...props }) => {
    // UI toggles (style/UX)
    const [wrapLines, setWrapLines] = useState(true);
    const [expandAll, setExpandAll] = useState(false);

    // Default visible: all with a value or all if none are present yet
    const defaultVisible = useMemo(() => {
        const withData = OUTPUT_FIELDS
            .filter(f => {
                const v = normalizeOutputValue(outputData?.[f.key]);
                return !!v;
            })
            .map(f => f.key);
        return withData.length ? withData : OUTPUT_FIELDS.map(f => f.key);
    }, [outputData]);

    const userChangedVisibleRef = useRef(false);
    const [visible, setVisible] = useState(() => defaultVisible);

    useEffect(() => {
        if (userChangedVisibleRef.current) return;
        setVisible(defaultVisible);
    }, [defaultVisible]);

    const visibleFields = useMemo(
        () => OUTPUT_FIELDS.filter(f => visible.includes(f.key)),
        [visible],
    );

    // --- NEW: controlled expansion state ---
    const [expandedKeys, setExpandedKeys] = useState(() => new Set());

    const toggleExpandedKey = useCallback((key) => (_e, isExpanded) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (isExpanded) next.add(key);
            else next.delete(key);
            return next;
        });
    }, []);

    // When "Expand" is ON, open all visible panels; when OFF, collapse all.
    useEffect(() => {
        if (expandAll) {
            setExpandedKeys(new Set(visibleFields.map(f => f.key)));
        } else {
            setExpandedKeys(new Set());
        }
    }, [expandAll, visibleFields]);

    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const handleCloseSnack = () => setSnack(s => ({ ...s, open: false }));

    const handleCopy = async (raw, label) => {
        try {
            const text = normalizeOutputValue(raw);
            if (!text) throw new Error('No content to copy.');
            await navigator.clipboard.writeText(text);
            setSnack({ open: true, msg: `${label} copied`, severity: 'success' });
        } catch (e) {
            setSnack({ open: true, msg: `Copy failed: ${e?.message || e}`, severity: 'error' });
        }
    };

    const downloadBlob = (content, filename, mime = 'text/plain') => {
        if (!content) return;
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

    const handleDownload = (key) => {
        const entry = OUTPUT_FIELDS.find(f => f.key === key);
        if (!entry) return;
        const content = normalizeOutputValue(outputData?.[key]);
        downloadBlob(content, entry.filename, entry.mime);
    };

    const handleDownloadAll = () => {
        // Combined text file for simplicity. If you prefer separate files in a zip, use JSZip.
        const combined = OUTPUT_FIELDS
            .filter(f => visible.includes(f.key))
            .map(f => {
                const val = normalizeOutputValue(outputData?.[f.key]);
                const dashed = '-'.repeat(f.label.length + 4);
                return `## ${f.label}\n${dashed}\n${val || '(No output)'}\n`;
            })
            .join('\n');
        downloadBlob(combined, 'outputs.txt', 'text/plain');
    };

    // Compact, non-messy render for multi-select (no stacked chips)
    const renderVisibleSummary = useCallback((selectedKeys) => {
        const keys = Array.isArray(selectedKeys) ? selectedKeys : [];
        if (keys.length === 0) return 'Select outputs';

        const labels = keys
            .map((k) => OUTPUT_FIELDS.find(f => f.key === k)?.label || k)
            .filter(Boolean);

        if (labels.length <= 2) return labels.join(', ');
        return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
    }, []);

    return (
        <Paper
            variant="outlined"
            sx={{ p: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
            {...props}
        >
            {/* Header (sticky + responsive) */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    bgcolor: 'background.paper',
                    pb: 1,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: { xs: 'stretch', md: 'center' },
                        justifyContent: 'flex-start',          // was space-between (caused huge gap on wide panels)
                        flexDirection: { xs: 'column', md: 'row' }, // switch to row a bit later (md) to avoid overlap
                        gap: 1,
                        mb: 1,
                        minWidth: 0,
                    }}
                >
                    {/* Title block: allowed to shrink and wrap */}
                    <Box sx={{ minWidth: 0, flex: '0 1 auto' }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                color: 'text.secondary',
                                lineHeight: 1.2,
                                pr: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: { xs: 'normal' },
                            }}
                        >
                            Output formats
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Showing {visibleFields.length}/{OUTPUT_FIELDS.length}
                        </Typography>
                    </Box>

                    {/* Controls: stay together, wrap as a block */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: { xs: 'flex-start', md: 'flex-end' },
                            flexWrap: 'wrap',
                            gap: 1,
                            minWidth: 0,
                            flex: '1 1 auto',
                        }}
                    >
                        <Select
                            multiple
                            value={visible}
                            onChange={(e) => {
                                userChangedVisibleRef.current = true;
                                setVisible(e.target.value);
                            }}
                            input={<OutlinedInput size="small" />}
                            renderValue={renderVisibleSummary}
                            size="small"
                            sx={{
                                // shrink on small widths; don't dominate the header on medium widths
                                flex: '1 1 150px',
                                minWidth: { xs: '100%', sm: 150, md: 150 },
                                maxWidth: { xs: '100%', md: 200 },
                                '& .MuiSelect-select': {
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                },
                            }}
                            MenuProps={MenuProps}
                        >
                            {OUTPUT_FIELDS.map((f) => {
                                const isSelected = visible.includes(f.key);
                                return (
                                    <MenuItem key={f.key} value={f.key} selected={isSelected} sx={{ gap: 1 }}>
                                        <ListItemIcon sx={{ minWidth: 22, color: 'primary.main', opacity: isSelected ? 1 : 0 }}>
                                            <CheckIcon fontSize="small" />
                                        </ListItemIcon>
                                        {f.label}
                                    </MenuItem>
                                );
                            })}
                        </Select>

                        {/* Keep switches + download together */}
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                flexWrap: 'nowrap',
                                gap: 1,
                                flex: '0 0 auto',
                            }}
                        >
                            <FormControlLabel
                                sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={wrapLines}
                                        onChange={(_, v) => setWrapLines(v)}
                                    />
                                }
                                label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>Wrap</Typography>}
                            />

                            <FormControlLabel
                                sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={expandAll}
                                        onChange={(_, v) => setExpandAll(v)}
                                    />
                                }
                                label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>Expand</Typography>}
                            />

                            <ButtonGroup
                                size="small"
                                variant="outlined"
                                sx={{ '& .MuiButton-root': { minWidth: 34, px: 0.5 } }}
                            >
                                <Tooltip title="Download all" arrow placement="top">
                                    <IconButton color="inherit" onClick={handleDownloadAll} sx={{ border: 1, borderColor: 'divider' }}>
                                        <DownloadForOfflineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </ButtonGroup>
                        </Box>
                    </Box>
                </Box>

                <Divider />
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pt: 1 }}>
                {visibleFields.length === 0 ? (
                    <Box sx={{ p: 2, color: 'text.secondary' }}>No outputs selected.</Box>
                ) : (
                    visibleFields.map((f) => {
                        const value = normalizeOutputValue(outputData?.[f.key]);
                        const hasValue = !!value;

                        return (
                            <Accordion
                                key={f.key}
                                disableGutters
                                elevation={0}
                                expanded={expandAll || expandedKeys.has(f.key)}
                                onChange={expandAll ? undefined : toggleExpandedKey(f.key)}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    mb: 1,
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {f.label}
                                            </Typography>
                                            {!hasValue && (
                                                <Chip
                                                    label="Empty"
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ color: 'text.secondary', borderColor: 'divider' }}
                                                />
                                            )}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Tooltip title="Copy" arrow placement="top">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="inherit"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopy(value, f.label);
                                                        }}
                                                        disabled={!hasValue}
                                                        sx={{ border: 1, borderColor: 'divider' }}
                                                    >
                                                        <ContentCopyIcon fontSize="inherit" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Download" arrow placement="top">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="inherit"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(f.key);
                                                        }}
                                                        disabled={!hasValue}
                                                        sx={{ border: 1, borderColor: 'divider' }}
                                                    >
                                                        <DownloadIcon fontSize="inherit" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </AccordionSummary>

                                <AccordionDetails sx={{ pt: 0 }}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1,
                                            bgcolor: (t) => alpha(t.palette.action.hover, 0.25),
                                            overflow: 'auto',
                                        }}
                                    >
                                        <Typography
                                            component="pre"
                                            sx={{
                                                m: 0,
                                                maxWidth: '100%',
                                                whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
                                                // Key fix for “wrap” with long tokens (HELM/SMILES/etc.)
                                                overflowWrap: wrapLines ? 'anywhere' : 'normal',
                                                wordBreak: wrapLines ? 'break-word' : 'normal',
                                                fontFamily:
                                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                fontSize: 13,
                                                lineHeight: 1.45,
                                                color: hasValue ? 'text.primary' : 'text.disabled',
                                            }}
                                        >
                                            {hasValue ? value : 'No output available.'}
                                        </Typography>
                                    </Paper>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })
                )}
            </Box>

            {/* Copy/download feedback */}
            <Snackbar
                open={snack.open}
                autoHideDuration={2000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnack} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Paper>
    );
};