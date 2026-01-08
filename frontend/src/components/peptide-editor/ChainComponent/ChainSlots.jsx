import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useOverlayPortal } from '../../common/OverlayPortalContext';
import ChainContainer from './ChainContainer';
import { MonomerSequence } from './MonomerSequence';
import TemplateSequence from './TemplateSequence';

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadIcon from '@mui/icons-material/Upload';

import { alpha } from "@mui/material/styles";
import { useTheme } from '@mui/material/styles';
import { useHoveredMonomer } from '../../../state/hoveredMonomerStore';

const CELL_WIDTH = 32;
const CELL_HEIGHT = 20;
const GRID_GAP = 0.5;

export const ChainSlots = ({
    rowMonomerLists,
    extraEmptyChains = 0,
    setExtraEmptyChains = () => { },
    activeSeqIdx,
    onSetActiveSeqIdx,
    linkMap,
    isDragging = false,
    handleDeleteMonomerItem,
    onDragEnd,
    onDragStart,
    handleMonomerEnter,
    handleMonomerLeave,
    handleDeleteSequence,
    constraintsBySeq = [],
    onEditConstraint = () => { },
    constraintMode = 'ss',
    scaffoldTemplate = null,
    scaffoldMappings = [],
    onEditScaffoldMapping = () => { },
    onOpenTemplatePanel = () => { },
    onOpenScaffoldDialog = () => { },
    onClearScaffold = () => { },
    onCircularizeSequence = () => { },
    onUncircularizeSequence = () => { },
    onMirrorSequence = () => { },
}) => {
    const { overlayActive } = useOverlayPortal();
    const hoveredMonomer = useHoveredMonomer();

    // IMPORTANT: do not memoize by `rowMonomerLists` reference.
    // During DnD we intentionally mutate/replace rows in-place without changing the
    // outer array reference (to avoid forcing a full recompute). Memoizing here can
    // freeze the chain count and reintroduce the classic “snap back then settle” flicker.
    const derivedChainCount = Array.isArray(rowMonomerLists) ? rowMonomerLists.length : 0;
    const prevDerivedChainCountRef = useRef(derivedChainCount);

    // If BILN-derived chain count grows (e.g., user moved a monomer into a placeholder row),
    // consume matching UI-only placeholders so the newly-real chain replaces one placeholder.
    useEffect(() => {
        const prev = prevDerivedChainCountRef.current;
        if (derivedChainCount > prev) {
            const delta = derivedChainCount - prev;
            setExtraEmptyChains((c) => Math.max(0, c - delta));
        }
        prevDerivedChainCountRef.current = derivedChainCount;
    }, [derivedChainCount]);

    // Also avoid memoizing this: it creates a copied array. If rows are replaced in-place
    // during DnD, the copied array can keep pointing at stale row references until the
    // depiction refreshes.
    const effectiveRowMonomerLists = (() => {
        const extras = Array.from({ length: Math.max(0, Number(extraEmptyChains) || 0) }, () => []);
        if (Array.isArray(rowMonomerLists) && rowMonomerLists.length > 0) {
            return rowMonomerLists.concat(extras);
        }
        // Empty BILN: keep a single placeholder row so the Chains section isn't blank.
        return [[]].concat(extras);
    })();

    // Keep active selection within the *rendered* chains (BILN-derived + UI-only placeholders).
    // This allows selecting placeholder chains (e.g., to append monomers into a new chain).
    const safeActiveSeqIdx = useMemo(() => {
        const n = Number(activeSeqIdx);
        const count = Array.isArray(effectiveRowMonomerLists) ? effectiveRowMonomerLists.length : 0;
        if (count <= 0) return 0;
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(n, Math.max(0, count - 1));
    }, [activeSeqIdx, effectiveRowMonomerLists]);
    const makeDeleteHandler = useCallback((idx) => () => handleDeleteSequence(idx), [handleDeleteSequence]);

    const ALLOWED = ['H', 'E', 'C', 'T', 'B', 'I', '-'];
    const normSS = (s) => {
        const c = (s || '').toString().trim().slice(0, 1).toUpperCase();
        return ALLOWED.includes(c) ? c : '-';
    };

    const gridGap = 0.5; // spacing between chips (theme spacing units)
    const chipWidth = 32; // px; matches w-8 from MonomerItem
    const cellSize = 24; // px height for constraints cells

    const showConstraintsRow = constraintMode === 'ss';
    const showTemplateRow = constraintMode === 'template';

    const getHeadToTailLinkIdForRow = useCallback((sequenceOffset, listLength) => {
        if (!Number.isFinite(Number(sequenceOffset)) || !Number.isFinite(Number(listLength))) return null;
        if (listLength < 2) return null;
        const nterIdx = Number(sequenceOffset);
        const cterIdx = Number(sequenceOffset) + Number(listLength) - 1;

        for (const [connId, pairs] of Object.entries(linkMap || {})) {
            if (!Array.isArray(pairs) || pairs.length !== 2) continue;
            const a = pairs[0];
            const b = pairs[1];
            const aIdx = Number(a?.monomerIdx);
            const bIdx = Number(b?.monomerIdx);
            const aRg = Number(a?.rgroup);
            const bRg = Number(b?.rgroup);
            const matches =
                (aIdx === nterIdx && aRg === 1 && bIdx === cterIdx && bRg === 2) ||
                (bIdx === nterIdx && bRg === 1 && aIdx === cterIdx && aRg === 2);
            if (matches) return connId;
        }
        return null;
    }, [linkMap]);

    const seqLabel = useCallback((idx) => {
        const n = Number(idx);
        if (!Number.isFinite(n) || n < 0) return '';
        // Excel-like: 0->A, 25->Z, 26->AA, ...
        let x = Math.floor(n);
        let out = '';
        while (x >= 0) {
            out = String.fromCharCode(65 + (x % 26)) + out;
            x = Math.floor(x / 26) - 1;
        }
        return out;
    }, []);
    return (
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            {(() => {
                let runningOffset = 0;
                return effectiveRowMonomerLists.map((list, seqIdx) => {
                    const sequenceOffset = runningOffset;
                    runningOffset += (list?.length || 0);

                    const mapping = scaffoldTemplate ? (scaffoldMappings?.[seqIdx] || {}) : null;
                    const hasAnyResidues = (list?.length || 0) > 0;

                    const headToTailLinkId = getHeadToTailLinkIdForRow(sequenceOffset, list.length);
                    const sequenceIsCircular = headToTailLinkId != null;

                    const templateSlot = (
                        <Box sx={{ width: 'fit-content', display: 'flex', alignItems: 'center', py: 0.5, gap: 0.5 }}>
                            {!scaffoldTemplate ? (
                                <Tooltip title="Upload scaffold (PDB)" arrow>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={onOpenScaffoldDialog}
                                            sx={{ color: 'text.secondary' }}
                                            aria-label="upload scaffold"
                                        >
                                            <UploadIcon fontSize="inherit" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ) : null}
                            <TemplateSequence
                                mapping={mapping}
                                maxResidueCount={list.length}
                                hasScaffoldTemplate={!!scaffoldTemplate}
                                sequenceIndex={seqIdx}
                                onEditMapping={onEditScaffoldMapping}
                            />
                        </Box>
                    );

                    const constraintsSlot = (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: GRID_GAP,
                                py: 0,
                                px: 0.75,
                                borderRadius: 1,
                                alignItems: 'center',
                            }}
                        >
                            {list.length === 0 ? (
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
                                    No residues yet. Add monomers to start.
                                </Typography>
                            ) : (
                                list.map((m, i) => {
                                    const raw = String(constraintsBySeq?.[seqIdx]?.[i] ?? '-').toUpperCase();
                                    const v = ['H', 'E', 'C', '-'].includes(raw) ? raw : '-';
                                    return (
                                        <span key={`${seqIdx}-${i}`}>
                                            <ConstraintCell
                                                index={i}
                                                value={v}
                                                commitAt={(idx, ch) => {
                                                    onEditConstraint?.(seqIdx, idx, ch);
                                                }}
                                                chipWidth={chipWidth}
                                                cellSize={cellSize}
                                            />
                                        </span>
                                    );
                                })
                            )}
                        </Box>
                    );

                    const baseRowCount = Math.max(derivedChainCount, 1);
                    const isVisualOnlyChainRow = seqIdx >= baseRowCount;
                    const sequenceClearHandler = isVisualOnlyChainRow
                        ? () => setExtraEmptyChains((c) => Math.max(0, c - 1))
                        : makeDeleteHandler(seqIdx);

                    return (
                        <Box
                            key={seqIdx}
                            onClick={() => {
                                onSetActiveSeqIdx(seqIdx);
                            }}
                            sx={{
                                position: 'relative',
                                zIndex: (t) => (overlayActive && seqIdx === safeActiveSeqIdx) ? t.zIndex.modal + 21 : 'auto',
                                transform: 'none',
                                boxShadow: (t) => (seqIdx === safeActiveSeqIdx ? t.shadows[4] : t.shadows[0]),
                                border: (t) => (seqIdx === safeActiveSeqIdx ? `1px solid ${t.palette.grey[500]}` : `1px solid ${t.palette.divider}`),
                                borderRadius: 1,
                                outline: 'none',
                                transition: 'box-shadow 180ms ease',
                                mb: 1,
                            }}
                        >
                            <ChainContainer
                                seqIdx={seqIdx}
                                dimReplaceOverlay={overlayActive && seqIdx === safeActiveSeqIdx}
                                onSequenceClear={sequenceClearHandler}
                                disableSequenceActions={!hasAnyResidues && !isVisualOnlyChainRow}
                                disableConstraintsActions={!hasAnyResidues}
                                // Template row menu should be disabled until a scaffold is uploaded.
                                disableTemplateActions={!scaffoldTemplate}
                                sequenceIsCircular={sequenceIsCircular}
                                onSequenceCircularize={() => onCircularizeSequence?.(seqIdx)}
                                onSequenceUncircularize={() => onUncircularizeSequence?.(seqIdx)}
                                onSequenceMirror={() => onMirrorSequence?.(seqIdx)}
                                onConstraintsFill={(letter) => {
                                    const v = normSS(letter);
                                    for (let i = 0; i < list.length; i++) {
                                        onEditConstraint?.(seqIdx, i, v);
                                    }
                                }}
                                onConstraintsClear={() => {
                                    for (let i = 0; i < list.length; i++) {
                                        onEditConstraint?.(seqIdx, i, '-');
                                    }
                                }}
                                onTemplateConfigure={() => {
                                    onOpenTemplatePanel?.();
                                }}
                                onTemplateClearScaffold={() => {
                                    onClearScaffold?.();
                                }}
                                onTemplateMaskAll={() => {
                                    const n = Array.isArray(mapping?.templateResidues) ? mapping.templateResidues.length : 0;
                                    if (n <= 0) return;
                                    onEditScaffoldMapping?.(seqIdx, { manualMasks: Array.from({ length: n }, (_, i) => i) });
                                }}
                                onTemplateUnmaskAll={() => {
                                    onEditScaffoldMapping?.(seqIdx, { manualMasks: [] });
                                }}
                                sequenceSlot={
                                    <Droppable
                                        droppableId={`${seqIdx}`}
                                        direction="horizontal"
                                        isDropDisabled={overlayActive}
                                    >
                                        {(provided) => (
                                            <MonomerSequence
                                                {...provided.droppableProps}
                                                droppableRef={provided.innerRef}
                                                monomers={list}
                                                linkMap={linkMap}
                                                isDragging={isDragging}
                                                sequenceOffset={sequenceOffset}
                                                isActive={seqIdx === safeActiveSeqIdx}
                                                hoveredMonomer={overlayActive ? null : hoveredMonomer}
                                                onDelete={handleDeleteMonomerItem}
                                                handleMonomerEnter={overlayActive ? () => { } : handleMonomerEnter}
                                                handleMonomerLeave={overlayActive ? () => { } : handleMonomerLeave}
                                                label={`Chain ${seqLabel(seqIdx)}`}
                                                chainIdLabel={seqLabel(seqIdx)}
                                                dndDisabled={overlayActive}
                                            >
                                                {provided.placeholder}
                                            </MonomerSequence>
                                        )}
                                    </Droppable>
                                }
                                showConstraintsRow={showConstraintsRow}
                                showTemplateRow={showTemplateRow}
                                constraintsSlot={constraintsSlot}
                                templateSlot={templateSlot}
                                onTemplateHelp={() => { }}
                            />
                        </Box>
                    );
                });
            })()}
        </DragDropContext>
    );
};

