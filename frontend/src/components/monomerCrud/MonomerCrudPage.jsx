import { useState, useMemo } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import MonomerCrudToolbar from './MonomerCrudToolbar';
import MonomerTable from './MonomerTable';
import MonomerFormDialog from './MonomerFormDialog';

const MOCK = [
  { id: 'A', symbol: 'A', name: 'Alanine', type: 'amino-acid' },
  { id: 'R', symbol: 'R', name: 'Arginine', type: 'amino-acid' },
  { id: 'Pra', symbol: 'Pra', name: 'Propargylglycine', type: 'building-block' },
];

export default function MonomerCrudPage() {
  const [search, setSearch] = useState('');
  const [monomers] = useState(MOCK);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monomers;
    return monomers.filter((m) =>
      [m.symbol, m.name, m.type].some((f) => (f || '').toLowerCase().includes(q))
    );
  }, [search, monomers]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (mono) => {
    setEditing(mono);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.5px' }}>
            MONOMER ADMIN
          </Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />

        <MonomerCrudToolbar search={search} onSearchChange={setSearch} onCreate={handleCreate} />

        <Box sx={{ mt: 1, flex: 1, minHeight: 0 }}>
          <MonomerTable monomers={filtered} onEdit={handleEdit} onDelete={(m) => console.log('delete', m)} />
        </Box>

        <MonomerFormDialog
          open={dialogOpen}
          monomer={editing}
          onClose={handleClose}
          onSubmit={(payload) => {
            console.log('submit', payload);
            handleClose();
          }}
        />
      </Paper>
    </Box>
  );
}