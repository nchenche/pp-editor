import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import panzoom from 'panzoom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Typography,
    Chip,
    Table,
    TableBody,
    TableRow,
    TableCell,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getMonomerTag, TAG_PALETTE } from '../../../../utils/monomerTagStyles';

const DASH = '—';

/** Derive a compact R-group summary array: [{ label: 'R1', leaving: 'H' }, ...] */
function getRGroupEntries(monomer) {
    const rGroups = Array.isArray(monomer?.m_Rgroups) ? monomer.m_Rgroups : [];
    const rGroupIdx = Array.isArray(monomer?.m_RgroupIdx) ? monomer.m_RgroupIdx : [];
    const maxLen = Math.max(rGroups.length, rGroupIdx.length, 0);

    const entries = [];
    for (let i = 0; i < maxLen; i++) {
        const hasGroup = rGroups[i] != null;
        const hasIdx = rGroupIdx[i] != null;
        if (!hasGroup && !hasIdx) continue;

        const leaving = hasGroup ? String(rGroups[i]).trim() : DASH;
        entries.push({ label: `R${i + 1}`, leaving: leaving || DASH });
    }
    return entries;
}

function safe(value) {
    if (value == null) return DASH;
    const s = String(value).trim();
    return s.length === 0 || s.toLowerCase() === 'none' || s.toLowerCase() === 'null' ? DASH : s;
}

