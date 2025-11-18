import React, { useCallback, useRef } from 'react';
import { Box, TextField, Tooltip, Typography } from '@mui/material';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useOverlayPortal } from '../../common/OverlayPortalContext';
import ChainContainer from './ChainContainer';
import { MonomerSequence } from './MonomerSequence';

import { alpha } from "@mui/material/styles";
import { useTheme } from '@mui/material/styles';


export const ChainSlots = ({
    rowMonomerLists,
    activeSeqIdx,
    onSetActiveSeqIdx,
    linkMap,
    hoveredMonomer,
    handleDeleteMonomerItem,
    onDragEnd,
    onDragStart,
    handleMonomerEnter,
    handleMonomerLeave,
    handleDeleteSequence,
    constraintsMode = false,
    constraintsBySeq = [],
    onEditConstraint = () => { },
}) => {
    const { overlayActive } = useOverlayPortal();
    const makeDeleteHandler = useCallback((idx) => () => handleDeleteSequence(idx), [handleDeleteSequence]);

    const ALLOWED = ['H', 'E', 'C', 'T', 'B', 'I', '-'];
    const normSS = (s) => {
        const c = (s || '').toString().trim().slice(0, 1).toUpperCase();
        return ALLOWED.includes(c) ? c : '-';
    };

    const gridGap = 0.5; // spacing between chips (theme spacing units)
    const chipWidth = 32; // px; matches w-8 from MonomerItem
    const chipHeight = 20; // px; for reference only
    const cellSize = 20; // px height for constraints cells


    return (
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            {rowMonomerLists.map((list, seqIdx) => (
                <Box
                    key={seqIdx}
                    onClick={() => onSetActiveSeqIdx(seqIdx)}
                    sx={{
                        position: 'relative',
                        zIndex: (t) => (overlayActive && seqIdx === activeSeqIdx) ? t.zIndex.modal + 2 : 'auto',
                        transform: (overlayActive && seqIdx === activeSeqIdx) ? 'translateY(-2px) scale(1.01)' : 'none',
                        boxShadow: (overlayActive && seqIdx === activeSeqIdx)
                            ? '0 8px 18px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)'
                            : 'none',
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        mb: 1,
                    }}
                >
                    <ChainContainer
                        onSequenceClear={makeDeleteHandler(seqIdx)}
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
                                        isActive={seqIdx === activeSeqIdx}
                                        hoveredMonomer={overlayActive ? null : hoveredMonomer}
                                        onDelete={handleDeleteMonomerItem}
                                        handleMonomerEnter={overlayActive ? () => { } : handleMonomerEnter}
                                        handleMonomerLeave={overlayActive ? () => { } : handleMonomerLeave}
                                        // onDeleteSequence={makeDeleteHandler(seqIdx)}
                                        label={`Chain ${seqIdx + 1}`}
                                        dndDisabled={overlayActive}
                                    >
                                        {provided.placeholder}
                                    </MonomerSequence>
                                )}
                            </Droppable>
                        }
                        constraintsSlot={
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 0.5,
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    py: 0.5,
                                    px: 1,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    minHeight: 34,
                                    alignItems: 'center',
                                }}
                            >
                                {list.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: 'text.secondary', px: 0.5 }}>
                                        No residues. Add monomers to define constraints.
                                    </Typography>
                                ) : (
                                    list.map((m, i) => {
                                        const raw = String(constraintsBySeq?.[seqIdx]?.[i] ?? '-').toUpperCase();
                                        const v = ['H', 'E', 'C', '-'].includes(raw) ? raw : '-';
                                        return (
                                            <Tooltip key={(m.uid || m._id || m['res-idx'] || i) + '-cell'} title="H/E/C (one letter)" arrow>
                                                <span>
                                                    <ConstraintCell
                                                        index={i}
                                                        value={v}
                                                        commitAt={(idx, ch) => onEditConstraint?.(seqIdx, idx, ch)}
                                                        chipWidth={chipWidth}  // match monomer item width
                                                        cellSize={cellSize}   // match monomer item height (square)
                                                    />
                                                </span>
                                            </Tooltip>
                                        );
                                    })
                                )}
                            </Box>
                        }
                        templateSlot={undefined /* default template row in ChainContainer */}
                    />
                </Box>
            ))}
        </DragDropContext>
    );
};


// helper: allowed letters and tint map
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