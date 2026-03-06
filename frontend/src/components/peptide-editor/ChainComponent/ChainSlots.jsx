import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useOverlayPortal } from '../../common/OverlayPortalContext';
import ChainContainer from './ChainContainer';
import { MonomerSequence } from './MonomerSequence';
import TemplateSequence from './TemplateSequence';

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';

import { alpha } from "@mui/material/styles";
import { useHoveredMonomer } from '../../../state/hoveredMonomerStore';
import { CELL_WIDTH, CELL_HEIGHT, CELL_GAP, CELL_CSS_VARS } from './cellSizeTokens';

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

    const normSS = (s) => {
        const c = (s || '').toString().trim().slice(0, 1).toUpperCase();
        return DSSP_VALUES.includes(c) ? c : '-';
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
            <Box style={CELL_CSS_VARS} sx={{ pt: 0.75, pr: 0.75 }}>
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
                            data-dssp-container
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
                                    const v = DSSP_VALUES.includes(raw) ? raw : '-';
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
                            {/* Chain removal icon – top-right corner, overlaps border */}
                            <Tooltip title="Remove chain" arrow>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        sequenceClearHandler();
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        zIndex: 3,
                                        width: 16,
                                        height: 16,
                                        p: 0,
                                        borderRadius: '50%',
                                        color: '#fff',
                                        bgcolor: (t) => seqIdx === safeActiveSeqIdx
                                            ? t.palette.grey[700]
                                            : t.palette.grey[600],
                                        boxShadow: 1,
                                        '&:hover': {
                                            bgcolor: 'error.main',
                                        },
                                    }}
                                    aria-label="remove chain"
                                >
                                    <CloseIcon sx={{ fontSize: 10 }} />
                                </IconButton>
                            </Tooltip>
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
            </Box>
        </DragDropContext>
    );
};

/** The three allowed DSSP values, in cycling order. */
const DSSP_VALUES = ['H', 'E', '-'];
const DSSP_SET = new Set(DSSP_VALUES);

const letterTint = (_t, ch) => {
    const map = {
        H: { bg: alpha('#16a34a', 0.14), bd: alpha('#16a34a', 0.35), fg: '#064e3b' },    // green  – helix
        E: { bg: alpha('#1d4ed8', 0.14), bd: alpha('#1d4ed8', 0.35), fg: '#0b3a9a' },    // blue   – strand
        '-': { bg: alpha('#94a3b8', 0.10), bd: alpha('#94a3b8', 0.28), fg: '#475569' },   // gray   – coil / none
    };
    return map[ch] || map['-'];
};

/**
 * OTP-style constraint cell.
 *
 * Behaviour:
 *  - Only H, E, - are accepted (typed or pasted).
 *  - Typing a valid value commits it and auto-advances focus to the next cell.
 *  - Left / Right arrows navigate between cells.
 *  - Up / Down arrows cycle through H → E → - → H (or reverse).
 *  - Backspace / Delete reset the cell to '-' and move focus backward.
 *  - The text caret is hidden for a clean OTP look.
 *  - Paste is supported: valid chars are distributed across cells from the
 *    current position onward.
 */
function ConstraintCell({ index, value, commitAt, chipWidth = CELL_WIDTH, cellSize = CELL_HEIGHT }) {
    const ref = useRef(null);

    // Walk up from the <input> to the nearest container that holds all cells,
    // so querySelector can reach sibling inputs wrapped in their own <span>s.
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

    const pasteFromClipboard = async () => {
        try {
            const text = (await navigator.clipboard.readText()).toUpperCase();
            if (!text) return;
            let i = index;
            for (const ch of text) {
                if (DSSP_SET.has(ch)) { commitAt(i, ch); i += 1; }
            }
            moveFocus(i);
        } catch { /* clipboard access denied – ignore */ }
    };

    const handleKeyDown = (e) => {
        // ── Paste (Ctrl/Cmd+V) — readOnly blocks native paste event ──
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteFromClipboard(); return; }

        // ── Arrow navigation ──
        if (e.key === 'ArrowLeft')  { e.preventDefault(); moveFocus(index - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(index + 1); return; }
        if (e.key === 'ArrowUp')    { e.preventDefault(); cycleValue(-1); return; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); cycleValue(+1); return; }
        if (e.key === 'Enter')      { e.preventDefault(); moveFocus(e.shiftKey ? index - 1 : index + 1); return; }
        if (e.key === 'Tab')        { /* let browser handle focus naturally */ return; }

        // ── Backspace: reset current cell → move left ──
        if (e.key === 'Backspace') {
            e.preventDefault();
            commitAt(index, '-');
            moveFocus(index - 1);
            return;
        }

        // ── Delete: reset current cell (stay put) ──
        if (e.key === 'Delete') {
            e.preventDefault();
            commitAt(index, '-');
            return;
        }

        // ── Character input ──
        if (e.key && e.key.length === 1) {
            e.preventDefault();
            const ch = e.key.toUpperCase();
            if (DSSP_SET.has(ch)) {
                commitAt(index, ch);
                moveFocus(index + 1);
            } else {
                // Subtle shake animation for invalid key
                ref.current?.animate(
                    [{ transform: 'translateX(0)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }],
                    { duration: 120 }
                );
            }
        }
    };

    const tint = letterTint(null, value);

    return (
        <input
            ref={ref}
            data-idx={index}
            value={value}
            readOnly          /* all mutations go through onKeyDown / onPaste */
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            inputMode="none"   /* suppress mobile virtual keyboard letter-mode */
            aria-label={`Constraint at ${index + 1}: ${value}`}
            style={{
                display: 'block',
                width: `var(--pp-cell-w, ${chipWidth}px)`,
                height: `var(--pp-cell-h, ${cellSize}px)`,
                lineHeight: `var(--pp-cell-h, ${cellSize}px)`,
                textAlign: 'center',
                borderRadius: 6,
                border: `1px solid ${tint.bd}`,
                outline: 'none',
                fontSize: 11,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 600,
                padding: 0,
                boxSizing: 'border-box',
                background: tint.bg,
                color: tint.fg,
                caretColor: 'transparent',   /* hide text cursor */
                cursor: 'pointer',
                userSelect: 'none',
            }}
            onFocus={(e) => {
                e.currentTarget.style.outline = '1.5px solid var(--mui-palette-primary-main)';
                e.currentTarget.style.outlineOffset = '1px';
                e.currentTarget.style.boxShadow = '0 0 0 2.5px rgba(25,118,210,0.18)';
                // Collapse any browser text selection
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