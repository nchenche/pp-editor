import { useCallback, useMemo, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useOwnerId } from '../../hooks/useOwnerId';
import { clearOwnerIdFromStorage, setOwnerIdInStorage } from '../../utils/api';

function Header( {children} ) {
  const ownerId = useOwnerId();
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
  const [ownerIdInput, setOwnerIdInput] = useState('');

  const normalizedInput = useMemo(() => {
    const v = String(ownerIdInput ?? '').trim();
    return v;
  }, [ownerIdInput]);

  const openOwnerDialog = useCallback(() => {
    setOwnerIdInput(ownerId || '');
    setIsOwnerDialogOpen(true);
  }, [ownerId]);

  const closeOwnerDialog = useCallback(() => {
    setIsOwnerDialogOpen(false);
  }, []);

  const generateOwnerId = useCallback(() => {
    // Short, copyable, low-collision id (no PII). Example: pp_7f3a9c2b4e1d
    const bytes = new Uint8Array(6);
    if (window?.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    setOwnerIdInput(`pp_${hex}`);
  }, []);

  const connectOwner = useCallback(() => {
    if (!normalizedInput) return;
    setOwnerIdInStorage(normalizedInput);
    closeOwnerDialog();
  }, [closeOwnerDialog, normalizedInput]);

  const disconnectOwner = useCallback(() => {
    clearOwnerIdFromStorage();
    setOwnerIdInput('');
  }, []);

  return (
    <>
      <header className="bg-slate-800 p-4 min-h-28">
        <div className="flex items-center justify-between">
          <div className="w-24" />
          <h1 className="text-white text-2xl text-center flex-1">PEP-EDIT</h1>
          <div className="w-24 flex justify-end">
            <button
              type="button"
              onClick={openOwnerDialog}
              className="text-white text-sm px-3 py-1 rounded border border-slate-500 hover:border-slate-300"
              aria-label="Owner ID"
              title={ownerId ? `Connected: ${ownerId}` : 'Public (not connected)'}
            >
              Owner ID
            </button>
          </div>
        </div>

        <div className="mt-3">
          {children}
        </div>

        <Dialog open={isOwnerDialogOpen} onClose={closeOwnerDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Owner ID</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="body2">
                  Status
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={ownerId ? `Connected: ${ownerId}` : 'Public (not connected)'}
                />
              </Stack>

              <TextField
                size="small"
                label="Owner ID"
                value={ownerIdInput}
                onChange={(e) => setOwnerIdInput(e.target.value)}
                placeholder="Enter an existing ID or generate a new one"
                autoComplete="off"
                inputProps={{ spellCheck: 'false' }}
                helperText={
                  'This ID is stored in your browser (localStorage). Keep a copy: clearing site data or switching browsers will lose it.'
                }
              />

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={generateOwnerId}>Generate</Button>
                <Button variant="contained" onClick={connectOwner} disabled={!normalizedInput}>
                  Connect
                </Button>
                <Button variant="outlined" onClick={disconnectOwner} disabled={!ownerId}>
                  Disconnect
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeOwnerDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </header>
    </>
  );
}

export default Header;