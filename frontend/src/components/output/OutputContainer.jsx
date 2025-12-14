import React, { useMemo, useState } from 'react';
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
    ListItemIcon
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import CheckIcon from '@mui/icons-material/Check';
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


export const OutputContainer = ({ outputData = {}, ...props }) => {
    const OUTPUT_FIELDS = useMemo(
        () => ([
            { key: 'biln', label: 'BILN', filename: 'pep-edit_biln.txt', mime: 'text/plain' },
            { key: 'helm', label: 'HELM', filename: 'pep-edit_helm.txt', mime: 'text/plain' },
            { key: 'smiles', label: 'SMILES', filename: 'pep-edit_smiles.txt', mime: 'text/plain' },
            // If structure3D is PDB text, keep .pdb; adjust if it’s something else.
            { key: 'structure3D', label: '3D Structure', filename: 'pep-edit_structure.pdb', mime: 'chemical/x-pdb' },
        ]),
        []
    );

    // Default visible: all with a value or all if none are present yet
    const defaultVisible = useMemo(() => {
        const withData = OUTPUT_FIELDS.filter(f => !!outputData?.[f.key]).map(f => f.key);
        return withData.length ? withData : OUTPUT_FIELDS.map(f => f.key);
    }, [OUTPUT_FIELDS, outputData]);


    const [visible, setVisible] = useState(defaultVisible);  // defaultVisible, ['smiles', 'biln']
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

    const handleCloseSnack = () => setSnack(s => ({ ...s, open: false }));

    const handleCopy = async (text, label) => {
        try {
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
        const content = outputData?.[key] || '';
        downloadBlob(content, entry.filename, entry.mime);
    };

    const handleDownloadAll = () => {
        // Combined text file for simplicity. If you prefer separate files in a zip, use JSZip.
        const combined = OUTPUT_FIELDS
            .filter(f => visible.includes(f.key))
            .map(f => {
                const val = outputData?.[f.key] || '';
                const dashed = '-'.repeat(f.label.length + 4);
                return `## ${f.label}\n${dashed}\n${val || '(No output)'}\n`;
            })
            .join('\n');
        downloadBlob(combined, 'outputs.txt', 'text/plain');
    };

    const visibleFields = OUTPUT_FIELDS.filter(f => visible.includes(f.key));

    return (
        <Paper
            variant="outlined"
            sx={{ p: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
            {...props}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Output formats
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {/* Visible outputs selector (multi) */}
                    <Select
                        multiple
                        value={visible}
                        onChange={(e) => setVisible(e.target.value)}
                        input={<OutlinedInput size="small" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 320, overflow: 'hidden' }}>
                                {selected.map((key) => {
                                    const f = OUTPUT_FIELDS.find(o => o.key === key);
                                    return (
                                        <Chip
                                            key={key}
                                            label={f?.label || key}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                    );
                                })}
                            </Box>
                        )}
                        size="small"
                        sx={{ minWidth: 220 }}
                        MenuProps={MenuProps}
                    >
                        {OUTPUT_FIELDS.map((f) => {
                            const isSelected = visible.includes(f.key);
                            return (

                                <MenuItem
                                    key={f.key}
                                    value={f.key}
                                    selected={isSelected}
                                    sx={{ gap: 1 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 22, color: 'primary.main', opacity: isSelected ? 1 : 0 }}>
                                        <CheckIcon fontSize="small" />
                                    </ListItemIcon>
                                    {f.label}
                                </MenuItem>
                            );
                        })}
                    </Select>

                    {/* Download all */}
                    <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { minWidth: 34, px: 0.5 } }}>
                        <Tooltip title="Download all" arrow placement="top">
                            <IconButton color="inherit" onClick={handleDownloadAll} sx={{ border: 1, borderColor: 'divider' }}>
                                <DownloadForOfflineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>
                </Box>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* Body */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {visibleFields.length === 0 ? (
                    <Box sx={{ p: 2, color: 'text.secondary' }}>No outputs selected.</Box>
                ) : (
                    visibleFields.map((f, idx) => {
                        const value = outputData?.[f.key];
                        const hasValue = !!value;

                        return (
                            <Box key={f.key} component="section" sx={{ mt: 3, mb: idx < visibleFields.length - 1 ? 3 : 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="subtitle2">{f.label}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Tooltip title="Copy" arrow placement="top">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="inherit"
                                                    onClick={() => handleCopy(value, f.label)}
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
                                                    onClick={() => handleDownload(f.key)}
                                                    disabled={!hasValue}
                                                    sx={{ border: 1, borderColor: 'divider' }}
                                                >
                                                    <DownloadIcon fontSize="inherit" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                <Paper
                                    variant="outlined"
                                    sx={{ p: 1, bgcolor: 'background.paper', overflow: 'auto' }}
                                >
                                    <Typography
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            fontSize: 13,
                                            color: hasValue ? 'text.primary' : 'text.disabled',
                                        }}
                                    >
                                        {hasValue ? value : 'No output available.'}
                                    </Typography>
                                </Paper>
                            </Box>
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