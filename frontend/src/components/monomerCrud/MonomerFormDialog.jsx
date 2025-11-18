import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';

export default function MonomerFormDialog({ open, monomer, onClose, onSubmit }) {
  const isEdit = Boolean(monomer);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    if (!open) return;
    setSymbol(monomer?.symbol || '');
    setName(monomer?.name || '');
    setType(monomer?.type || '');
  }, [open, monomer]);

  const handleSubmit = () => {
    onSubmit?.({
      ...(monomer || {}),
      symbol: symbol.trim(),
      name: name.trim(),
      type: type.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit monomer' : 'Add monomer'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Symbol" size="small" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <TextField label="Name" size="small" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Type" size="small" value={type} onChange={(e) => setType(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Cancel</Button>
        <Button onClick={handleSubmit} size="small" variant="contained">
          {isEdit ? 'Save changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}