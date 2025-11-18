import { Box, TextField, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function MonomerCrudToolbar({ search, onSearchChange, onCreate }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        size="small"
        fullWidth
        label="Search monomers"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={onCreate}>
        Add
      </Button>
    </Box>
  );
}