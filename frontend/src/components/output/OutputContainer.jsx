import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tooltip,
    IconButton,
    Divider,
    Snackbar,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControlLabel,
    Switch,
    Chip,
    Button,
    CircularProgress,
    Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageIcon from '@mui/icons-material/Image';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { alpha } from '@mui/material/styles';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { APP_VERSION } from '../../config';
import { svgToPngBlob, dataUriToBlob } from '../../utils/svgToPng';

// ─── Output field definitions grouped by category ─────────────────────────────

const OUTPUT_CATEGORIES = Object.freeze([
    {
        id: '1d',
        label: '1D — Sequences & Notations',
        fields: [
            { key: 'biln', label: 'BILN', filename: 'pep-edit_biln.txt', mime: 'text/plain' },
            { key: 'helm', label: 'HELM', filename: 'pep-edit_helm.txt', mime: 'text/plain' },
            { key: 'smiles', label: 'SMILES', filename: 'pep-edit_smiles.txt', mime: 'text/plain' },
            { key: 'inchi', label: 'InChI', filename: 'pep-edit_inchi.txt', mime: 'text/plain' },
            { key: 'inchiKey', label: 'InChIKey', filename: 'pep-edit_inchikey.txt', mime: 'text/plain' },
        ],
    },
    {
        id: '2d',
        label: '2D — Depiction & Coordinates',
        fields: [
            { key: 'sdf2d', label: 'SDF 2D', filename: 'pep-edit_2d.sdf', mime: 'chemical/x-mdl-sdfile' },
        ],
        hasImages: true,
    },
    {
        id: '3d',
        label: '3D — Structures',
        fields: [
            { key: 'structure3D', label: 'PDB', filename: 'pep-edit_structure.pdb', mime: 'chemical/x-pdb' },
            { key: 'mmcif', label: 'MMCIF', filename: 'pep-edit_structure.cif', mime: 'chemical/x-mmcif' },
            { key: 'xyz', label: 'XYZ', filename: 'pep-edit_structure.xyz', mime: 'chemical/x-xyz' },
            { key: 'sdf3d', label: 'SDF 3D', filename: 'pep-edit_structure_3d.sdf', mime: 'chemical/x-mdl-sdfile' },
            { key: 'mol2_tripos', label: 'MOL2 Tripos', filename: 'pep-edit_structure.mol2', mime: 'chemical/x-mol2' },
            { key: 'pdbqt', label: 'PDBQT', filename: 'pep-edit_structure.pdbqt', mime: 'chemical/x-pdbqt' },
        ],
        hasImages: true,
    },
]);

// Flat list for quick lookups
const ALL_FIELDS = OUTPUT_CATEGORIES.flatMap(c => c.fields);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}

function downloadBlob(content, filename, mime = 'text/plain') {
    if (!content) return;
    const blob = new Blob([content], { type: mime });
    triggerBlobDownload(blob, filename);
}

// ─── Image download button ────────────────────────────────────────────────────

