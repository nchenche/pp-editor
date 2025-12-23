import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';

export function ScaffoldWarningsDialog({ open, warnings, scaffoldName, onAcknowledge }) {
    // Display uses backend-provided `messages` (ready-to-display).
    // Severity is based on backend-provided `warnings` (real warnings only).
    const warningItems = Array.isArray(warnings)
        ? warnings.filter(Boolean).map(String)
        : [];

    const items = Array.isArray(arguments?.[0]?.messages)
        ? arguments[0].messages.filter(Boolean).map(String)
        : [];

    const severity = warningItems.length > 0 ? 'warning' : 'info';

    const handleClose = (_, reason) => {
        // Non-intrusive but requires explicit acknowledgement
        if (reason === 'backdropClick') return;
        onAcknowledge?.();
    };

    return (
        <Dialog
            open={!!open && items.length > 0}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
        >
            <DialogTitle>
                Scaffold messages{items.length ? ` (${items.length})` : ''}
            </DialogTitle>
            <DialogContent dividers>
                <Alert severity={severity} variant="outlined" sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {severity === 'warning'
                            ? 'The scaffold was parsed, but some issues were detected.'
                            : 'The scaffold was parsed successfully.'}
                    </Typography>
                    {scaffoldName ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Source: {scaffoldName}
                        </Typography>
                    ) : null}
                </Alert>

                <List dense disablePadding>
                    {items.map((w, idx) => (
                        <ListItem key={`${idx}-${w}`} disableGutters sx={{ py: 0.25 }}>
                            <ListItemText
                                primary={w}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    sx: { color: 'text.primary', wordBreak: 'break-word' },
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button size="small" variant="contained" onClick={() => onAcknowledge?.()}>
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