const ALLOWED = new Set(['H', 'E', 'C', 'T', 'G', 'I', 'B', '-']);
const letterTint = (t, ch) => {
    const map = {
        H: { bg: alpha('#16a34a', 0.14), bd: alpha('#16a34a', 0.35), fg: '#064e3b' },    // green
        E: { bg: alpha('#1d4ed8', 0.14), bd: alpha('#1d4ed8', 0.35), fg: '#0b3a9a' },    // blue
        // T: { bg: alpha('#d97706', 0.14), bd: alpha('#d97706', 0.35), fg: '#7c2d12' },    // amber
        C: { bg: alpha('#64748b', 0.14), bd: alpha('#64748b', 0.35), fg: '#1f2937' },    // gray
        // G: { bg: alpha('#0d9488', 0.14), bd: alpha('#0d9488', 0.35), fg: '#064e3b' },    // teal
        // I: { bg: alpha('#7c3aed', 0.14), bd: alpha('#7c3aed', 0.35), fg: '#3b0764' },    // purple
        // B: { bg: alpha('#4338ca', 0.14), bd: alpha('#4338ca', 0.35), fg: '#1e1b4b' },    // indigo
        '-': { bg: alpha('#94a3b8', 0.10), bd: alpha('#94a3b8', 0.28), fg: '#475569' },
    };
    return map[ch] || map['-'];
};

