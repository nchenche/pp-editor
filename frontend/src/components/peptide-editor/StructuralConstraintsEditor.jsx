import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Chip,
    Stack,
} from '@mui/material';
import QuestionMarkSharpIcon from '@mui/icons-material/QuestionMarkSharp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BackspaceIcon from '@mui/icons-material/Backspace';

/** The three allowed DSSP values, in cycling order. */
const DSSP_VALUES = ['H', 'E', '-'];
const DSSP_SET = new Set(DSSP_VALUES);

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

    const handleCellChange = useCallback((idx, val) => {
        setLetters(arr => {
            const next = arr.slice();
            next[idx] = val;
            return next;
        });
    }, []);

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px', lineHeight: 1 }}>
                        Structural constraints
                    </Typography>
                    <Tooltip title="About structural constraints" arrow>
                        <IconButton onClick={() => setHelpOpen(true)} sx={{ color: 'text.disabled', p: 0.25, ml: 0.25, '&:hover': { color: 'text.secondary' } }}>
                            <QuestionMarkSharpIcon sx={{ fontSize: 13 }} />
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
                <Chip size="small" label="E strand" variant="outlined" sx={{ height: 22 }} />
                <Chip size="small" label="- coil" variant="outlined" sx={{ height: 22 }} />
            </Stack>

            {/* Boxes row (OTP-style), horizontally scrollable */}
            <Box
                data-dssp-container
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
                        <DsspOtpCell
                            key={i}
                            index={i}
                            value={letters[i] && DSSP_SET.has(letters[i]) ? letters[i] : '-'}
                            commitAt={handleCellChange}
                            size={boxSize}
                        />
                    ))
                )}
            </Box>

            {/* Help dialog */}
            <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Structural constraints</DialogTitle>
                <DialogContent dividers sx={{ typography: 'body2' }}>
                    <p>
                        Define an optional secondary structure per residue using one-letter codes:
                        <strong> H</strong> (helix), <strong>E</strong> (strand), <strong>-</strong> (coil / no constraint).
                    </p>
                    <p>
                        The input works like an OTP field &mdash; type a value and focus advances
                        automatically. Use <strong>&uarr;/&darr;</strong> to cycle values,
                        <strong> &larr;/&rarr;</strong> to navigate.
                    </p>
                    <p>
                        You can also provide a PDB/mmCIF template to guide conformer generation.
                        Uploading a template will be used as a constraint source.
                    </p>
                    <p style={{ marginTop: 8, marginBottom: 4 }}>Examples</p>
                    <pre style={{ margin: 0, padding: '8px 10px', background: 'transparent', border: '1px solid var(--mui-palette-divider)', borderRadius: 6, overflowX: 'auto' }}>
                        Residues:  A  G  S  F  R
                        SS:        H  H  -  E  E
                    </pre>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHelpOpen(false)} size="small">Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

/* ── OTP-style cell for standalone editor ── */
function DsspOtpCell({ index, value, commitAt, size = 32 }) {
    const ref = useRef(null);

    const moveFocus = (nextIdx) => {
        const container = ref.current?.closest('[data-dssp-container]');
        const next = container?.querySelector(`input[data-idx="${nextIdx}"]`);
        if (next) next.focus();
    };

    const cycleValue = (direction) => {
        const cur = DSSP_VALUES.indexOf(value);
        const len = DSSP_VALUES.length;
        const next = (cur + direction + len) % len;
        commitAt(index, DSSP_VALUES[next]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); moveFocus(index - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(index + 1); return; }
        if (e.key === 'ArrowUp')    { e.preventDefault(); cycleValue(-1); return; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); cycleValue(+1); return; }
        if (e.key === 'Enter')      { e.preventDefault(); moveFocus(e.shiftKey ? index - 1 : index + 1); return; }
        if (e.key === 'Tab')        { return; }

        if (e.key === 'Backspace') {
            e.preventDefault();
            commitAt(index, '-');
            moveFocus(index - 1);
            return;
        }
        if (e.key === 'Delete') {
            e.preventDefault();
            commitAt(index, '-');
            return;
        }

        if (e.key && e.key.length === 1) {
            e.preventDefault();
            const ch = e.key.toUpperCase();
            if (DSSP_SET.has(ch)) {
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
            if (DSSP_SET.has(raw)) {
                commitAt(i, raw);
                i += 1;
            }
        }
        moveFocus(i);
    };

    const colors = {
        H:  { bg: 'rgba(22,163,74,0.14)', bd: 'rgba(22,163,74,0.35)', fg: '#064e3b' },
        E:  { bg: 'rgba(29,78,216,0.14)', bd: 'rgba(29,78,216,0.35)', fg: '#0b3a9a' },
        '-': { bg: 'rgba(148,163,184,0.10)', bd: 'rgba(148,163,184,0.28)', fg: '#475569' },
    };
    const tint = colors[value] || colors['-'];

    return (
        <input
            ref={ref}
            data-idx={index}
            value={value}
            readOnly
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            inputMode="none"
            aria-label={`Constraint at ${index + 1}: ${value}`}
            style={{
                display: 'block',
                width: size,
                height: size,
                lineHeight: `${size}px`,
                textAlign: 'center',
                borderRadius: 6,
                border: `1px solid ${tint.bd}`,
                outline: 'none',
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 600,
                padding: 0,
                boxSizing: 'border-box',
                background: tint.bg,
                color: tint.fg,
                caretColor: 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
            }}
            onFocus={(e) => {
                e.currentTarget.style.outline = '1.5px solid var(--mui-palette-primary-main, #1976d2)';
                e.currentTarget.style.outlineOffset = '1px';
                e.currentTarget.style.boxShadow = '0 0 0 2.5px rgba(25,118,210,0.18)';
                window.getSelection()?.removeAllRanges();
            }}
            onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = '';
                e.currentTarget.style.boxShadow = 'none';
            }}
            placeholder="-"
            maxLength={1}
        />
    );
}