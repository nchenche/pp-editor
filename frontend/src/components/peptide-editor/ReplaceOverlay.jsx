//// filepath: /home/nche/projects/pp-editor/frontend/src/components/peptide-editor/ReplaceOverlay.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

export function ReplaceOverlay({ replaceSelect, onCancel }) {
    const { rootRef, overlayActive, setOverlayActive } = useOverlayPortal();

    React.useEffect(() => {
        setOverlayActive?.(replaceSelect.open);
        return () => setOverlayActive?.(false);
    }, [replaceSelect.open, overlayActive, setOverlayActive]);

    if (!replaceSelect.open || !rootRef?.current) return null;

    return createPortal(
        <Box
            role="dialog"
            aria-modal="true"
            aria-label="Select a replacement monomer"
            onClick={onCancel}
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: (t) => t.zIndex.modal,
                bgcolor: 'rgba(0,0,0,0.44)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Paper
                elevation={3}
                onClick={(e) => e.stopPropagation()}
                sx={{
                    p: 2,
                    maxWidth: 460,
                    width: '100%',
                    textAlign: 'center',
                    border: 1,
                    borderColor: 'divider',
                    transform: 'translateY(-100%)',
                }}
            >
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                    Replacement selection active
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {replaceSelect.sourceMonomer
                        ? `Choose a monomer from the Monomer Library to replace ${replaceSelect.sourceMonomer.pdbName} (idx ${replaceSelect.sourceMonomer['res-idx']}).`
                        : 'Choose a monomer from the Monomer Library.'}
                </Typography>
                <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={onCancel}>
                        Cancel
                    </Button>
                </Box>
            </Paper>
        </Box>,
        rootRef.current,
    );
}