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

export function ScaffoldWarningsDialog({ open, warnings, messages, standardization, scaffoldName, onAcknowledge }) {
    // Display uses backend-provided `messages` (ready-to-display).
    // Severity is based on backend-provided `warnings` (real warnings only).
    const warningItems = Array.isArray(warnings) ? warnings.filter(Boolean).map(String) : [];

    const standardizationMessage = standardization?.applied && standardization?.message
        ? String(standardization.message)
        : null;

    const itemsRaw = Array.isArray(messages) ? messages.filter(Boolean).map(String) : [];
    // If backend also included the standardization message in `messages`, remove it from the generic list
    // so it can be shown in a dedicated highlighted section.
    const items = standardizationMessage
        ? itemsRaw.filter((m) => m !== standardizationMessage)
        : itemsRaw;

    const severity = warningItems.length > 0 ? 'warning' : 'info';

    const handleClose = (_, reason) => {
        // Non-intrusive but requires explicit acknowledgement
        if (reason === 'backdropClick') return;
        onAcknowledge?.();
    };

    return (
        <Dialog
            open={!!open && (items.length > 0 || !!standardizationMessage)}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
        >
            <DialogTitle>
                Scaffold Uploading Messages{(items.length + (standardizationMessage ? 1 : 0)) ? ` (${items.length + (standardizationMessage ? 1 : 0)})` : ''}
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

                    <List dense disablePadding>
                        {items.map((w, idx) => (
                            <ListItem key={`${idx}-${w}`} disableGutters sx={{ py: 0.25 }}>
                                <ListItemText
                                    primary={w}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        component: 'span',
                                        sx: {
                                            color: 'text.primary',
                                            wordBreak: 'break-word',
                                            position: 'relative',
                                            pl: 2,
                                            '&:before': {
                                                content: '"–"',
                                                position: 'absolute',
                                                left: 0,
                                                color: 'text.secondary',
                                            },
                                        },
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Alert>



                {standardizationMessage ? (
                    <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Standardization applied
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                            {standardizationMessage}
                        </Typography>
                        {/* {standardization?.standardizer ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Standardizer: {String(standardization.standardizer)}
                            </Typography>
                        ) : null} */}
                    </Alert>
                ) : null}

            </DialogContent>
            <DialogActions>
                <Button size="small" variant="contained" onClick={() => onAcknowledge?.()}>
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
