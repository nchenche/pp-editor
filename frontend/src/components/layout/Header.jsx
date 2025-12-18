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
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { API_BASE_URL } from '../../config';

import { useOwnerId } from '../../hooks/useOwnerId';
import { clearOwnerIdFromStorage, setOwnerIdInStorage } from '../../utils/api';

function Header( {children} ) {
  const ownerId = useOwnerId();
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);
  const [ownerDialogMode, setOwnerDialogMode] = useState(null); // 'load' | 'create' | null

  // Load flow state
  const [loadOwnerIdInput, setLoadOwnerIdInput] = useState('');

  // Create flow state (no manual typing)
  const [createdOwnerId, setCreatedOwnerId] = useState('');

  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const closeSnackbar = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  const normalizedLoadInput = useMemo(() => {
    const v = String(loadOwnerIdInput ?? '').trim();
    return v;
  }, [loadOwnerIdInput]);

  const openLoadDialog = useCallback(() => {
    setOwnerDialogMode('load');
    setLoadOwnerIdInput(ownerId || '');
    setCreatedOwnerId('');
    setErrorMessage('');
    setInfoMessage('');
    setIsOwnerDialogOpen(true);
  }, [ownerId]);

  const openCreateDialog = useCallback(() => {
    setOwnerDialogMode('create');
    setLoadOwnerIdInput('');
    setCreatedOwnerId('');
    setErrorMessage('');
    setInfoMessage('');
    setCopyMessage('');
    setIsOwnerDialogOpen(true);
  }, []);

  const generateLocalOwnerId = useCallback(() => {
    // Client-side generation for confidentiality; short pep-* id.
    // Example: pep-7f3a9c2b
    setErrorMessage('');
    setInfoMessage('');
    setCopyMessage('');

    const bytes = new Uint8Array(16);
    if (window?.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    setCreatedOwnerId(`pep-${hex}`);
  }, []);

  const closeOwnerDialog = useCallback(() => {
    setIsOwnerDialogOpen(false);
    setOwnerDialogMode(null);
  }, []);

  const createOwnerIdOnServer = useCallback(async () => {
    setErrorMessage('');
    setInfoMessage('');
    setCopyMessage('');
    setIsWorking(true);
    try {
      const candidate = String(createdOwnerId || '').trim();
      if (!candidate) {
        setErrorMessage('Click Generate first to create a new Owner ID.');
        return;
      }

      const body = { db_name: 'pepedit', owner_id: candidate, auto_generate: false };

      const res = await fetch(`${API_BASE_URL}/api/db/owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to create owner id (status ${res.status})`;
        setErrorMessage(String(msg));
        return;
      }

      const serverOwnerId = json?.owner_id || json?.data?.owner_id;
      if (!serverOwnerId) {
        setErrorMessage('Server did not return an owner_id.');
        return;
      }

      // Keep the displayed id stable. If server returns something else, show it.
      setCreatedOwnerId(String(serverOwnerId));
      setInfoMessage('Created on server. Please copy/save this Owner ID somewhere safe.');

      // Auto-connect after successful creation (no extra button in this flow).
      setOwnerIdInStorage(String(serverOwnerId));
      closeOwnerDialog();
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to create owner id.');
    } finally {
      setIsWorking(false);
    }
  }, [closeOwnerDialog, createdOwnerId]);

  const copyCreatedOwnerId = useCallback(async () => {
    if (!createdOwnerId) return;
    setCopyMessage('');
    try {
      await navigator.clipboard.writeText(createdOwnerId);
      setCopyMessage('Copied to clipboard.');
    } catch {
      setCopyMessage('Copy failed.');
    }
  }, [createdOwnerId]);

  const copyConnectedOwnerId = useCallback(async () => {
    if (!ownerId) return;
    try {
      await navigator.clipboard.writeText(ownerId);
      setSnackbar({ open: true, message: 'Owner ID copied to clipboard.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Copy failed.', severity: 'error' });
    }
  }, [ownerId]);

  const checkOwnerExists = useCallback(async (candidateId) => {
    const id = String(candidateId || '').trim();
    if (!id) return { ok: false, message: 'Owner ID is empty.' };

    // Validate via backend existence endpoint.
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/db/owners/${encodeURIComponent(id)}/exists?db_name=pepedit`,
        { method: 'GET' },
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.message || json?.error || `Could not validate Owner ID (status ${res.status}).`;
        return { ok: false, message: String(msg) };
      }

      const exists = Boolean(json?.data?.exists);
      if (!exists) return { ok: false, message: 'This Owner ID does not exist. Click Create first.' };
      return { ok: true };
    } catch {
      return { ok: false, message: 'Could not reach server to validate Owner ID. Click Create first.' };
    }
  }, []);

  const connectLabel = useMemo(() => {
    if (!ownerId) return 'Connect';
    if (normalizedLoadInput && normalizedLoadInput !== ownerId) return 'Switch';
    return 'Connected';
  }, [normalizedLoadInput, ownerId]);

  const connectLoadedOwner = useCallback(() => {
    if (!normalizedLoadInput) return;

    (async () => {
      setErrorMessage('');
      setInfoMessage('');
      setIsWorking(true);
      try {
        if (ownerId && normalizedLoadInput === ownerId) {
          closeOwnerDialog();
          return;
        }

        const exists = await checkOwnerExists(normalizedLoadInput);
        if (!exists.ok) {
          setErrorMessage(exists.message || 'Owner ID does not exist.');
          return;
        }

        setOwnerIdInStorage(normalizedLoadInput);
        closeOwnerDialog();
      } finally {
        setIsWorking(false);
      }
    })();
  }, [checkOwnerExists, closeOwnerDialog, normalizedLoadInput, ownerId]);

  const connectCreatedOwner = useCallback(() => {
    if (!createdOwnerId) return;
    setOwnerIdInStorage(createdOwnerId);
    closeOwnerDialog();
  }, [closeOwnerDialog, createdOwnerId]);

  const disconnectOwner = useCallback(() => {
    clearOwnerIdFromStorage();
    setLoadOwnerIdInput('');
    setCreatedOwnerId('');
  }, []);

  return (
    <>
      <header className="bg-slate-800 p-4 min-h-28">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ width: 120 }} />

          <h1 className="text-white text-2xl text-center flex-1">PEP-EDIT</h1>

          <Box sx={{ width: 240, display: 'flex', justifyContent: 'flex-end' }}>
            <Stack spacing={0.5} alignItems="flex-end">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                {ownerId ? (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={disconnectOwner}
                      aria-label="Disconnect Owner ID"
                      title="Disconnect"
                      sx={{
                        color: 'common.white',
                        borderColor: 'rgba(148, 163, 184, 0.6)',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                      }}
                    >
                      Disconnect
                    </Button>

                    <Tooltip
                      title={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2">Copy connected Owner ID</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>{ownerId}</Typography>
                        </Box>
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          onClick={copyConnectedOwnerId}
                          aria-label="Copy connected Owner ID"
                          sx={{ color: 'common.white' }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={openLoadDialog}
                      aria-label="Load Owner ID"
                      title="Load an existing Owner ID"
                      sx={{
                        color: 'common.white',
                        borderColor: 'rgba(148, 163, 184, 0.6)',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                      }}
                    >
                      Load ID
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={openCreateDialog}
                      aria-label="Create Owner ID"
                      title="Create a new Owner ID"
                      sx={{
                        color: 'common.white',
                        borderColor: 'rgba(148, 163, 184, 0.6)',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                      }}
                    >
                      Create ID
                    </Button>
                  </>
                )}
              </Stack>

              <Typography
                variant="caption"
                sx={{
                  color: ownerId ? 'success.light' : 'rgba(226, 232, 240, 0.85)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {ownerId ? 'Connected' : 'Public'}
              </Typography>
            </Stack>
          </Box>
        </Box>

        <div className="mt-3">
          {children}
        </div>

        <Dialog open={isOwnerDialogOpen} onClose={closeOwnerDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {ownerDialogMode === 'create' ? 'Create Owner ID' : 'Load Owner ID'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                An Owner ID lets you create and use your personal monomers, in combination with the default public monomer list.
              </Typography>

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

              {ownerDialogMode === 'load' ? (
                <TextField
                  size="small"
                  label="Owner ID"
                  value={loadOwnerIdInput}
                  onChange={(e) => setLoadOwnerIdInput(e.target.value)}
                  placeholder="Paste an existing Owner ID"
                  autoComplete="off"
                  slotProps={{ htmlInput: { spellCheck: 'false' } }}
                  helperText="Connect is only allowed if the ID already exists on the server."
                />
              ) : (
                <TextField
                  size="small"
                  label="New Owner ID"
                  value={createdOwnerId}
                  placeholder="Click Generate to create a pep-… Owner ID"
                  autoComplete="off"
                  slotProps={{ htmlInput: { readOnly: true } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={createdOwnerId ? 'Copy' : 'Nothing to copy'}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={copyCreatedOwnerId}
                              disabled={!createdOwnerId}
                              aria-label="Copy owner id"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Generate creates a local pep-… ID. Create stores it on the server and connects this browser to it."
                />
              )}

              {infoMessage ? (
                <Typography variant="body2">
                  {infoMessage}
                </Typography>
              ) : null}

              {copyMessage ? (
                <Typography variant="body2">
                  {copyMessage}
                </Typography>
              ) : null}

              {errorMessage ? (
                <Typography variant="body2" color="error">
                  {errorMessage}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1}>
                {ownerDialogMode === 'create' ? (
                  <>
                    <Button variant="outlined" onClick={generateLocalOwnerId} disabled={isWorking}>
                      Generate
                    </Button>
                    <Button variant="contained" onClick={createOwnerIdOnServer} disabled={!createdOwnerId || isWorking}>
                      {isWorking ? 'Creating…' : 'Create'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    onClick={connectLoadedOwner}
                    disabled={!normalizedLoadInput || isWorking}
                  >
                    {connectLabel}
                  </Button>
                )}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeOwnerDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={2200}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </header>
    </>
  );
}

export default Header;