import { memo } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * Dialog that displays the results of POST /api/molecules/validate-sdf.
 *
 * Props:
 *   open          – boolean
 *   onClose       – () => void
 *   errors        – [{ code, message, tag? }]   (from data.errors)
 *   warnings      – [{ code, message, tag? }]   (from data.warnings)
 *   functionalCheck – { ok, stage, error } | null
 */
const SdfValidationDialog = memo(function SdfValidationDialog({
    open,
    onClose,
    errors = [],
    warnings = [],
    functionalCheck = null,
}) {
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;
    const hasFunctionalError = functionalCheck && functionalCheck.ok === false;

    const totalIssues = errors.length + warnings.length + (hasFunctionalError ? 1 : 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasErrors || hasFunctionalError ? (
                    <>
                        <ErrorOutlineIcon color="error" />
                        SDF validation failed
                        {totalIssues > 0 ? (
                            <Typography variant="body2" component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                ({totalIssues} issue{totalIssues > 1 ? 's' : ''})
                            </Typography>
                        ) : null}
                    </>
                ) : hasWarnings ? (
                    <>
                        <WarningAmberIcon color="warning" />
                        SDF validation passed with warnings
                    </>
                ) : (
                    <>
                        <CheckCircleOutlineIcon color="success" />
                        SDF validation passed
                    </>
                )}
            </DialogTitle>

            <DialogContent dividers>
                {!hasErrors && !hasWarnings && !hasFunctionalError ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        No issues detected.
                    </Typography>
                ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                        Fix the issues below before uploading.
                    </Typography>
                )}

                {/* Errors */}
                {hasErrors ? (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" variant="outlined" sx={{ py: 0.5, mb: 1 }}>
                            {errors.length} error{errors.length > 1 ? 's' : ''} found
                        </Alert>
                        <List dense disablePadding>
                            {errors.map((err, idx) => (
                                <ListItem
                                    key={`e-${idx}`}
                                    disableGutters
                                    sx={{ alignItems: 'flex-start', py: 0.25 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                                        <ErrorOutlineIcon fontSize="small" color="error" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={typeof err === 'string' ? err : (err.message || err.code || 'Unknown error')}
                                        secondary={typeof err === 'string' ? null : (err.code && err.message ? err.code : null)}
                                        primaryTypographyProps={{
                                            variant: 'body2',
                                            sx: { wordBreak: 'break-word' },
                                        }}
                                        secondaryTypographyProps={{
                                            variant: 'caption',
                                            sx: { fontFamily: 'monospace', color: 'text.disabled' },
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                ) : null}

                {/* Warnings */}
                {hasWarnings ? (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="warning" variant="outlined" sx={{ py: 0.5, mb: 1 }}>
                            {warnings.length} warning{warnings.length > 1 ? 's' : ''} found
                        </Alert>
                        <List dense disablePadding>
                            {warnings.map((warn, idx) => (
                                <ListItem
                                    key={`w-${idx}`}
                                    disableGutters
                                    sx={{ alignItems: 'flex-start', py: 0.25 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                                        <WarningAmberIcon fontSize="small" color="warning" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={typeof warn === 'string' ? warn : (warn.message || warn.code || 'Unknown warning')}
                                        secondary={typeof warn === 'string' ? null : (warn.code && warn.message ? warn.code : null)}
                                        primaryTypographyProps={{
                                            variant: 'body2',
                                            sx: { wordBreak: 'break-word' },
                                        }}
                                        secondaryTypographyProps={{
                                            variant: 'caption',
                                            sx: { fontFamily: 'monospace', color: 'text.disabled' },
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                ) : null}

                {/* Functional check failure */}
                {hasFunctionalError ? (
                    <Box>
                        <Alert severity="error" variant="outlined" sx={{ py: 0.5, mb: 1 }}>
                            Functional check failed
                            {functionalCheck.stage ? ` at stage: ${functionalCheck.stage}` : ''}
                        </Alert>
                        {functionalCheck.error ? (
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', wordBreak: 'break-word', fontFamily: 'monospace', pl: 1 }}
                            >
                                {functionalCheck.error}
                            </Typography>
                        ) : null}
                    </Box>
                ) : null}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default SdfValidationDialog;
