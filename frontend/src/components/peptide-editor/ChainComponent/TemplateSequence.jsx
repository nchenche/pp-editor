//// filepath: /home/nche/projects/pp-editor/frontend/src/components/peptide-editor/ChainComponent/TemplateSequence.jsx
import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton, TextField } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';


const CELL_WIDTH = 32;
const CELL_HEIGHT = 20;
const GRID_GAP = 0.5;

const TemplateResidue = ({ code, isGap, showControls, masked, onToggle }) => (
    <Box
        sx={{
            width: CELL_WIDTH,
            minWidth: CELL_WIDTH,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // formatting the hover effect
            '&:hover .template-mask-btn': { 
                opacity: 1, 
                pointerEvents: 'auto' 
            },
        }}
    >
        {showControls && (
            <Tooltip title={masked ? 'Unmask residue' : 'Mask residue'}>
                <Box
                    component="span"
                    className="template-mask-btn"
                    sx={{
                        position: 'absolute',
                        top: -18,
                        opacity: 0, 
                        transition: 'opacity 120ms ease',
                        // prevents invisible clicks
                        pointerEvents: 'none', 
                        // ensures the icon sits on top of the row above it
                        zIndex: 1 
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={onToggle}
                        sx={{ width: 8, height: 8, color: 'text.secondary' }}
                    >
                        {masked ? (
                            <VisibilityOutlinedIcon sx={{ width: 14, height: 14 }} />
                        ) : (
                            <VisibilityOffOutlinedIcon sx={{ width: 14, height: 14 }} />
                        )}
                    </IconButton>
                </Box>
            </Tooltip>
        )}
        <Box
            sx={{
                width: '100%',
                height: CELL_HEIGHT,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 400,
                textTransform: 'uppercase',
                border: '1px solid',
                borderColor: (theme) =>
                    isGap ? theme.palette.warning.light : theme.palette.primary.light,
                bgcolor: (theme) =>
                    isGap
                        ? theme.palette.warning.light + '22'
                        : theme.palette.primary.light + '18',
                color: (theme) =>
                    isGap ? theme.palette.warning.dark : theme.palette.primary.dark,
            }}
        >
            {code}
        </Box>
    </Box>
);


export default function TemplateSequence({
    mapping,
    maxResidueCount = null,
    sequenceIndex = null,
    onEditMapping,
}) {
    if (!mapping || !mapping.templateResidues) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Upload a scaffold to enable mappings.
            </Typography>
        );
    }

    if (!mapping?.enabled) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Template disabled for this chain.
            </Typography>
        );
    }

    const offsetCount = Math.max(0, Number(mapping.offset) || 0);
    const templateResidues = mapping.templateResidues || [];
    const manualMaskSet = useMemo(
        () => new Set(mapping.manualMasks || []),
        [mapping.manualMasks],
    );

    const totalSlots = useMemo(() => {
        const natural = offsetCount + templateResidues.length;
        const desired =
            typeof maxResidueCount === 'number' ? maxResidueCount : natural;
        return Math.max(desired, offsetCount);
    }, [offsetCount, templateResidues.length, maxResidueCount]);


    const cells = useMemo(() => {
        return Array.from({ length: totalSlots }, (_, slotIdx) => {
            if (slotIdx < offsetCount) {
                return { code: 'X', kind: 'offset' };
            }
            const templateIdx = slotIdx - offsetCount;
            const residue = templateResidues[templateIdx];
            if (!residue) {
                return { code: 'X', kind: 'pad' };
            }
            const masked = manualMaskSet.has(templateIdx);
            return {
                code: masked ? 'X' : residue,
                kind: 'template',
                templateIdx,
                masked,
            };
        });
    }, [totalSlots, offsetCount, templateResidues, manualMaskSet]);

    const canEdit = typeof sequenceIndex === 'number' && !!onEditMapping;

    const updateMasks = useCallback(
        (updater) => {
            if (!canEdit) return;
            const next = new Set(mapping.manualMasks || []);
            updater(next);
            onEditMapping(sequenceIndex, { manualMasks: Array.from(next) });
        },
        [canEdit, mapping?.manualMasks, onEditMapping, sequenceIndex],
    );

    const toggleResidueMask = useCallback(
        (templateIdx) => {
            updateMasks((set) => {
                if (set.has(templateIdx)) set.delete(templateIdx);
                else set.add(templateIdx);
            });
        },
        [updateMasks],
    );

    if (!cells.length) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No residues selected yet.
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: GRID_GAP,
                minHeight: CELL_HEIGHT,
                alignItems: 'center',
            }}
        >
            {cells.map((cell, idx) => {
                const showControls = canEdit && cell.kind === 'template' && cell.templateIdx != null;
                return (
                    <TemplateResidue
                        key={`template-residue-${idx}`}
                        code={cell.code}
                        isGap={cell.code === 'X'}
                        showControls={showControls}
                        masked={cell.masked}
                        onToggle={() => toggleResidueMask(cell.templateIdx)}
                    />
                );
            })}
        </Box>
    );
}