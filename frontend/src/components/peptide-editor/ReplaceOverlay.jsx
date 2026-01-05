import React, { useEffect, useMemo, useState } from 'react';
import { Backdrop, Box, Paper, Typography, Button } from '@mui/material';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

function getMonomerCode(m) {
    return m?.pdbName || m?.symbol || m?.m_abbr || '';
}

function getResidueNumber(sourceMonomer) {
    const raw = String(sourceMonomer?.['res-idx'] ?? '');
    const parts = raw.split('-');
    const idx0 = parseInt(parts?.[1], 10);
    if (!Number.isFinite(idx0) || idx0 < 0) return null;
    return idx0 + 1;
}

function getMonomerName(sourceMonomer) {
    return sourceMonomer?.m_name || sourceMonomer?.name || sourceMonomer?.mName || '';
}

export function ReplaceOverlay({ replaceSelect, onCancel }) {
    const { rootRef, setOverlayActive } = useOverlayPortal();
    const [hostRect, setHostRect] = useState(null);

    const hostBounds = useMemo(() => {
        const r = hostRect;
        if (!r) return null;
        const width = Math.max(0, r.width);
        const left = r.left;
        const right = r.right;
        const top = r.top;
        const maxWidth = Math.max(0, Math.min(520, width - 24));
        const computedWidth = Math.max(0, Math.min(width - 24, maxWidth));
        const centerX = left + width / 2;
        return { left, right, top, width, centerX, computedWidth, maxWidth };
    }, [hostRect]);

    useEffect(() => {
        setOverlayActive?.(!!replaceSelect?.open);
        return () => setOverlayActive?.(false);
    }, [replaceSelect?.open, setOverlayActive]);

    // Keep the dialog inside the editor column so it never overlaps the library on narrow widths.
    useEffect(() => {
        if (!replaceSelect?.open) return;

        const el = rootRef?.current;
        if (!el) return;

        const update = () => {
            const rect = el.getBoundingClientRect();
            setHostRect(rect);
        };

        update();
        window.addEventListener('resize', update);

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        }
        return () => {
            window.removeEventListener('resize', update);
            ro?.disconnect?.();
        };
    }, [replaceSelect?.open, rootRef]);

    if (!replaceSelect?.open) return null;

    const src = replaceSelect?.sourceMonomer;
    const srcCode = getMonomerCode(src);
    const resNo = getResidueNumber(src);
    const modeLabel = replaceSelect?.mode === 'analog' ? 'Analog replacement' : 'Replacement';
    const srcName = getMonomerName(src) || srcCode;

    return (
        <Backdrop
            open
            onClick={onCancel}
            sx={{
                zIndex: (t) => t.zIndex.modal,
                bgcolor: 'rgba(0,0,0,0.42)',
            }}
        >
            <Paper
                elevation={12}
                onClick={(e) => e.stopPropagation()}
                sx={{
                    p: 2,
                    maxWidth: hostBounds?.maxWidth ?? 520,
                    width: hostBounds?.computedWidth ? `${hostBounds.computedWidth}px` : 'calc(100% - 32px)',
                    textAlign: 'center',
                    border: 2,
                    borderColor: 'success.light',
                    bgcolor: 'background.paper',
                    position: 'fixed',
                    top: hostBounds ? Math.max(8, hostBounds.top + 12) : 88,
                    left: hostBounds ? hostBounds.centerX : '50%',
                    transform: 'translateX(-50%)',
                    zIndex: (t) => t.zIndex.modal + 30,
                    boxShadow: (t) => t.shadows[12],
                }}
            >
                <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 700 }}>
                    {srcCode && resNo != null
                        ? `${modeLabel} of ${srcCode} (residue ${resNo})`
                        : `${modeLabel} active`}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ color: 'text.primary', whiteSpace: 'pre-line' }}
                >
                    {`Pick a monomer in the Monomer Library to replace the selected ${srcName}`}
                </Typography>

                <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={onCancel}>
                        Cancel
                    </Button>
                </Box>
            </Paper>
        </Backdrop>
    );
}