// place near bottom of file
function ConstraintCell({ index, value, commitAt, chipWidth = 32, cellSize = 18 }) {
    const ref = useRef(null);
    const theme = useTheme();

    const moveFocus = (nextIdx) => {
        const parent = ref.current?.parentElement;
        const next = parent?.querySelector(`input[data-idx="${nextIdx}"]`);
        next?.focus();
        next?.select?.();
    };

    const handleKeyDown = (e) => {
        const selStart = ref.current?.selectionStart ?? 0;
        const selEnd = ref.current?.selectionEnd ?? selStart;
        const atStart = selStart === 0;
        const atEnd = selEnd >= String(value ?? '').length; // single-char: 1 when filled

        if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(index - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(index + 1); return; }
        if (e.key === 'Enter') { e.preventDefault(); moveFocus(e.shiftKey ? index - 1 : index + 1); return; }

        if (e.key === 'Backspace') {
            e.preventDefault();
            if (atStart) {
                if (index > 0) { commitAt(index - 1, '-'); moveFocus(index - 1); }
            } else {
                commitAt(index, '-');
            }
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            // If caret at start, delete previous; if at end, delete next.
            if (atStart) {
                if (index > 0) { commitAt(index - 1, '-'); moveFocus(index - 1); }
            } else if (atEnd) {
                commitAt(index + 1, '-'); moveFocus(index + 1);
            } else {
                commitAt(index, '-');
            }
            return;
        }
        if (e.key && e.key.length === 1) {
            const ch = e.key.toUpperCase();
            if (ALLOWED.has(ch)) {
                e.preventDefault();
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
            if (ALLOWED.has(raw)) {
                commitAt(i, raw);
                i += 1;
            }
        }
        moveFocus(i);
    };

    const tint = letterTint(null, value); // your helper already returns colors

    return (
        <input
            ref={ref}
            data-idx={index}
            value={value}
            onChange={() => { }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            inputMode="text"
            aria-label={`Constraint at ${index + 1}`}
            style={{
                display: 'block',
                width: chipWidth,
                height: cellSize,
                lineHeight: `${cellSize}px`,
                textAlign: 'center',
                borderRadius: 6,
                border: `1px solid ${tint.bd}`,
                outline: 'none',
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                padding: 0,
                boxSizing: 'border-box',
                background: tint.bg,
                color: tint.fg,
            }}
            onFocus={(e) => { e.currentTarget.style.outline = '1px solid var(--mui-palette-primary-main)'; }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
            placeholder="-"
            maxLength={1}
        />
    );
}