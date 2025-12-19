import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export default function DataPolicyDialog({ open, mode = 'footer', onClose, onAccept }) {
  const [showDetails, setShowDetails] = useState(mode !== 'consent');

  const title = useMemo(() => {
    return mode === 'consent' ? 'Data & Storage Notice' : 'Data & Privacy Policy';
  }, [mode]);

  const handleDetails = useCallback(() => {
    setShowDetails(true);
  }, []);

  const handleDialogClose = useCallback(
    (_event, reason) => {
      if (mode === 'consent' && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
      onClose?.();
    },
    [mode, onClose]
  );

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={mode === 'consent'}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers sx={{ py: 2.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          This application uses browser storage and a server-side session keyed by an anonymous Token ID to provide core features
          (restore your work, manage your personal monomers, and retrieve results).
        </Typography>

        <Box
          component="ul"
          sx={{
            mt: 2,
            mb: 0,
            pl: 2.5,
            '& > li': { mb: 1.1 },
            '& > li:last-of-type': { mb: 0 },
          }}
        >
          <Typography component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
            No account is required; we do not ask for your name or email address.
          </Typography>
          <Typography component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
            <b>Stored on your device (Local Storage):</b> editor state (work-in-progress) and an anonymous Owner/Token ID so your session
            can be restored after refresh/navigation.
          </Typography>
          <Typography component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
            <b>Stored on our server (linked to the Token ID):</b> session-scoped data needed to retrieve results and (if you use “My monomers”)
            your personal monomer entries associated with that Token ID.
          </Typography>
          <Typography component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
            We do not use advertising or tracking cookies.
          </Typography>
        </Box>

        {showDetails ? (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Details
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              The Owner/Token ID is a random identifier used only within this application to look up the server-side data for your session.
              It is not meant to identify you personally.
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.25, lineHeight: 1.6 }}>
              <b>How to clear data:</b> you can clear Local Storage at any time by removing this site’s data in your browser settings.
              If you created personal monomers, you can delete them from the “My monomers” page.
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.25, lineHeight: 1.6 }}>
              Like most web services, the server may process basic technical information necessary to deliver the service (e.g. request metadata).
            </Typography>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {mode === 'consent' ? (
          <>
            <Button onClick={handleDetails} variant="text">
              Details
            </Button>
            <Button onClick={onAccept} variant="contained">
              Accept
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

DataPolicyDialog.propTypes = {
  open: PropTypes.bool,
  mode: PropTypes.oneOf(['consent', 'footer']),
  onClose: PropTypes.func,
  onAccept: PropTypes.func,
};
