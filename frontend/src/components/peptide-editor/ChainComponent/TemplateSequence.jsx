import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { CELL_WIDTH, CELL_HEIGHT, CELL_GAP } from './cellSizeTokens';
import { useHoveredTemplateResidue } from '../../../state/hoveredTemplateResidueStore';

const GRID_GAP = 0.5;

const TemplateResidue = ({ code, resid, isGap, kind, showControls, masked, onToggle, onContextMenu, isHovered }) => {
    const isOffsetOrMasked = kind === 'offset' || masked;

    return (
        <Box
            sx={{
                width: `var(--pp-cell-w, ${CELL_WIDTH}px)`,
                minWidth: `var(--pp-cell-w, ${CELL_WIDTH}px)`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                '&:hover .template-mask-btn': {
                    opacity: 1,
                    pointerEvents: 'auto',
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
                            top: -20,
                            opacity: 0,
                            transition: 'opacity 120ms ease',
                            pointerEvents: 'none',
                            zIndex: 1,
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={onToggle}
                            sx={{ width: 6, height: 6, color: 'text.secondary' }}
                        >
                            {masked ? (
                                <VisibilityOutlinedIcon sx={{ width: 12, height: 12 }} />
                            ) : (
                                <VisibilityOffOutlinedIcon sx={{ width: 12, height: 12 }} />
                            )}
                        </IconButton>
                    </Box>
                </Tooltip>
            )}
            <Box
                sx={{
                    width: '100%',
                    height: `var(--pp-cell-h, ${CELL_HEIGHT}px)`,
                    borderRadius: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.1,
                    textTransform: 'uppercase',
                    border: '1px solid',
                    borderColor: (theme) =>
                        isHovered
                            ? theme.palette.info.main
                            : isOffsetOrMasked
                                ? theme.palette.warning.light
                                : theme.palette.primary.light,
                    bgcolor: (theme) =>
                        isHovered
                            ? theme.palette.info.main + '38'
                            : isOffsetOrMasked
                                ? theme.palette.warning.light + '22'
                                : theme.palette.primary.light + '18',
                    color: (theme) =>
                        isOffsetOrMasked
                            ? theme.palette.warning.dark
                            : theme.palette.primary.dark,
                    boxShadow: isHovered
                        ? (theme) => `0 0 0 2px ${theme.palette.info.main}50`
                        : 'none',
                    transition: 'border-color 100ms, background-color 100ms, box-shadow 100ms',
                }}
                onContextMenu={onContextMenu}
            >
                <Box
                    sx={{
                        userSelect: 'none',
                        fontSize: 10,
                        fontWeight: 500,
                        lineHeight: 1.1,
                    }}
                >
                    {code}
                </Box>
                {resid != null && (
                    <Box
                        sx={{
                            userSelect: 'none',
                            fontSize: 9,
                            lineHeight: 1.05,
                            color: 'text.secondary',
                        }}
                    >
                        {resid}
                    </Box>
                )}
            </Box>
        </Box>
    );
};
export default function TemplateSequence({
    mapping,
    maxResidueCount = null,
    hasScaffoldTemplate = false,
    sequenceIndex = null,
    onEditMapping,
    onOpenScaffoldDialog,
}) {
    // Designed sequence is empty: keep a stable, non-collapsing placeholder.
    if (hasScaffoldTemplate && typeof maxResidueCount === 'number' && maxResidueCount <= 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: CELL_HEIGHT + 4 }}>
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        fontSize: 12,
                        userSelect: 'none',
                        px: 0.5,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Input residues are required. Add monomers to anchor template mapping.
                </Typography>
            </Box>
        );
    }

    if (!hasScaffoldTemplate) {
        return (
            <Typography
                variant="body2"
                role="button"
                tabIndex={0}
                onClick={() => onOpenScaffoldDialog?.()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenScaffoldDialog?.(); }}
                sx={{
                    color: 'text.secondary',
                    cursor: onOpenScaffoldDialog ? 'pointer' : 'default',
                    '&:hover': onOpenScaffoldDialog ? { color: 'primary.main', textDecoration: 'underline' } : {},
                    transition: 'color 0.15s',
                    userSelect: 'none',
                }}
            >
                Upload a scaffold to enable mappings.
            </Typography>
        );
    }

    if (!mapping || !Array.isArray(mapping.templateResidues)) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Template mappings are not available yet.
            </Typography>
        );
    }

    const isEnabled = mapping?.enabled === true;

    const offsetCount = Math.max(0, Number(mapping.offset) || 0);
    const trailingCapCount = Math.max(0, Number(mapping.trailingCapCount) || 0);
    const templateResidues = mapping.templateResidues;

    if (!templateResidues.length) {
        return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No template residues mapped yet.
            </Typography>
        );
    }
    const manualMaskSet = useMemo(
        () => new Set(mapping.manualMasks || []),
        [mapping.manualMasks],
    );
    const hoveredTemplateResidue = useHoveredTemplateResidue();
    const mappingBaseStart = useMemo(() => {
        const start = Number(mapping?.start);
        const end = Number(mapping?.end);
        if (!isEnabled) return null;
        if (!mapping?.chainId) return null;
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        if (start < 1 || end < 1) return null;
        return Math.min(start, end);
    }, [isEnabled, mapping?.chainId, mapping?.start, mapping?.end]);



    // Number of AA positions in this chain (excluding caps).
    // If parent passes it via maxResidueCount, we use that;
    // otherwise fall back to the number of mapped residues.
    const aaSlots = useMemo(() => {
        if (typeof maxResidueCount === 'number' && maxResidueCount > 0) {
            return maxResidueCount;
        }
        return templateResidues.length;
    }, [maxResidueCount, templateResidues.length]);

    // Total visual cells = N-ter offset + all AA slots + optional C-ter caps.
    // const totalSlots = offsetCount + aaSlots + trailingCapCount;
    const totalSlots = aaSlots;


    const cells = useMemo(() => {
        const aaStart = offsetCount;
        // const aaEnd = offsetCount + aaSlots; // exclusive
        const aaEnd = aaSlots - trailingCapCount; // exclusive
        const capStart = aaEnd;

        return Array.from({ length: totalSlots }, (_, slotIdx) => {
            // 1) Leading offset cells (N-ter cap mapped as pure offset X's)
            if (slotIdx < offsetCount) {
                return { code: 'X', resid: null, kind: 'offset', masked: true };
            }

            // 2) AA region: mapped residues first, then unmapped '-'
            if (slotIdx >= aaStart && slotIdx < aaEnd) {
                const aaIdx = slotIdx - aaStart;

                if (aaIdx < templateResidues.length) {
                    const residue = templateResidues[aaIdx];
                    const masked = manualMaskSet.has(aaIdx);
                    const baseCode = residue.code || 'X';

                    return {
                        code: masked ? '-' : baseCode,
                        resid: residue.resid,
                        kind: 'template',
                        templateIdx: aaIdx,
                        masked,
                    };
                }

                // AA beyond available template residues → unmapped
                return {
                    code: '-',
                    resid: null,
                    kind: 'unmapped',
                    templateIdx: null,
                    masked: false,
                };
            }

            // 3) C-terminal cap cells (fixed X at the very end, non-editable)
            if (slotIdx >= capStart) {
                const rel = slotIdx - capStart;
                if (rel < trailingCapCount) {
                    return {
                        code: 'X',
                        resid: null,
                        kind: 'cterm-cap',
                        templateIdx: null,
                        masked: true,
                        locked: true,
                    };
                }
            }

            // Fallback (should not normally hit)
            return { code: '-', resid: null, kind: 'pad', masked: false };
        });
    }, [totalSlots, offsetCount, aaSlots, templateResidues, manualMaskSet, trailingCapCount]);

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
                opacity: isEnabled ? 1 : 0.65,
                alignItems: 'center',
            }}
        >
            {cells.map((cell, idx) => {
                const showControls =
                    isEnabled &&
                    canEdit &&
                    cell.kind === 'template' &&
                    cell.templateIdx != null &&
                    !cell.locked;

                const canFocus =
                    mappingBaseStart != null &&
                    isEnabled &&
                    cell.kind === 'template' &&
                    cell.templateIdx != null;

                const onContextMenu = canFocus
                    ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('pp-focus-residue', {
                            detail: {
                                target: 'template',
                                chainId: mapping.chainId,
                                seqId: Number(mappingBaseStart) + Number(cell.templateIdx),
                            }
                        }));
                    }
                    : undefined;

                return (
                    <TemplateResidue
                        key={`template-residue-${idx}`}
                        code={cell.code}
                        resid={cell.resid}
                        isGap={cell.code === 'X'}
                        kind={cell.kind}
                        showControls={showControls}
                        onContextMenu={onContextMenu}
                        masked={cell.masked}
                        onToggle={() =>
                            cell.templateIdx != null
                                ? toggleResidueMask(cell.templateIdx)
                                : undefined
                        }
                        isHovered={
                            hoveredTemplateResidue != null &&
                            cell.resid != null &&
                            hoveredTemplateResidue.resid === cell.resid
                        }
                    />
                );
            })}
        </Box>
    );
}