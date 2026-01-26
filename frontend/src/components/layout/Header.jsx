import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import EmailIcon from '@mui/icons-material/Email';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import SendIcon from '@mui/icons-material/Send';

import { useSessionLoader, SESSION_LOAD_STATE } from '../../hooks/useSessionLoader';
import {
  getSession,
  getEmailStatus,
  requestEmailAttach,
  requestEmailChange,
  resendEmailAttach,
  resendEmailChange,
  cancelEmailVerification,
  shareSessionByEmail,
  recoverSessionsByEmail,
  formatSessionIdShort,
  normalizeEmail,
} from '../../utils/sessionApi';

/**
 * Header component with automatic session loading and management UI.
 *
 * Session is auto-loaded/created on mount (via useSessionLoader).
 * Shows blocking overlay if session fails to load.
 */
function Header({ children }) {
  const {
    sessionId,
    loadState,
    error: loadError,
    retry,
    createNewSession,
    switchToSession,
  } = useSessionLoader();

  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0); // 0: Share, 1: Recover, 2: Settings

  // Email status state (fetched from /email/status endpoint)
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailStatusLoading, setEmailStatusLoading] = useState(false);

  // Share tab state
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareSessionIdInput, setShareSessionIdInput] = useState('');
  const [shareUseCurrentSession, setShareUseCurrentSession] = useState(true);

  // Recover tab state
  const [recoverMode, setRecoverMode] = useState('session_id'); // 'session_id' | 'current_session' | 'all_sessions'
  const [recoverSessionIdInput, setRecoverSessionIdInput] = useState('');

  // Settings tab state
  const [attachEmailInput, setAttachEmailInput] = useState('');
  const [changeEmailInput, setChangeEmailInput] = useState('');

  const [isWorking, setIsWorking] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Polling for email status when pending verification
  const pollIntervalRef = useRef(null);

  const closeSnackbar = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  // =====================
  // Derived email state
  // =====================
  const hasEmail = !!emailStatus?.email;
  const emailVerified = !!emailStatus?.email_verified;
  const hasPendingVerification = !!emailStatus?.has_pending_verification;
  const pendingKind = emailStatus?.pending_verification?.kind;
  const pendingTargetEmail = emailStatus?.pending_verification?.target_email;

  // =====================
  // Fetch email status
  // =====================
  const fetchEmailStatus = useCallback(async () => {
    if (!sessionId) {
      setEmailStatus(null);
      return;
    }
    setEmailStatusLoading(true);
    try {
      const result = await getEmailStatus(sessionId);
      if (result.ok) {
        setEmailStatus(result.data);
      } else {
        // Fallback to basic session info
        const sessionResult = await getSession(sessionId, { touch: false });
        if (sessionResult.ok) {
          setEmailStatus({
            email: sessionResult.session?.email || null,
            email_verified: sessionResult.session?.email_verified || false,
            has_pending_verification: false,
          });
        } else {
          setEmailStatus(null);
        }
      }
    } catch {
      setEmailStatus(null);
    } finally {
      setEmailStatusLoading(false);
    }
  }, [sessionId]);

  // Fetch email status when sessionId changes
  useEffect(() => {
    fetchEmailStatus();
  }, [fetchEmailStatus]);

  // Poll email status when there's a pending verification
  useEffect(() => {
    if (hasPendingVerification && isSessionDialogOpen) {
      pollIntervalRef.current = setInterval(() => {
        fetchEmailStatus();
      }, 15000); // Poll every 15 seconds
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasPendingVerification, isSessionDialogOpen, fetchEmailStatus]);

  // =====================
  // Dialog open/close
  // =====================
  const openSessionDialog = useCallback((tab = 0) => {
    setDialogTab(tab);
    setShareRecipientEmail('');
    setShareSessionIdInput('');
    setShareUseCurrentSession(true);
    setRecoverMode('session_id');
    setRecoverSessionIdInput('');
    setAttachEmailInput('');
    setChangeEmailInput('');
    setInfoMessage('');
    setErrorMessage('');
    setIsSessionDialogOpen(true);
    fetchEmailStatus(); // Refresh status when opening
  }, [fetchEmailStatus]);

  const closeSessionDialog = useCallback(() => {
    setIsSessionDialogOpen(false);
  }, []);

  // =====================
  // Copy functions
  // =====================
  const copySessionId = useCallback(async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setSnackbar({ open: true, message: 'Session ID copied!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Copy failed.', severity: 'error' });
    }
  }, [sessionId]);

  // =====================
  // Share tab actions
  // =====================
  const handleShareByEmail = useCallback(async () => {
    const email = normalizeEmail(shareRecipientEmail);
    if (!email) {
      setErrorMessage('Recipient email is required.');
      return;
    }

    const idToShare = shareUseCurrentSession ? sessionId : shareSessionIdInput.trim();
    if (!idToShare) {
      setErrorMessage('Session ID is required.');
      return;
    }

    // Validate custom session ID exists (if not using current)
    if (!shareUseCurrentSession) {
      const validateResult = await getSession(idToShare, { touch: false });
      if (!validateResult.ok) {
        setErrorMessage('Session ID not found or expired.');
        return;
      }
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      const result = await shareSessionByEmail(email, idToShare);
      if (result.ok) {
        setInfoMessage('Session ID sent to recipient!');
        setShareRecipientEmail('');
        setShareSessionIdInput('');
      } else {
        setErrorMessage(result.error || 'Failed to share session.');
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to share session.');
    } finally {
      setIsWorking(false);
    }
  }, [shareRecipientEmail, shareUseCurrentSession, sessionId, shareSessionIdInput]);

  // =====================
  // Recover tab actions
  // =====================
  const handleRecover = useCallback(async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      if (recoverMode === 'session_id') {
        // Load a session by ID
        const id = recoverSessionIdInput.trim();
        if (!id) {
          setErrorMessage('Session ID is required.');
          setIsWorking(false);
          return;
        }
        const result = await switchToSession(id);
        if (result.ok) {
          setSnackbar({ open: true, message: 'Session loaded!', severity: 'success' });
          closeSessionDialog();
        } else {
          setErrorMessage(result.error || 'Session not found or expired.');
        }
      } else if (recoverMode === 'current_session') {
        // Send current session ID to the linked email
        if (!hasEmail || !emailVerified) {
          setErrorMessage('You need a verified email linked to this session first.');
          setIsWorking(false);
          return;
        }
        const result = await shareSessionByEmail(emailStatus.email, sessionId);
        if (result.ok) {
          setInfoMessage('Current session ID sent to your email!');
        } else {
          setErrorMessage(result.error || 'Failed to send email.');
        }
      } else if (recoverMode === 'all_sessions') {
        // Recover all sessions linked to the verified email
        if (!hasEmail || !emailVerified) {
          setErrorMessage('You need a verified email linked to this session first.');
          setIsWorking(false);
          return;
        }
        const result = await recoverSessionsByEmail(emailStatus.email);
        if (result.ok) {
          setInfoMessage('Recovery email sent! Check your inbox for all session IDs linked to your email.');
        } else {
          setErrorMessage(result.error || 'Failed to send recovery email.');
        }
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Operation failed.');
    } finally {
      setIsWorking(false);
    }
  }, [recoverMode, recoverSessionIdInput, switchToSession, closeSessionDialog, hasEmail, emailVerified, emailStatus?.email, sessionId]);

  // =====================
  // Settings tab actions (email verification flow)
  // =====================
  const handleAttachEmail = useCallback(async () => {
    const email = normalizeEmail(attachEmailInput);
    if (!email) {
      setErrorMessage('Email is required.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      const result = await requestEmailAttach(sessionId, email);
      if (result.ok) {
        setInfoMessage('Verification email sent! Check your inbox and click the link to verify.');
        setAttachEmailInput('');
        fetchEmailStatus();
      } else if (result.errorCode === 'EMAIL_ALREADY_SET') {
        setErrorMessage('An email is already linked. Use "Change email" instead.');
      } else {
        setErrorMessage(result.error || 'Failed to send verification email.');
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to send verification email.');
    } finally {
      setIsWorking(false);
    }
  }, [sessionId, attachEmailInput, fetchEmailStatus]);

  const handleChangeEmail = useCallback(async () => {
    const email = normalizeEmail(changeEmailInput);
    if (!email) {
      setErrorMessage('New email is required.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      const result = await requestEmailChange(sessionId, email);
      if (result.ok) {
        setInfoMessage('Verification email sent to your CURRENT email. Click the link to approve the change.');
        setChangeEmailInput('');
        fetchEmailStatus();
      } else {
        setErrorMessage(result.error || 'Failed to request email change.');
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to request email change.');
    } finally {
      setIsWorking(false);
    }
  }, [sessionId, changeEmailInput, fetchEmailStatus]);

  const handleResendVerification = useCallback(async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      let result;
      if (pendingKind === 'attach') {
        result = await resendEmailAttach(sessionId);
      } else {
        result = await resendEmailChange(sessionId);
      }

      if (result.ok) {
        setInfoMessage('Verification email resent!');
      } else if (result.errorCode === 'NO_PENDING_REQUEST') {
        setErrorMessage('No pending verification found. It may have expired.');
        fetchEmailStatus();
      } else {
        setErrorMessage(result.error || 'Failed to resend email.');
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to resend email.');
    } finally {
      setIsWorking(false);
    }
  }, [sessionId, pendingKind, fetchEmailStatus]);

  const handleCancelVerification = useCallback(async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      const result = await cancelEmailVerification(sessionId);
      if (result.ok) {
        setInfoMessage('Verification cancelled.');
        fetchEmailStatus();
      } else {
        setErrorMessage(result.error || 'Failed to cancel verification.');
      }
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to cancel verification.');
    } finally {
      setIsWorking(false);
    }
  }, [sessionId, fetchEmailStatus]);

  const handleResendOrRestartAttachVerification = useCallback(async () => {
    if (!sessionId) return;

    const currentEmail = emailStatus?.email;
    if (!currentEmail) {
      setErrorMessage('No email is linked to this session.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      // Prefer resend (if a pending request exists)
      const resendResult = await resendEmailAttach(sessionId);
      if (resendResult.ok) {
        setInfoMessage('Verification email resent. Please check your inbox.');
        fetchEmailStatus();
        return;
      }

      // If no pending request exists, try to restart the attach flow.
      if (resendResult.errorCode === 'NO_PENDING_REQUEST') {
        const restartResult = await requestEmailAttach(sessionId, currentEmail);
        if (restartResult.ok) {
          setInfoMessage('Verification email sent again. Please check your inbox.');
          fetchEmailStatus();
          return;
        }

        setErrorMessage(
          restartResult.error ||
          'Unable to restart verification. If this keeps happening, try cancelling pending verification (if any) and re-link your email.'
        );
        return;
      }

      setErrorMessage(resendResult.error || 'Failed to resend verification email.');
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to resend verification email.');
    } finally {
      setIsWorking(false);
    }
  }, [emailStatus?.email, fetchEmailStatus, sessionId]);

  const handleStartNewSession = useCallback(async () => {
    if (!window.confirm(
      'Start a new session?\n\n' +
      'Your current session data (monomers, jobs) will no longer be accessible unless you save your current session ID.\n\n' +
      'Tip: click the session ID chip (top-right) to copy it, or use Recover → “Email me this session ID” (requires verified email).'
    )) {
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsWorking(true);

    try {
      await createNewSession();
      setSnackbar({ open: true, message: 'New session created!', severity: 'success' });
      closeSessionDialog();
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to create new session.');
    } finally {
      setIsWorking(false);
    }
  }, [createNewSession, closeSessionDialog]);

  // =====================
  // Derived display values
  // =====================
  const shortSessionId = useMemo(() => formatSessionIdShort(sessionId), [sessionId]);

  const isLoading = loadState === SESSION_LOAD_STATE.LOADING;
  const hasError = loadState === SESSION_LOAD_STATE.ERROR;

  // Email status display
  const emailStatusDisplay = useMemo(() => {
    if (emailStatusLoading) return { text: 'Loading...', color: 'rgba(226, 232, 240, 0.7)' };
    if (!hasEmail) return { text: 'No email linked', color: 'rgba(226, 232, 240, 0.7)' };
    if (hasPendingVerification) return { text: `Pending: ${pendingTargetEmail || emailStatus?.email}`, color: 'warning.light' };
    if (emailVerified) return { text: `✓ ${emailStatus?.email}`, color: 'success.light' };
    return { text: `${emailStatus?.email} (unverified)`, color: 'warning.light' };
  }, [emailStatusLoading, hasEmail, hasPendingVerification, emailVerified, emailStatus?.email, pendingTargetEmail]);

  // Pending verification message
  const pendingVerificationMessage = useMemo(() => {
    if (!hasPendingVerification) return null;
    if (pendingKind === 'attach') {
      return `Verification email sent to ${pendingTargetEmail}. Click the link in your email to verify.`;
    }
    if (pendingKind === 'change_current') {
      return `Check your CURRENT email (${emailStatus?.email}) to approve the change to ${pendingTargetEmail}.`;
    }
    if (pendingKind === 'change_new') {
      return `Check your NEW email (${pendingTargetEmail}) to complete the change.`;
    }
    return 'Verification pending. Check your email.';
  }, [hasPendingVerification, pendingKind, pendingTargetEmail, emailStatus?.email]);

  // =====================
  // Render
  // =====================

  return (
    <>
      <header className="bg-slate-800 p-4 min-h-28">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ width: 120 }} />

          <h1 className="text-white text-2xl text-center flex-1">PEP-EDIT</h1>

          <Box sx={{ width: 380, display: 'flex', justifyContent: 'flex-end' }}>
            <Stack spacing={0.5} alignItems="flex-end">
              {isLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} sx={{ color: 'common.white' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(226, 232, 240, 0.85)' }}>
                    Loading session…
                  </Typography>
                </Stack>
              ) : sessionId ? (
                <>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                    <Tooltip title="Start a new session">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleStartNewSession}
                          aria-label="Start new session"
                          sx={{
                            color: 'common.white',
                            border: '1px solid rgba(148, 163, 184, 0.5)',
                            borderRadius: 1,
                            p: 0.5,
                            '&:hover': { borderColor: 'rgba(148, 163, 184, 0.8)' },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(148, 163, 184, 0.4)', mx: 0.5 }} />

                    <Tooltip title="Share session">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openSessionDialog(0)}
                          aria-label="Share session"
                          sx={{ color: 'common.white' }}
                        >
                          <ShareIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Recover a session">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openSessionDialog(1)}
                          aria-label="Recover session"
                          sx={{ color: 'common.white' }}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Email & settings">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openSessionDialog(2)}
                          aria-label="Session settings"
                          sx={{ color: 'common.white' }}
                        >
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(148, 163, 184, 0.4)', mx: 0.5 }} />

                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="caption">Click to copy full ID</Typography>
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {sessionId}
                          </Typography>
                        </Box>
                      }
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<ContentCopyIcon sx={{ fontSize: '0.875rem !important' }} />}
                        label={shortSessionId}
                        onClick={copySessionId}
                        sx={{
                          color: 'common.white',
                          borderColor: 'rgba(148, 163, 184, 0.5)',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          '& .MuiChip-label': { px: 1.25 },
                          '& .MuiChip-icon': { color: 'inherit' },
                          '&:hover': { borderColor: 'rgba(148, 163, 184, 0.8)' },
                        }}
                      />
                    </Tooltip>
                  </Stack>

                  <Typography
                    variant="caption"
                    sx={{
                      color: emailStatusDisplay.color,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {emailStatusDisplay.text}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'error.light' }}>
                  No session
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>

        <div className="mt-3">
          {children}
        </div>

        {/* Session Management Dialog */}
        <Dialog open={isSessionDialogOpen} onClose={closeSessionDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Session Management</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Current session status */}
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Current session:</Typography>
                {sessionId ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={shortSessionId}
                    color="success"
                    sx={{ fontFamily: 'monospace' }}
                  />
                ) : (
                  <Chip size="small" variant="outlined" label="None" color="error" />
                )}
              </Stack>

              <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} variant="fullWidth">
                <Tab label="Share" icon={<ShareIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Recover" icon={<RefreshIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Email" icon={<EmailIcon fontSize="small" />} iconPosition="start" />
              </Tabs>

              {/* ==================== SHARE TAB ==================== */}
              {dialogTab === 0 && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary">
                    Send a session ID by email. The recipient will be able to load and collaborate on the session.
                  </Typography>

                  <TextField
                    size="small"
                    label="Recipient email"
                    type="email"
                    value={shareRecipientEmail}
                    onChange={(e) => setShareRecipientEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    autoComplete="off"
                    fullWidth
                  />

                  <FormControl component="fieldset">
                    <RadioGroup
                      value={shareUseCurrentSession ? 'current' : 'custom'}
                      onChange={(e) => setShareUseCurrentSession(e.target.value === 'current')}
                    >
                      <FormControlLabel
                        value="current"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            Share current session <Typography component="span" variant="caption" color="text.secondary">({shortSessionId})</Typography>
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="custom"
                        control={<Radio size="small" />}
                        label={<Typography variant="body2">Share a different session ID</Typography>}
                      />
                    </RadioGroup>
                  </FormControl>

                  {!shareUseCurrentSession && (
                    <TextField
                      size="small"
                      label="Session ID to share"
                      value={shareSessionIdInput}
                      onChange={(e) => setShareSessionIdInput(e.target.value)}
                      placeholder="pep-..."
                      autoComplete="off"
                      slotProps={{ htmlInput: { spellCheck: 'false' } }}
                      fullWidth
                    />
                  )}

                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleShareByEmail}
                    disabled={!shareRecipientEmail.trim() || (!shareUseCurrentSession && !shareSessionIdInput.trim()) || isWorking}
                  >
                    {isWorking ? 'Sending…' : 'Send by Email'}
                  </Button>
                </Stack>
              )}

              {/* ==================== RECOVER TAB ==================== */}
              {dialogTab === 1 && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary">
                    Load a session or recover session IDs linked to your verified email.
                  </Typography>

                  <FormControl component="fieldset">
                    <RadioGroup
                      value={recoverMode}
                      onChange={(e) => setRecoverMode(e.target.value)}
                    >
                      <FormControlLabel
                        value="session_id"
                        control={<Radio size="small" />}
                        label={<Typography variant="body2">Load a session by ID</Typography>}
                      />
                      <FormControlLabel
                        value="current_session"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            Email this session ID to{' '}
                            {hasEmail && emailVerified ? (
                              <strong>{emailStatus?.email}</strong>
                            ) : (
                              <Typography component="span" variant="body2" color="text.secondary">(no verified email)</Typography>
                            )}
                          </Typography>
                        }
                        disabled={!hasEmail || !emailVerified}
                      />
                      <FormControlLabel
                        value="all_sessions"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            Email all session IDs associated with{' '}
                            {hasEmail && emailVerified ? (
                              <strong>{emailStatus?.email}</strong>
                            ) : (
                              <Typography component="span" variant="body2" color="text.secondary">(no verified email)</Typography>
                            )}
                          </Typography>
                        }
                        disabled={!hasEmail || !emailVerified}
                      />
                    </RadioGroup>
                  </FormControl>

                  {recoverMode === 'session_id' && (
                    <TextField
                      size="small"
                      label="Session ID"
                      value={recoverSessionIdInput}
                      onChange={(e) => setRecoverSessionIdInput(e.target.value)}
                      placeholder="pep-..."
                      autoComplete="off"
                      slotProps={{ htmlInput: { spellCheck: 'false' } }}
                      fullWidth
                    />
                  )}

                  {(recoverMode === 'current_session' || recoverMode === 'all_sessions') && (
                    <>
                      {!hasEmail || !emailVerified ? (
                        <Alert severity="info">
                          To use this option, you need to link and verify an email first (see Email tab).
                        </Alert>
                      ) : (
                        <Alert severity="info" icon={<VerifiedIcon fontSize="small" />}>
                          {recoverMode === 'current_session'
                            ? 'This session ID will be sent to your verified email.'
                            : 'All session IDs linked to your verified email will be sent.'}
                        </Alert>
                      )}
                    </>
                  )}

                  <Button
                    variant="contained"
                    onClick={handleRecover}
                    disabled={
                      isWorking ||
                      (recoverMode === 'session_id' && !recoverSessionIdInput.trim()) ||
                      (recoverMode === 'current_session' && (!hasEmail || !emailVerified)) ||
                      (recoverMode === 'all_sessions' && (!hasEmail || !emailVerified))
                    }
                  >
                    {isWorking ? 'Processing…' : recoverMode === 'session_id' ? 'Load Session' : 'Send Email'}
                  </Button>
                </Stack>
              )}

              {/* ==================== EMAIL/SETTINGS TAB ==================== */}
              {dialogTab === 2 && (
                <Stack spacing={2.5}>
                  {/* Current email status */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Email status</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {hasEmail ? (
                        <>
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={emailVerified ? <VerifiedIcon fontSize="small" /> : <PendingIcon fontSize="small" />}
                            label={emailStatus?.email}
                            color={emailVerified ? 'success' : 'warning'}
                          />
                          {emailVerified && (
                            <Typography variant="caption" color="success.main">Verified</Typography>
                          )}
                          {!emailVerified && !hasPendingVerification && (
                            <Typography variant="caption" color="warning.main">Unverified</Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No email linked to this session.</Typography>
                      )}
                    </Stack>
                  </Box>

                  {/* Pending verification banner */}
                  {hasPendingVerification && (
                    <Alert
                      severity="info"
                      icon={<PendingIcon />}
                      action={
                        <Stack direction="row" spacing={1}>
                          <Button color="inherit" size="small" onClick={handleResendVerification} disabled={isWorking}>
                            Resend
                          </Button>
                          <Button color="inherit" size="small" onClick={handleCancelVerification} disabled={isWorking}>
                            Cancel
                          </Button>
                        </Stack>
                      }
                    >
                      {pendingVerificationMessage}
                    </Alert>
                  )}

                  <Divider />

                  {/* Attach email (only when no email) */}
                  {!hasEmail && !hasPendingVerification && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Link email for recovery</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Link an email to recover this session later. You'll receive a verification email.
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          label="Email address"
                          type="email"
                          value={attachEmailInput}
                          onChange={(e) => setAttachEmailInput(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          startIcon={<EmailIcon />}
                          onClick={handleAttachEmail}
                          disabled={!attachEmailInput.trim() || isWorking}
                        >
                          {isWorking ? 'Sending…' : 'Send Verification Email'}
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  {/* Change email (only when email is verified) */}
                  {hasEmail && emailVerified && !hasPendingVerification && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Change email</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        To change your email, you'll need to verify via your current email first, then verify the new one.
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          size="small"
                          label="New email address"
                          type="email"
                          value={changeEmailInput}
                          onChange={(e) => setChangeEmailInput(e.target.value)}
                          placeholder="newemail@example.com"
                          autoComplete="email"
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          startIcon={<EmailIcon />}
                          onClick={handleChangeEmail}
                          disabled={!changeEmailInput.trim() || isWorking}
                        >
                          {isWorking ? 'Sending…' : 'Request Email Change'}
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  {/* Info when email exists but not verified and no pending */}
                  {hasEmail && !emailVerified && !hasPendingVerification && (
                    <Alert
                      severity="warning"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={handleResendOrRestartAttachVerification}
                          disabled={isWorking}
                        >
                          Resend
                        </Button>
                      }
                    >
                      Your email is linked but not verified. If you didn’t receive the email, resend the verification.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* Messages */}
              {infoMessage && (
                <Alert severity="success">{infoMessage}</Alert>
              )}
              {errorMessage && (
                <Alert severity="error">{errorMessage}</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleStartNewSession}
              variant="outlined"
              color="warning"
              startIcon={<AddIcon />}
              disabled={isWorking}
            >
              Start new session
            </Button>
            <Button onClick={closeSessionDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for quick feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2500}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </header>

      {/* Blocking overlay if session failed to load */}
      <Backdrop
        open={hasError}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          color: '#fff',
          flexDirection: 'column',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ maxWidth: 400, textAlign: 'center', p: 3 }}>
          <Typography variant="h5">Session Error</Typography>
          <Alert severity="error" sx={{ width: '100%' }}>
            {loadError || 'Failed to load or create a session.'}
          </Alert>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={retry}>
              Retry
            </Button>
            <Button variant="outlined" onClick={createNewSession}>
              Create New Session
            </Button>
          </Stack>
        </Stack>
      </Backdrop>
    </>
  );
}

export default Header;
