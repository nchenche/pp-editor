import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Stack,
} from '@mui/material';
import QuestionMarkSharpIcon from '@mui/icons-material/QuestionMarkSharp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BackspaceIcon from '@mui/icons-material/Backspace';

const ALLOWED = ['H', 'E', 'C', 'T', 'B', 'I']; // helix, sheet, coil (+ optional letters)

export default function StructuralConstraintsEditor({
    biln,
    onChange,           // optional: (lettersArray) => void
    boxSize = 32,       // square size of each cell
}) {
    const [helpOpen, setHelpOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const fileInputRef = useRef(null);

    // Compute residue count from BILN
    const residueCount = useMemo(() => {
        if (!biln) return 0;
        return biln
            .split('.')
            .flatMap(seg => (seg ? seg.split('-') : []))
            .filter(Boolean).length;
    }, [biln]);

    // Local letters state (one per residue)
    const [letters, setLetters] = useState([]);

    // Resize letters array on biln change, preserving existing where possible
    useEffect(() => {
        setLetters(prev => {
            const next = prev.slice(0, residueCount);
            while (next.length < residueCount) next.push('');
            return next;
        });
    }, [residueCount]);

    useEffect(() => {
        onChange?.(letters);
    }, [letters, onChange]);

    const handleCellChange = (idx, raw) => {
        const c = (raw || '').toString().trim().slice(0, 1).toUpperCase();
        const v = ALLOWED.includes(c) ? c : '';
        setLetters(arr => {
            const next = arr.slice();
            next[idx] = v;
            return next;
        });
    };

    const clearAll = () => setLetters(Array.from({ length: residueCount }, () => ''));

    const openPicker = () => fileInputRef.current?.click();
    const onPickFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTemplateName(file.name);
        // Parsing/wiring deferred; this is only for design testing
        // Reset input so same file can be chosen again later
        e.target.value = '';
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {/* Header: subtitle + help + right-side icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                        Structural constraints
                    </Typography>
                    <Tooltip title="About structural constraints" arrow>
                        <IconButton size="small" onClick={() => setHelpOpen(true)} sx={{ color: 'text.secondary', fontSize: 15 }}>
                            <QuestionMarkSharpIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Upload PDB/CIF template" arrow>
                        <IconButton size="small" color="inherit" onClick={openPicker} sx={{ color: 'text.secondary', border: 1, borderColor: 'divider' }}>
                            <CloudUploadIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdb,.cif,.mmcif"
                        hidden
                        onChange={onPickFile}
                    />

                    <Tooltip title="Clear constraints" arrow>
                        <span>
                            <IconButton
                                size="small"
                                color="inherit"
                                onClick={clearAll}
                                disabled={residueCount === 0}
                                sx={{ color: 'text.secondary', border: 1, borderColor: 'divider' }}
                            >
                                <BackspaceIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Template badge (if any) */}
            {templateName ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip
                        size="small"
                        label={`Template: ${templateName}`}
                        variant="outlined"
                        onDelete={() => setTemplateName('')}
                        sx={{ color: 'text.secondary', borderColor: 'divider' }}
                    />
                </Box>
            ) : null}

            {/* Legend */}
            <Stack direction="row" spacing={1} sx={{ color: 'text.secondary', alignItems: 'center' }}>
                <Typography variant="caption">Enter one letter per residue:</Typography>
                <Chip size="small" label="H helix" variant="outlined" sx={{ height: 22 }} />
                <Chip size="small" label="E sheet" variant="outlined" sx={{ height: 22 }} />
                <Chip size="small" label="C coil" variant="outlined" sx={{ height: 22 }} />
            </Stack>

            {/* Boxes row (OTP-like), horizontally scrollable */}
            <Box
                sx={{
                    mt: 0.5,
                    display: 'flex',
                    gap: 0.5,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    py: 0.5,
                    px: 0.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                }}
            >
                {residueCount === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', px: 0.5 }}>
                        No residues. Add monomers to define constraints.
                    </Typography>
                ) : (
                    Array.from({ length: residueCount }, (_, i) => (
                        <TextField
                            key={i}
                            value={letters[i] ?? ''}
                            onChange={(e) => handleCellChange(i, e.target.value)}
                            size="small"
                            variant="outlined"
                            inputProps={{
                                maxLength: 1,
                                style: {
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    fontWeight: 600,
                                    padding: 0,
                                    width: boxSize - 10,  // inner input width hack to keep square
                                },
                            }}
                            sx={{
                                width: boxSize,
                                '& .MuiInputBase-root': {
                                    height: boxSize,
                                    width: boxSize,
                                    borderColor: 'divider',
                                },
                            }}
                        />
                    ))
                )}
            </Box>

            {/* Help dialog */}
            <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Structural constraints</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <p>
                        Define an optional secondary structure per residue using one-letter codes.
                        Common values: H (helix), E (sheet), C (coil). Leave empty for no constraint.
                    </p>
                    <p>
                        You can also provide a PDB/mmCIF template to guide conformer generation.
                        Uploading a template will be used as a constraint source.
                    </p>
                    <p style={{ marginTop: 8, marginBottom: 4 }}>Examples</p>
                    <pre style={{ margin: 0, padding: '8px 10px', background: 'transparent', border: '1px solid var(--mui-palette-divider)', borderRadius: 6, overflowX: 'auto' }}>
                        Residues:  A  G  S  F  R
                        SS:        H  H  C  E  E
                    </pre>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}