function ImageDownloadButton({ label, icon, tooltip, onClick, disabled }) {
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await onClick();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Tooltip title={tooltip} arrow placement="top">
            <span>
                <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    disabled={disabled || busy}
                    onClick={handleClick}
                    startIcon={busy ? <CircularProgress size={12} color="inherit" /> : icon}
                    sx={{
                        textTransform: 'none',
                        fontSize: 11,
                        color: 'text.secondary',
                        px: 1,
                        py: 0.25,
                        minWidth: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    {label}
                </Button>
            </span>
        </Tooltip>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const OutputContainer = ({ outputData = {}, editorRef, ...props }) => {
    const [wrapLines, setWrapLines] = useState(true);

    // Category-level collapse state
    const [collapsedCategories, setCollapsedCategories] = useState(() => new Set());
    const toggleCategory = useCallback((catId) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    }, []);

    // Item-level expansion state
    const [expandedKeys, setExpandedKeys] = useState(() => new Set());
    const [expandAll, setExpandAll] = useState(false);

    const toggleExpandedKey = useCallback((key) => (_e, isExpanded) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (isExpanded) next.add(key);
            else next.delete(key);
            return next;
        });
    }, []);

    // Expand all applies to every field
    useEffect(() => {
        if (expandAll) {
            setExpandedKeys(new Set(ALL_FIELDS.map(f => f.key)));
        } else {
            setExpandedKeys(new Set());
        }
    }, [expandAll]);

    // Snackbar
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const handleCloseSnack = () => setSnack(s => ({ ...s, open: false }));

    // ─── Copy / download handlers ─────────────────────────────────────────────

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

    const handleDownload = (key) => {
        const entry = ALL_FIELDS.find(f => f.key === key);
        if (!entry) return;
        const content = normalizeOutputValue(outputData?.[key]);
        downloadBlob(content, entry.filename, entry.mime);
    };

    // ─── Image handlers ───────────────────────────────────────────────────────

    const handleDownload2dSvg = useCallback(async () => {
        const svgStr = editorRef?.current?.getSvgString?.();
        if (!svgStr) {
            setSnack({ open: true, msg: 'No 2D depiction available', severity: 'warning' });
            return;
        }
        downloadBlob(svgStr, 'pep-edit_2d.svg', 'image/svg+xml');
    }, [editorRef]);

    const handleDownload2dPng = useCallback(async () => {
        const svgStr = editorRef?.current?.getSvgString?.();
        if (!svgStr) {
            setSnack({ open: true, msg: 'No 2D depiction available', severity: 'warning' });
            return;
        }
        try {
            const pngBlob = await svgToPngBlob(svgStr);
            triggerBlobDownload(pngBlob, 'pep-edit_2d.png');
        } catch (e) {
            setSnack({ open: true, msg: `PNG conversion failed: ${e?.message || e}`, severity: 'error' });
        }
    }, [editorRef]);

    const handleDownload3dPng = useCallback(async () => {
        const dataUri = await editorRef?.current?.get3DScreenshotDataUri?.();
        if (!dataUri) {
            setSnack({ open: true, msg: 'No 3D structure available', severity: 'warning' });
            return;
        }
        const blob = dataUriToBlob(dataUri);
        triggerBlobDownload(blob, 'pep-edit_3d.png');
    }, [editorRef]);

    // ─── Collect image blob for a given type (used by zip) ────────────────────

    const get2dSvgBlob = useCallback(() => {
        const svgStr = editorRef?.current?.getSvgString?.();
        return svgStr ? new Blob([svgStr], { type: 'image/svg+xml' }) : null;
    }, [editorRef]);

    const get2dPngBlob = useCallback(async () => {
        const svgStr = editorRef?.current?.getSvgString?.();
        if (!svgStr) return null;
        try { return await svgToPngBlob(svgStr); } catch { return null; }
    }, [editorRef]);

    const get3dPngBlob = useCallback(async () => {
        const dataUri = await editorRef?.current?.get3DScreenshotDataUri?.();
        if (!dataUri) return null;
        return dataUriToBlob(dataUri);
    }, [editorRef]);

    // ─── Download All (zip) ───────────────────────────────────────────────────

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        const folder = zip.folder('pep-edit_outputs');

        // Add text/data outputs
        for (const cat of OUTPUT_CATEGORIES) {
            for (const f of cat.fields) {
                const val = normalizeOutputValue(outputData?.[f.key]);
                if (val) folder.file(f.filename, val);
            }
        }

        // Add images
        const svgBlob = get2dSvgBlob();
        if (svgBlob) folder.file('pep-edit_2d.svg', svgBlob);

        const [pngBlob2d, pngBlob3d] = await Promise.all([
            get2dPngBlob(),
            get3dPngBlob(),
        ]);
        if (pngBlob2d) folder.file('pep-edit_2d.png', pngBlob2d);
        if (pngBlob3d) folder.file('pep-edit_3d.png', pngBlob3d);

        // Metadata
        const now = new Date();
        const dateStr = now.toISOString();
        const allContents = [
            ...ALL_FIELDS.map(f => {
                const val = normalizeOutputValue(outputData?.[f.key]);
                return '  \u2022 ' + f.label.padEnd(14) + ' \u2192 ' + f.filename + (val ? '' : '  (empty, skipped)');
            }),
            '',
            '  Images:',
            '  \u2022 ' + '2D SVG'.padEnd(14) + ' \u2192 pep-edit_2d.svg' + (svgBlob ? '' : '  (empty, skipped)'),
            '  \u2022 ' + '2D PNG'.padEnd(14) + ' \u2192 pep-edit_2d.png' + (pngBlob2d ? '' : '  (empty, skipped)'),
            '  \u2022 ' + '3D PNG'.padEnd(14) + ' \u2192 pep-edit_3d.png' + (pngBlob3d ? '' : '  (empty, skipped)'),
        ];

        const metadata = [
            '===============================================',
            '  PEP-EDIT \u2014 Output Archive',
            '===============================================',
            '',
            'Version  : ' + APP_VERSION,
            'Exported : ' + dateStr,
            '',
            '-----------------------------------------------',
            '  How to Cite',
            '-----------------------------------------------',
            '',
            'If you use PEP-EDIT in your research, please cite:',
            '',
            '  PEP-EDIT: An Interactive Editor for Peptide Design',
            '  (manuscript in preparation)',
            '',
            'A DOI and full reference will be provided upon publication.',
            '',
            '-----------------------------------------------',
            '  Contents',
            '-----------------------------------------------',
            '',
            ...allContents,
            '',
            '===============================================',
        ].join('\n');

        folder.file('README.txt', metadata);

        try {
            const blob = await zip.generateAsync({ type: 'blob' });
            const stamp = now.toISOString().slice(0, 10);
            saveAs(blob, 'pep-edit_outputs_' + stamp + '.zip');
        } catch (err) {
            setSnack({ open: true, msg: 'Zip failed: ' + (err?.message || err), severity: 'error' });
        }
    };

    // ─── Count available outputs ──────────────────────────────────────────────

    const availableCount = useMemo(() => {
        let count = 0;
        for (const f of ALL_FIELDS) {
            if (normalizeOutputValue(outputData?.[f.key])) count++;
        }
        return count;
    }, [outputData]);

    // ─── Render helpers ───────────────────────────────────────────────────────

    const renderField = (f) => {
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
                    mb: 0.75,
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 32, px: 1.25, '& .MuiAccordionSummary-content': { my: 0.25 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {f.label}
                            </Typography>
                            {!hasValue && (
                                <Chip label="Empty" size="small" variant="outlined" sx={{ height: 20, fontSize: 11, color: 'text.disabled', borderColor: 'divider' }} />
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title="Copy" arrow placement="top">
                                <span>
                                    <IconButton
                                        size="small"
                                        color="inherit"
                                        onClick={(e) => { e.stopPropagation(); handleCopy(value, f.label); }}
                                        disabled={!hasValue}
                                        sx={{ border: 1, borderColor: 'divider' }}
                                    >
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Download" arrow placement="top">
                                <span>
                                    <IconButton
                                        size="small"
                                        color="inherit"
                                        onClick={(e) => { e.stopPropagation(); handleDownload(f.key); }}
                                        disabled={!hasValue}
                                        sx={{ border: 1, borderColor: 'divider' }}
                                    >
                                        <DownloadIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                    <Paper
                        variant="outlined"
                        sx={{ p: 1, bgcolor: (t) => alpha(t.palette.action.hover, 0.25), overflow: 'auto' }}
                    >
                        <Typography
                            component="pre"
                            sx={{
                                m: 0,
                                maxWidth: '100%',
                                whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
                                overflowWrap: wrapLines ? 'anywhere' : 'normal',
                                wordBreak: wrapLines ? 'break-word' : 'normal',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                fontSize: 12,
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
    };

    /** Renders image download buttons inline — deliberately understated to avoid visual competition with data fields. */
    const renderImageSection = (catId) => {
        const has2dSvg = !!editorRef?.current?.getSvgString;
        const has3d = !!editorRef?.current?.get3DScreenshotDataUri;

        if (catId === '2d') {
            return (
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ mt: 0.25, mb: 0.5, pl: 0.5 }}
                >
                    <ImageIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11, mr: 0.5 }}>
                        Export depiction
                    </Typography>
                    <ImageDownloadButton
                        label="SVG"
                        tooltip="Download 2D depiction as SVG"
                        icon={<DownloadIcon sx={{ fontSize: 13 }} />}
                        disabled={!has2dSvg}
                        onClick={handleDownload2dSvg}
                    />
                    <ImageDownloadButton
                        label="PNG"
                        tooltip="Download 2D depiction as PNG (server-rendered)"
                        icon={<DownloadIcon sx={{ fontSize: 13 }} />}
                        disabled={!has2dSvg}
                        onClick={handleDownload2dPng}
                    />
                </Stack>
            );
        }

        if (catId === '3d') {
            return (
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ mt: 0.25, mb: 0.5, pl: 0.5 }}
                >
                    <ViewInArIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11, mr: 0.5 }}>
                        Export snapshot
                    </Typography>
                    <ImageDownloadButton
                        label="PNG"
                        tooltip="Download current 3D viewport as PNG"
                        icon={<DownloadIcon sx={{ fontSize: 13 }} />}
                        disabled={!has3d}
                        onClick={handleDownload3dPng}
                    />
                </Stack>
            );
        }

        return null;
    };

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <Paper
            sx={{ p: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
            {...props}
        >
            {/* Header */}
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
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 1,
                    }}
                >
                    <Box sx={{ minWidth: 0, flex: '0 1 auto' }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                            Output formats
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            {availableCount}/{ALL_FIELDS.length} available
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '0 0 auto' }}>
                        <FormControlLabel
                            sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
                            control={<Switch size="small" checked={wrapLines} onChange={(_, v) => setWrapLines(v)} />}
                            label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>Wrap</Typography>}
                        />
                        <FormControlLabel
                            sx={{ ml: 0, mr: 0, '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
                            control={<Switch size="small" checked={expandAll} onChange={(_, v) => setExpandAll(v)} />}
                            label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>Expand</Typography>}
                        />
                        <Tooltip title="Download all as ZIP" arrow placement="top">
                            <IconButton color="inherit" onClick={handleDownloadAll} sx={{ border: 1, borderColor: 'divider' }}>
                                <DownloadForOfflineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                <Divider />
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pt: 1 }}>
                {OUTPUT_CATEGORIES.map((cat, catIdx) => {
                    const isCollapsed = collapsedCategories.has(cat.id);
                    const catFieldCount = cat.fields.filter(f => !!normalizeOutputValue(outputData?.[f.key])).length;
                    const isLast = catIdx === OUTPUT_CATEGORIES.length - 1;

                    return (
                        <Box key={cat.id}>
                            {/* Category header */}
                            <Box
                                onClick={() => toggleCategory(cat.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    py: 0.5,
                                    px: 0.25,
                                    borderRadius: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <ExpandMoreIcon
                                    sx={{
                                        fontSize: 16,
                                        color: 'text.disabled',
                                        transition: 'transform 0.2s',
                                        transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                                    }}
                                />
                                <Typography
                                    variant="overline"
                                    sx={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        letterSpacing: 1,
                                        color: 'text.secondary',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {cat.label}
                                </Typography>
                                <Chip
                                    label={catFieldCount + '/' + cat.fields.length}
                                    size="small"
                                    sx={{
                                        height: 16,
                                        fontSize: 9.5,
                                        fontWeight: 600,
                                        bgcolor: catFieldCount > 0 ? 'action.selected' : 'transparent',
                                        color: 'text.disabled',
                                        '& .MuiChip-label': { px: 0.75 },
                                    }}
                                />
                            </Box>

                            {/* Category content */}
                            {!isCollapsed && (
                                <Box sx={{ pl: 1.5, pt: 0.75, pb: 0.5 }}>
                                    {cat.fields.map(renderField)}
                                    {cat.hasImages && renderImageSection(cat.id)}
                                </Box>
                            )}

                            {/* Inter-section divider */}
                            {!isLast && (
                                <Divider sx={{ my: 1.25, borderColor: (t) => alpha(t.palette.divider, 0.5) }} />
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Snackbar */}
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
