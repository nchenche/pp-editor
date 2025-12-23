import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';

import { Box, Stack, TextField, Typography } from '@mui/material';

import { normalizeBilnInput } from '../../utils/bilnUtils';


function countMonomersFromBiln(biln) {
  // Simple token count: chains split by '.', residues split by '-'
  // (If you have a shared analyzeBiln utility, prefer using it here.)
  return (biln || '')
    .split('.')
    .flatMap((seg) => seg.split('-'))
    .map((t) => t.trim())
    .filter(Boolean).length;
}

export function SequenceInput({
  value,
  onChangeValue,
  error,
  helperText,
  maxMonomers = 40,
  ...props
}) {
  const monomerCount = useMemo(() => countMonomersFromBiln(value), [value]);
  const counterText = useMemo(
    () => `${monomerCount}/${maxMonomers} monomers`,
    [monomerCount, maxMonomers],
  );

  // CHANGED: show either error/help OR counter (not both)
  const composedHelper = useMemo(() => {
    if (error) {
      return (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {helperText || error}
        </Typography>
      );
    }

    return (
      <Typography
        variant="caption"
        sx={{
          color: monomerCount >= maxMonomers ? 'warning.main' : 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {counterText}
      </Typography>
    );
  }, [error, helperText, counterText, monomerCount, maxMonomers]);

  return (
    <TextField
      label="Enter BILN sequence"
      value={value}
      onChange={(e) => onChangeValue(normalizeBilnInput(e.target.value))}
      variant="outlined"
      size="small"
      fullWidth
      autoComplete="off"
      spellCheck={false}
      error={!!error}
      helperText={composedHelper}
      slotProps={{
        inputProps: {
          inputMode: 'text',
          pattern: '[A-Za-z0-9\\-\\.\\(\\),\\s]*',
          ...props.inputProps,
        },
      }}
      {...props}
    />
  );
}

export function SequenceEditorPanel({ biln, onChangeBiln, maxMonomers = 40 }) {
  const [bilnText, setBilnText] = useState(biln || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setBilnText(biln || '');
  }, [biln]);

  const handleBilnChange = (val) => {
    const normalized = normalizeBilnInput(val);
    const prevCount = countMonomersFromBiln(bilnText);
    const nextCount = countMonomersFromBiln(normalized);

    if (nextCount > maxMonomers && nextCount > prevCount) {
      setError(`Maximum length reached (${maxMonomers} monomers). Remove a monomer to add a new one.`);
      return;
    }

    setError('');
    setBilnText(normalized);
    onChangeBiln?.(normalized);
  };

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
      <Stack spacing={1}>
        <SequenceInput
          value={bilnText}
          onChangeValue={handleBilnChange}
          error={error}
          helperText={error}
          maxMonomers={maxMonomers}
        />
      </Stack>
    </Box>
  );
}

import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';

function computeResidueRanges(biln) {
  // Split by '.' segments, then by '-' residues, record start/end in flat text
  const ranges = [];
  let pos = 0;
  const segs = (biln || '').split('.');
  segs.forEach((seg, sIdx) => {
    const toks = seg ? seg.split('-') : [];
    toks.forEach((tok, i) => {
      const start = pos;
      const end = start + tok.length;
      ranges.push({ start, end, seg: sIdx, i, tok });
      pos = end;
      if (i < toks.length - 1) { pos += 1; } // '-'
    });
    if (sIdx < segs.length - 1) { pos += 1; } // '.'
  });
  return ranges;
}

const hoverCompartment = new Compartment();

function hoverDecorationExt(targetIdx) {
  return EditorView.decorations.compute([EditorState.doc], (state) => {
    const decos = [];
    if (typeof targetIdx === 'number' && targetIdx >= 0) {
      const ranges = computeResidueRanges(state.doc.toString());
      console.log('Computed ranges:', ranges);
      const r = ranges[targetIdx];
      if (r) {
        decos.push(Decoration.mark({ class: 'cm-biln-hover' }).range(r.start, r.end));
      }
    }
    return Decoration.set(decos, true);
  });
}

export default function BilnEditorCM({ value, onChange, hoveredResidueIdx }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);

  const baseTheme = useMemo(() => EditorView.baseTheme({
    '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.9rem' },
    '.cm-biln-hover': {
      fontWeight: 700,
      backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
      borderBottom: '1px dotted currentColor',
    },
  }), []);

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value ?? '',
      extensions: [
        baseTheme,
        keymap.of([]),
        EditorView.updateListener.of((vu) => {
          if (vu.docChanged) onChange?.(vu.state.doc.toString());
        }),
        hoverCompartment.of(hoverDecorationExt(hoveredResidueIdx)),
        EditorView.editable.of(true),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, [baseTheme]); // init once

  // Keep doc in sync when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== (value ?? '')) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value ?? '' } });
    }
  }, [value]);

  // Update hovered decoration
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: hoverCompartment.reconfigure(hoverDecorationExt(hoveredResidueIdx)),
    });
  }, [hoveredResidueIdx]);

  return <div ref={hostRef} style={{ minHeight: 32, borderRadius: 6, border: '1px solid var(--mui-palette-divider)', padding: 6 }} />;
}