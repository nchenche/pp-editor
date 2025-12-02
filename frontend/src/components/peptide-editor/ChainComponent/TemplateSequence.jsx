//// filepath: /home/nche/projects/pp-editor/frontend/src/components/peptide-editor/ChainComponent/TemplateSequence.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

export default function TemplateSequence({
    mapping,
    scaffoldTemplate,
}) {
    // No scaffold at all
    if (!scaffoldTemplate) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Upload a scaffold to enable mappings.
            </Typography>
        );
    }

    // Scaffold present but mapping disabled
    if (!mapping?.enabled) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Template disabled for this chain.
            </Typography>
        );
    }

    const { chainId, start, end, offset = 0 } = mapping;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="body2">
                Chain {chainId || 'auto'} · {start ?? '—'}–{end ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Offset {offset >= 0 ? `+${offset}` : offset}
            </Typography>
        </Box>
    );
}