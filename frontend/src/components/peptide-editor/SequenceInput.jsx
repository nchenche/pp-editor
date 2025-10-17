import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography, Stack, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import ClearIcon from '@mui/icons-material/Clear';

export function SequenceInput({ value, onChangeValue, error, helperText, ...props }) {
  return (
    <TextField
      label="Enter BILN sequence"
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      variant="outlined"
      size="small"
      fullWidth
      autoComplete="off"
      spellCheck={false}
      error={!!error}
      helperText={helperText}
      multiline
      minRows={1}
      maxRows={6}
      slotProps={{
        inputProps: {
          inputMode: "text",
          pattern: "[A-Za-z0-9\\-\\.\\(\\),\\s]*", // Accepts newlines/spaces for easier pasting
          ...props.inputProps, // Allow further extension if needed
        }
      }}
      {...props}
    />
  );
}

export const InputSearch = ({ value, onChangeValue }) => (
  <div className='p-2 w-2/4 mx-auto'>
    <TextField
      id="outlined-required"
      label="Search monomers"
      fullWidth
      value={value}
      onChange={onChangeValue}
    />
  </div>
);


export function SequenceEditorPanel({ biln, onChangeBiln, hoveredResidueIdx }) {
  const [bilnText, setBilnText] = useState(biln || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setBilnText(biln || '');
  }, [biln]);

  const handleBilnChange = (val) => {
    setError('');
    setBilnText(val);
    onChangeBiln?.(val);
  };

  // // --- DEBUG: fake hovered residue index ---
  // // Simple approach: always highlight residue 0 (first)
  // // const debugHoveredIdx = 0;

  // // Slightly better: cycle through residues with a button
  // const [debugHoveredIdx, setDebugHoveredIdx] = useState(0);
  // const residueCount = useMemo(() => {
  //   if (!biln) return 0;
  //   return biln
  //     .split('.')         // segments
  //     .flatMap(seg => seg ? seg.split('-') : [])
  //     .filter(Boolean).length;
  // }, [biln]);

  // const nextResidue = useCallback(() => {
  //   if (residueCount === 0) return;
  //   setDebugHoveredIdx(i => (i + 1) % residueCount);
  // }, [residueCount]);
  const helper = useMemo(() => (error ? error : ''), [error]);

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
      <Stack spacing={1}>
        <TextField
          label="Enter BILN sequence"
          size="small"
          fullWidth
          value={bilnText}
          onChange={(e) => handleBilnChange(e.target.value)}
          helperText={helper}
          error={!!error}
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