import React, { useEffect, useMemo, useState } from 'react';
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


export function SequenceEditorPanel({ biln, onChangeBiln }) {
  const [bilnText, setBilnText] = useState(biln || '');
  const [error, setError] = useState('');

  // Keep local text in sync when biln prop changes externally
  useEffect(() => {
    setBilnText(biln || '');
  }, [biln]);


  const handleBilnChange = (val) => {
    setError('');
    setBilnText(val);
    // push raw edit upstream (you can debounce upstream if needed)
    onChangeBiln?.(val);
  };


  const handleClean = () => {
    console.log('Cleaning BILN input');
  };

  const handleClear = () => {
    setError('');
    setBilnText('');
    onChangeBiln?.('');
  };

  const helper = useMemo(() => (error ? error : 'Enter BILN (use - between residues and . between sequences)'), [error]);

  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
      <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', pr: 1 }}>
            <Typography fontWeight={700} fontSize={13} sx={{ flex: 1 }}>
              Expert sequence editor
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
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
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<CleaningServicesIcon />} onClick={handleClean}>
                Clean
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<ClearIcon />} onClick={handleClear}>
                Clear
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}