function MetaRow({ label, value, mono = false }) {
    return (
        <TableRow sx={{ '&:last-child td': { borderBottom: 0 } }}>
            <TableCell
                sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    fontSize: '0.78rem',
                    py: 0.6,
                    px: 1.5,
                    whiteSpace: 'nowrap',
                    width: '35%',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {label}
            </TableCell>
            <TableCell
                sx={{
                    fontSize: '0.82rem',
                    py: 0.6,
                    px: 1.5,
                    fontFamily: mono ? 'monospace' : 'inherit',
                    wordBreak: 'break-all',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {value}
            </TableCell>
        </TableRow>
    );
}

const MonomerDetailsDialog = memo(function MonomerDetailsDialog({ open, onClose, monomer }) {
    const imgContainerRef = useRef(null);
    const pzRef = useRef(null);

    // Attach panzoom when dialog opens; dispose when it closes or monomer changes
    useEffect(() => {
        if (!open || !monomer) return;
        // Small delay so the DOM element is painted before panzoom measures it
        const timer = setTimeout(() => {
            const el = imgContainerRef.current;
            if (!el) return;
            pzRef.current = panzoom(el, {
                minZoom: 0.5,
                maxZoom: 8,
                bounds: true,
                boundsPadding: 0.2,
                zoomSpeed: 0.065,
                smoothScroll: false,
                onDoubleClick: () => false,  // prevent panzoom zoom-on-dblclick
            });
        }, 60);

        return () => {
            clearTimeout(timer);
            pzRef.current?.dispose();
            pzRef.current = null;
        };
    }, [open, monomer]);

    const handleDoubleClick = useCallback(() => {
        const pz = pzRef.current;
        if (!pz) return;
        pz.reset?.();
        // pz.moveTo(0, 0);
        // pz.zoomAbs(0, 0, 1);
    }, []);

    const tag = useMemo(() => monomer ? getMonomerTag(monomer) : null, [monomer]);
    const palette = TAG_PALETTE[tag] || TAG_PALETTE['default'];

    const imageBase64 = monomer?.image_binary || monomer?.image_url || monomer?.image_base64 || monomer?.imageBase64 || '';
    const natAnalog = safe(monomer?.natAnalog ?? monomer?.natural_analog ?? monomer?.nat_analog);
    const pdbName = safe(monomer?.pdbName ?? monomer?.pdb_name);
    const symbol = safe(monomer?.symbol ?? monomer?.m_abbr);
    const name = safe(monomer?.m_name ?? monomer?.name);
    const mType = safe(monomer?.m_type ?? monomer?.type);
    const mSubtype = safe(monomer?.m_subtype ?? monomer?.subtype);
    const canonSmiles = safe(monomer?.canonic_smiles ?? monomer?.smiles);

    const rGroupEntries = useMemo(() => monomer ? getRGroupEntries(monomer) : [], [monomer]);

    if (!monomer) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    px: 2.5,
                    bgcolor: 'background.paper',
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }} noWrap>
                        {symbol !== DASH ? symbol : name}
                    </Typography>
                    {symbol !== DASH && name !== DASH && symbol !== name && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.2 }} noWrap>
                            {name}
                        </Typography>
                    )}
                </Box>

                {/* Type / subtype chips */}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                    {tag && (
                        <Chip
                            label={tag}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.68rem',
                                height: 22,
                                color: palette.color,
                                bgcolor: palette.bg,
                                border: `1px solid ${palette.color}30`,
                            }}
                        />
                    )}
                    {mSubtype !== DASH && mSubtype.toLowerCase() !== (tag || '').toLowerCase() && (
                        <Chip
                            label={mSubtype}
                            size="small"
                            variant="outlined"
                            sx={{
                                fontWeight: 500,
                                fontSize: '0.65rem',
                                height: 20,
                                textTransform: 'capitalize',
                            }}
                        />
                    )}
                    {mType !== DASH && mType.toLowerCase() !== mSubtype.toLowerCase() && (
                        <Chip
                            label={mType}
                            size="small"
                            variant="outlined"
                            sx={{
                                fontWeight: 500,
                                fontSize: '0.65rem',
                                height: 20,
                                textTransform: 'capitalize',
                            }}
                        />
                    )}
                </Box>

                <IconButton
                    aria-label="Close"
                    onClick={onClose}
                    size="small"
                    sx={{ ml: 0.5, color: 'text.secondary' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ p: 0 }}>
                {/* Monomer image — pannable / zoomable */}
                {imageBase64 && (
                    <Box
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            bgcolor: 'grey.50',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            height: 220,
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' },
                        }}
                        onDoubleClick={handleDoubleClick}
                    >
                        <Box
                            ref={imgContainerRef}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                height: '100%',
                            }}
                        >
                            <Box
                                component="img"
                                src={`data:image/png;base64,${imageBase64}`}
                                alt={`Structure of ${monomer.symbol || monomer.m_name}`}
                                sx={{
                                    maxWidth: '90%',
                                    maxHeight: 200,
                                    objectFit: 'contain',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                }}
                            />
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                bottom: 4,
                                right: 8,
                                color: 'text.disabled',
                                fontSize: '0.6rem',
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}
                        >
                            Scroll to zoom, drag to pan.
                        </Typography>
                    </Box>
                )}

                {/* Metadata table */}
                <Table size="small" sx={{ tableLayout: 'fixed' }}>
                    <TableBody>
                        <MetaRow label="BILN Symbol" value={symbol} mono />
                        <MetaRow label="PDB Code" value={pdbName} mono />
                        <MetaRow label="Natural Analog" value={natAnalog} mono />
                        <MetaRow label="Type" value={mType} />
                        <MetaRow label="Subtype" value={mSubtype} />
                        <MetaRow label="SMILES" value={canonSmiles} mono />
                    </TableBody>
                </Table>

                {/* R-groups */}
                {rGroupEntries.length > 0 && (
                    <>
                        <Divider />
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography
                                variant="overline"
                                sx={{
                                    fontSize: '0.65rem',
                                    letterSpacing: '0.08em',
                                    color: 'text.disabled',
                                    display: 'block',
                                    mb: 0.75,
                                }}
                            >
                                R-Groups
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {rGroupEntries.map((rg) => (
                                    <Chip
                                        key={rg.label}
                                        label={`${rg.label}: ${rg.leaving}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            height: 26,
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
});

export default MonomerDetailsDialog;
