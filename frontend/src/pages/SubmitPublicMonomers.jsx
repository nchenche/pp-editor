import { useCallback, useMemo, useState } from 'react';

import { Box, Button, CircularProgress, Paper, TextField, Typography, Alert } from '@mui/material';

import { API_MAIL_URL } from '../config';
import { apiFetch } from '../utils/api';

const MAX_SDF_BYTES = 2 * 1024 * 1024; // aligns with backend default MAIL_MAX_SDF_BYTES

function isValidEmail(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  // Basic email check (backend does authoritative validation)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function SubmitPublicMonomers() {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected';
    const kb = Math.round(file.size / 1024);
    return `${file.name} (${kb} KB)`;
  }, [file]);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && file && file.size > 0 && file.size <= MAX_SDF_BYTES;
  }, [email, file]);

  const onPickFile = useCallback((e) => {
    setError('');
    setSuccess('');

    const f = e.target.files?.[0] || null;
    // allow re-picking same file
    e.target.value = '';

    if (!f) {
      setFile(null);
      return;
    }

    const name = String(f.name || '').toLowerCase();
    const okExt = name.endsWith('.sdf') || name.endsWith('.sd');
    if (!okExt) {
      setFile(null);
      setError('Please provide an SDF file (.sdf or .sd).');
      return;
    }

    if (f.size > MAX_SDF_BYTES) {
      setFile(null);
      setError(`File is too large. Please keep submissions under ${Math.round(MAX_SDF_BYTES / (1024 * 1024))} MB.`);
      return;
    }

    setFile(f);
  }, []);

  const onSubmit = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!file) {
      setError('Please attach an SDF file.');
      return;
    }

    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('from_email', String(email).trim());
      form.append('attach_sdf', 'true');
      form.append('sdf_file', file, file.name);

      const res = await apiFetch(`${API_MAIL_URL}/monomers/submit`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Submission failed (status ${res.status})`;
        throw new Error(String(msg));
      }

      setSuccess('Thanks! Your request has been sent to the maintainers for review.');
      setEmail('');
      setFile(null);
    } catch (e) {
      setError(e?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, file]);

  return (
    <Box sx={{ width: '100%', maxWidth: '60rem', mx: 'auto', px: 2, py: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h5" sx={{ mb: 0.75 }}>
          Submit monomers to the public library
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Use this page to request adding your personal monomers to the public monomer library so everyone can use them.
          We will review the submission before publishing.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              SDF file
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Provide an SDF containing the monomers you want to submit. Maximum size: {Math.round(MAX_SDF_BYTES / (1024 * 1024))} MB.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" component="label" disabled={isSubmitting}>
                Choose file
                <input type="file" hidden accept=".sdf,.sd" onChange={onPickFile} />
              </Button>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {fileLabel}
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Email address
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              We use your email only to reply to your submission. It is not stored in Local Storage.
            </Typography>
            <TextField
              value={email}
              onChange={(e) => {
                setError('');
                setSuccess('');
                setEmail(e.target.value);
              }}
              placeholder="name@domain.org"
              size="small"
              fullWidth
              disabled={isSubmitting}
              error={Boolean(email) && !isValidEmail(email)}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
            >
              Submit request
            </Button>
          </Box>

        </Box>
      </Paper>
    </Box>
  );
}
