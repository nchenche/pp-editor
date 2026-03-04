import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';

import { useSessionLoader, SESSION_LOAD_STATE } from '../../hooks/useSessionLoader';
import { useShellTheme } from '../../theme/ShellThemeProvider';
import {
  getSession,
  getEmailStatus,
  patchSession,
  requestEmailAttach,
  requestEmailChange,
  resendEmailAttach,
  resendEmailChange,
  cancelEmailVerification,
  shareSessionByEmail,
  recoverSessionsByEmail,
  formatSessionIdShort,
  normalizeEmail,
  getLocalSessionMeta,
  setLocalSessionMeta,
} from '../../utils/sessionApi';
import { InlineSessionNameEditor } from './InlineSessionNameEditor';
import ContactDialog from '../common/ContactDialog';

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
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);

  // Email status state (fetched from /email/status endpoint)
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailStatusLoading, setEmailStatusLoading] = useState(false);

  // Session name/description state (persisted to localStorage)
  const [sessionName, setSessionName] = useState(null);
  const [sessionDescription, setSessionDescription] = useState(null);
  const [sessionNameSaving, setSessionNameSaving] = useState(false);

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

  // Responsive breakpoints
  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up(1024));   // full layout
  const isMd = useMediaQuery(theme.breakpoints.up(768));    // compact session widget
  // below 768 → nav wraps to second row

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
      setSessionName(null);
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
          // Also grab session name if available
          if (sessionResult.session?.name !== undefined) {
            setSessionName(sessionResult.session.name);
          }
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

  // Fetch session name/description when sessionId changes
  // Server is source of truth; localStorage is cache for faster initial load
  const fetchSessionMeta = useCallback(async () => {
    if (!sessionId) {
      setSessionName(null);
      setSessionDescription(null);
      return;
    }
    // Load from localStorage first for immediate UI (cache)
    const localMeta = getLocalSessionMeta(sessionId);
    if (localMeta) {
      setSessionName(localMeta.name);
      setSessionDescription(localMeta.description);
    }
    // Then fetch from server (source of truth)
    try {
      const result = await getSession(sessionId, { touch: false });
      if (result.ok && result.session) {
        // Server is source of truth - always use server values
        const serverName = result.session.name ?? null;
        const serverDesc = result.session.description ?? null;
        setSessionName(serverName);
        setSessionDescription(serverDesc);
        // Cache to localStorage for next load
        setLocalSessionMeta(sessionId, { name: serverName, description: serverDesc });
      }
    } catch {
      // Network error - localStorage values remain as fallback
    }
  }, [sessionId]);

  // Fetch email status and session meta when sessionId changes
  useEffect(() => {
    fetchEmailStatus();
    fetchSessionMeta();
  }, [fetchEmailStatus, fetchSessionMeta]);

  // Save session name handler - server is source of truth, localStorage is cache
  const handleSaveSessionName = useCallback(async (newName) => {
    if (!sessionId) return;

    // Optimistic update + cache to localStorage
    const previousName = sessionName;
    setSessionName(newName);
    setSessionNameSaving(true);

    try {
      const result = await patchSession(sessionId, { name: newName || null });
      if (result.ok) {
        // Server is source of truth - use server response
        const serverName = result.session?.name ?? null;
        setSessionName(serverName);
        setLocalSessionMeta(sessionId, { name: serverName });
        setSnackbar({ open: true, message: 'Session renamed', severity: 'success' });
      } else {
        // Server error - rollback optimistic update
        setSessionName(previousName);
        setSnackbar({ open: true, message: result.error || 'Failed to rename session', severity: 'error' });
      }
    } catch (e) {
      // Network error - rollback optimistic update
      setSessionName(previousName);
      setSnackbar({ open: true, message: e?.message || 'Network error', severity: 'error' });
    } finally {
      setSessionNameSaving(false);
    }
  }, [sessionId, sessionName]);

  // Save session description handler - server is source of truth, localStorage is cache
  const handleSaveSessionDescription = useCallback(async (newDescription) => {
    if (!sessionId) return;

    // Optimistic update
    const previousDescription = sessionDescription;
    setSessionDescription(newDescription);

    try {
      const result = await patchSession(sessionId, { description: newDescription || null });
      if (result.ok) {
        // Server is source of truth - use server response
        const serverDesc = result.session?.description ?? null;
        setSessionDescription(serverDesc);
        setLocalSessionMeta(sessionId, { description: serverDesc });
        setSnackbar({ open: true, message: 'Session notes saved', severity: 'success' });
      } else {
        // Server error - rollback
        setSessionDescription(previousDescription);
        setSnackbar({ open: true, message: result.error || 'Failed to save notes', severity: 'error' });
      }
    } catch (e) {
      // Network error - rollback
      setSessionDescription(previousDescription);
      setSnackbar({ open: true, message: e?.message || 'Network error', severity: 'error' });
    }
  }, [sessionId, sessionDescription]);

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
  const copyTextFallback = useCallback((text) => {
    try {
      const el = document.createElement('textarea');
      el.value = String(text ?? '');
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.top = '-1000px';
      el.style.left = '-1000px';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();

      const ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(el);
      return !!ok;
    } catch {
      return false;
    }
  }, []);

  const copySessionId = useCallback(async () => {
    if (!sessionId) return;
    try {
      // Clipboard API requires a secure context (HTTPS) except on localhost.
      // On some dev servers (http://host), it will throw even with a user gesture.
      const canUseClipboardApi =
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        navigator?.clipboard &&
        typeof navigator.clipboard.writeText === 'function';

      if (canUseClipboardApi) {
        await navigator.clipboard.writeText(sessionId);
        setSnackbar({ open: true, message: 'Session ID copied!', severity: 'success' });
        return;
      }

      const ok = copyTextFallback(sessionId);
      if (ok) {
        setSnackbar({ open: true, message: 'Session ID copied!', severity: 'success' });
      } else {
        setSnackbar({
          open: true,
          message: 'Copy failed (browser blocked clipboard on non-HTTPS).',
          severity: 'error',
        });
      }
    } catch (e) {
      const msg = e?.message ? String(e.message) : '';
      const ok = copyTextFallback(sessionId);
      if (ok) {
        setSnackbar({ open: true, message: 'Session ID copied!', severity: 'success' });
      } else {
        setSnackbar({
          open: true,
          message: msg ? `Copy failed: ${msg}` : 'Copy failed.',
          severity: 'error',
        });
      }
    }
  }, [copyTextFallback, sessionId]);

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

  const handleStartNewSession = useCallback(() => {
    setIsNewSessionDialogOpen(true);
  }, []);

  const handleConfirmNewSession = useCallback(async () => {
    setIsNewSessionDialogOpen(false);
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

  // Email status icon for compact display
  const emailStatusIcon = useMemo(() => {
    if (emailStatusLoading) return { icon: <CircularProgress size={14} sx={{ color: 'rgba(226, 232, 240, 0.7)' }} />, tooltip: 'Loading email status…', color: 'default' };
    if (!hasEmail) return { icon: <EmailIcon sx={{ fontSize: 16 }} />, tooltip: 'No email linked – click Session to set up', color: 'default' };
    if (hasPendingVerification) return { icon: <PendingIcon sx={{ fontSize: 16 }} />, tooltip: `Pending verification: ${pendingTargetEmail || emailStatus?.email}`, color: 'warning' };
    if (emailVerified) return { icon: <VerifiedIcon sx={{ fontSize: 16 }} />, tooltip: `Verified: ${emailStatus?.email}`, color: 'success' };
    return { icon: <EmailIcon sx={{ fontSize: 16 }} />, tooltip: `${emailStatus?.email} (unverified)`, color: 'warning' };
  }, [emailStatusLoading, hasEmail, hasPendingVerification, emailVerified, emailStatus?.email, pendingTargetEmail]);

  const { shell, mode, toggleMode } = useShellTheme();

  return (
    <>
      <header className="px-3 py-2 sm:px-4" style={{ backgroundColor: shell.headerBg }}>
        {/* ── Top row: Brand + (nav if wide enough) + Session widget ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5, md: 2 },
            minHeight: 40,
            flexWrap: 'nowrap',
          }}
        >
          {/* ── Left: Brand ── */}
          <Box
            component={RouterNavLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '7px',
                bgcolor: 'rgba(255, 255, 255, 0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                p: '2px',
              }}
            >
              <Box
                component="img"
                src="/pepedit_logo_28x32.png"
                alt="PEP-EDIT logo"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                color: 'common.white',
                fontWeight: 700,
                letterSpacing: '0.06em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.85rem', sm: '1rem' },
              }}
            >
              PEP-EDIT
            </Typography>
          </Box>

          {/* ── Center: Navigation (inline on md+) ── */}
          {isMd && (
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {children}
            </Box>
          )}

          {/* Spacer when nav is hidden (pushes session widget right) */}
          {!isMd && <Box sx={{ flex: 1 }} />}

          {/* ── Theme toggle ── */}
          <Tooltip title={mode === 'dark' ? 'Switch to light shell' : 'Switch to dark shell'} arrow>
            <IconButton
              size="small"
              onClick={toggleMode}
              sx={{
                color: 'rgba(226, 232, 240, 0.75)',
                '&:hover': { color: 'common.white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              {mode === 'dark'
                ? <LightModeIcon sx={{ fontSize: 18 }} />
                : <DarkModeIcon sx={{ fontSize: 18 }} />
              }
            </IconButton>
          </Tooltip>

          {/* ── Contact support ── */}
          <Button
            size="small"
            onClick={() => setIsContactDialogOpen(true)}
            startIcon={<ContactSupportIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: 'rgba(226, 232, 240, 0.75)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'none',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              '&:hover': { color: 'common.white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Contact
          </Button>

          {/* ── Right: Session widget ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {isLoading ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CircularProgress size={14} sx={{ color: 'common.white' }} />
                {isMd && (
                  <Typography variant="caption" sx={{ color: 'rgba(226, 232, 240, 0.85)', whiteSpace: 'nowrap' }}>
                    Loading…
                  </Typography>
                )}
              </Stack>
            ) : sessionId ? (
              <>
                {/* Inline session name — only on lg+ */}
                {isLg && (
                  <>
                    <InlineSessionNameEditor
                      name={sessionName}
                      onSave={handleSaveSessionName}
                      saving={sessionNameSaving}
                      editable={true}
                    />
                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(148, 163, 184, 0.3)', mx: 0.25 }} />
                  </>
                )}

                {/* Session ID chip — only on md+ */}
                {isMd && (
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
                      icon={<ContentCopyIcon sx={{ fontSize: '0.8rem !important' }} />}
                      label={shortSessionId}
                      onClick={copySessionId}
                      sx={{
                        color: 'common.white',
                        borderColor: 'rgba(148, 163, 184, 0.4)',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        height: 24,
                        '& .MuiChip-label': { px: 0.75 },
                        '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                        '&:hover': { borderColor: 'rgba(148, 163, 184, 0.7)' },
                      }}
                    />
                  </Tooltip>
                )}

                {/* Email status indicator — always visible */}
                <Tooltip title={emailStatusIcon.tooltip} arrow>
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={emailStatusIcon.icon}
                    label=""
                    onClick={() => openSessionDialog(2)}
                    color={emailStatusIcon.color}
                    sx={{
                      height: 24,
                      minWidth: 0,
                      '& .MuiChip-label': { display: 'none' },
                      '& .MuiChip-icon': { mx: 0.5 },
                      borderColor: 'rgba(148, 163, 184, 0.4)',
                      '&:hover': { borderColor: 'rgba(148, 163, 184, 0.7)' },
                    }}
                  />
                </Tooltip>

                {/* New session button — always visible */}
                <Tooltip title="Start a new session">
                  <IconButton
                    size="small"
                    onClick={handleStartNewSession}
                    aria-label="Start new session"
                    sx={{
                      color: 'common.white',
                      p: 0.5,
                      '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.15)' },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                {/* Session menu button — label visible on md+, icon-only on small */}
                <Tooltip title="Session settings, sharing & recovery">
                  {isMd ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openSessionDialog(0)}
                      startIcon={<SettingsIcon sx={{ fontSize: '16px !important' }} />}
                      sx={{
                        color: 'common.white',
                        borderColor: 'rgba(148, 163, 184, 0.4)',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        py: 0.25,
                        px: 1.25,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          borderColor: 'rgba(148, 163, 184, 0.7)',
                          bgcolor: 'rgba(148, 163, 184, 0.1)',
                        },
                      }}
                    >
                      Session
                    </Button>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => openSessionDialog(0)}
                      aria-label="Session settings"
                      sx={{
                        color: 'common.white',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        borderRadius: 1,
                        p: 0.5,
                        '&:hover': {
                          borderColor: 'rgba(148, 163, 184, 0.7)',
                          bgcolor: 'rgba(148, 163, 184, 0.1)',
                        },
                      }}
                    >
                      <SettingsIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Tooltip>
              </>
            ) : (
              <Typography variant="caption" sx={{ color: 'error.light' }}>
                No session
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── Nav on second row when screen < md ── */}
        {!isMd && (
          <Box sx={{ mt: 1, overflow: 'auto' }}>
            {children}
          </Box>
        )}

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
                      placeholder=""
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
                      placeholder=""
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

                  <Divider />

                  {/* Session notes (name & description) */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Session notes</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Add a name and notes to help identify this session. Saved on the server and cached locally.
                    </Typography>
                    <Stack spacing={1.5}>
                      <TextField
                        size="small"
                        label="Session name"
                        value={sessionName || ''}
                        onChange={(e) => setSessionName(e.target.value.slice(0, 200))}
                        onBlur={(e) => handleSaveSessionName(e.target.value.trim() || null)}
                        placeholder="My peptide design"
                        fullWidth
                        slotProps={{
                          htmlInput: { maxLength: 200 },
                        }}
                      />
                      <TextField
                        size="small"
                        label="Description / notes"
                        value={sessionDescription || ''}
                        onChange={(e) => setSessionDescription(e.target.value.slice(0, 2000))}
                        onBlur={(e) => handleSaveSessionDescription(e.target.value.trim() || null)}
                        placeholder="Add notes about this session…"
                        multiline
                        minRows={2}
                        maxRows={4}
                        fullWidth
                        slotProps={{
                          htmlInput: { maxLength: 2000 },
                        }}
                      />
                    </Stack>
                  </Box>
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
          autoHideDuration={2000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Contact support dialog */}
        <ContactDialog
          open={isContactDialogOpen}
          onClose={() => setIsContactDialogOpen(false)}
          sessionId={sessionId}
          defaultEmail={emailStatus?.email_verified ? emailStatus.email : ''}
        />

        {/* New session confirmation dialog */}
        <Dialog
          open={isNewSessionDialogOpen}
          onClose={() => setIsNewSessionDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Start a new session?</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              Your current session data (monomers, jobs) will no longer be accessible unless you save your current session ID.
              {'\n\n'}
              Tip: click the session ID chip (top-right) to copy it, or use Recover → "Email me this session ID" (requires verified email).
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsNewSessionDialogOpen(false)} color="inherit" variant="text">
              Cancel
            </Button>
            <Button onClick={handleConfirmNewSession} color="primary" variant="contained">
              New session
            </Button>
          </DialogActions>
        </Dialog>
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
