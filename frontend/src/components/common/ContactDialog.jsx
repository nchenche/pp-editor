import { useCallback, useState, useEffect } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';

import { submitContactMessage } from '../../utils/contactApi';

const CATEGORIES = [
  { value: 'suggestion', label: 'Suggestion', description: 'Suggest a new feature or improvement' },
  { value: 'bug', label: 'Bug report', description: 'Report a bug or unexpected behavior' },
  { value: 'other', label: 'Other', description: 'Any other topic' },
];

const MAX_MESSAGE_LENGTH = 5000;

/**
 * Contact support dialog with category, message, and email fields.
 *
 * @param {{ open: boolean, onClose: () => void, sessionId?: string, defaultEmail?: string }} props
 */
export default function ContactDialog({ open, onClose, sessionId, defaultEmail }) {
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok, message } | null

  // Pre-fill email from session when dialog opens
  useEffect(() => {
    if (open) {
      if (defaultEmail && !email) {
        setEmail(defaultEmail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultEmail]);

  const resetForm = useCallback(() => {
    setCategory('suggestion');
    setMessage('');
    setEmail('');
    setResult(null);
    setSending(false);
  }, []);

  const handleClose = useCallback(() => {
    if (sending) return; // prevent closing while sending
    onClose();
    // Reset form after the closing animation
    setTimeout(resetForm, 200);
  }, [sending, onClose, resetForm]);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const canSubmit = category && message.trim().length > 0 && message.length <= MAX_MESSAGE_LENGTH && isValidEmail(email);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || sending) return;
    setSending(true);
    setResult(null);

    try {
      const res = await submitContactMessage({
        category,
        message: message.trim(),
        email: email.trim(),
        session_id: sessionId || undefined,
      });
      setResult(res);
      if (res.ok) {
        // Clear form fields on success (keep dialog open to show success message)
        setCategory('suggestion');
        setMessage('');
        // Keep email for convenience
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please check your connection and try again.' });
    } finally {
      setSending(false);
    }
  }, [canSubmit, sending, category, message, email, sessionId]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Contact us</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Have a suggestion, found a bug, or need help? Send us a message and we'll get back to you.
          </Typography>

          {/* Category select */}
          <TextField
            select
            label="Subject"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            size="small"
            fullWidth
            disabled={sending}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                <Stack>
                  <Typography variant="body2">{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.description}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>

          {/* Message */}
          <TextField
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Describe your suggestion, issue, or question…"
            multiline
            minRows={4}
            maxRows={10}
            fullWidth
            disabled={sending}
            helperText={`${message.length} / ${MAX_MESSAGE_LENGTH}`}
            slotProps={{
              htmlInput: { maxLength: MAX_MESSAGE_LENGTH },
              formHelperText: {
                sx: { textAlign: 'right' },
              },
            }}
          />

          {/* Email */}
          <TextField
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            size="small"
            fullWidth
            disabled={sending}
            helperText="So we can get back to you"
            error={email.length > 0 && !isValidEmail(email)}
          />

          {/* Result feedback */}
          {result && (
            <Alert severity={result.ok ? 'success' : 'error'}>
              {result.message}
              {result.errors?.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>
          {result?.ok ? 'Close' : 'Cancel'}
        </Button>
        {!result?.ok && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit || sending}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
