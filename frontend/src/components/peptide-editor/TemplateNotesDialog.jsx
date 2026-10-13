import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const SEVERITY_ICON = {
    error: <ErrorOutlineIcon color="error" sx={{ fontSize: 16 }} />,
    warning: <WarningAmberOutlinedIcon color="warning" sx={{ fontSize: 16 }} />,
    info: <InfoOutlinedIcon color="info" sx={{ fontSize: 16 }} />,
};

/**
 * Normalize notes given as strings or `{ severity, message }` objects.
 * Plain strings default to `defaultSeverity`.
 */
function normalizeNotes(items, defaultSeverity = 'warning') {
    return (Array.isArray(items) ? items : [])
        .map((it) => (typeof it === 'string'
            ? { severity: defaultSeverity, message: it }
            : { severity: it?.severity || defaultSeverity, message: String(it?.message ?? '') }))
        .filter((it) => it.message);
}

export function TemplateNotesList({ items, defaultSeverity = 'warning' }) {
    const notes = normalizeNotes(items, defaultSeverity);
    if (!notes.length) {
        return <Typography variant="body2" color="text.secondary">Nothing to report.</Typography>;
    }
    return (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {notes.map((n, i) => (
                <Box component="li" key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Box sx={{ pt: '2px', flexShrink: 0 }}>{SEVERITY_ICON[n.severity] ?? SEVERITY_ICON.info}</Box>
                    <Typography variant="body2" sx={{ fontSize: 12.5 }}>{n.message}</Typography>
                </Box>
            ))}
        </Box>
    );
}

/**
 * Dialog listing template notes (upload report, mapping issues, job result notes).
 * `actions` overrides the default single "Close" button.
 */
export default function TemplateNotesDialog({
    open,
    onClose,
    title,
    intro = null,
    items = [],
    defaultSeverity = 'warning',
    actions = null,
}) {
    return (
        <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: 16 }}>{title}</DialogTitle>
            <DialogContent dividers>
                {intro ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{intro}</Typography>
                ) : null}
                <TemplateNotesList items={items} defaultSeverity={defaultSeverity} />
            </DialogContent>
            <DialogActions>
                {actions ?? <Button size="small" onClick={onClose}>Close</Button>}
            </DialogActions>
        </Dialog>
    );
}
