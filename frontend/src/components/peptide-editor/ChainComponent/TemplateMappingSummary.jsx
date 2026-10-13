import { useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { TemplateNotesList } from '../TemplateNotesDialog';

const STATUS_LABELS = [
    ['constrained', 'constrained'],
    ['partial', 'partially constrained'],
    ['unresolved', 'unresolved (free)'],
    ['masked', 'masked'],
    ['unconstrained', 'without usable coordinates'],
    ['not_amino_acid', 'non-amino-acid monomer'],
];

/**
 * One-line summary of a designed chain's template mapping status (pre-flight
 * report from the backend), with a popover listing issues and quick fixes.
 */
export default function TemplateMappingSummary({ report, loading = false, error = null, onMaskPosition }) {
    const [anchorEl, setAnchorEl] = useState(null);

    if (!report) {
        if (error) {
            return (
                <Tooltip title={`Mapping check unavailable: ${error}`}>
                    <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 0.5 }} />
                </Tooltip>
            );
        }
        if (loading) {
            return (
                <Tooltip title="Checking template mapping…">
                    <CircularProgress size={12} sx={{ ml: 0.75 }} />
                </Tooltip>
            );
        }
        return null;
    }

    const positions = Array.isArray(report.positions) ? report.positions : [];
    const withIssues = positions
        .map((p) => ({ ...p, issues: (p.issues || []).filter((i) => i.severity !== 'info') }))
        .filter((p) => p.issues.length);
    const errors = withIssues.reduce((n, p) => n + p.issues.filter((i) => i.severity === 'error').length, 0);
    const warnings = withIssues.reduce((n, p) => n + p.issues.filter((i) => i.severity === 'warning').length, 0);

    const summary = report.summary || {};
    const statusLine = STATUS_LABELS
        .filter(([key]) => summary[key])
        .map(([key, label]) => `${summary[key]} ${label}`)
        .join(' · ');

    if (!errors && !warnings) {
        return (
            <Tooltip title={`Template mapping OK: ${statusLine || 'nothing constrained'} (${report.anchors ?? 0} backbone atoms).`}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main', ml: 0.5 }} />
            </Tooltip>
        );
    }

    const color = errors ? 'error' : 'warning';
    const Icon = errors ? ErrorOutlineIcon : WarningAmberOutlinedIcon;

    return (
        <>
            <Tooltip title="Template mapping issues: click for details">
                <IconButton
                    size="small"
                    color={color}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ ml: 0.25, px: 0.5, borderRadius: 1, gap: 0.25 }}
                    aria-label="template mapping issues"
                >
                    <Icon sx={{ fontSize: 16 }} />
                    <Typography component="span" sx={{ fontSize: 11, fontWeight: 600 }}>{errors + warnings}</Typography>
                </IconButton>
            </Tooltip>
            <Popover
                open={!!anchorEl}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { sx: { p: 1.5, maxWidth: 460 } } }}
            >
                <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 0.5 }}>
                    Template mapping, chain {report.chain_id}
                </Typography>
                {statusLine ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1 }}>{statusLine}</Typography>
                ) : null}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {withIssues.map((p) => (
                        <Box key={p.index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                                <TemplateNotesList items={p.issues} />
                            </Box>
                            {onMaskPosition && p.status !== 'masked' ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => onMaskPosition(p.index)}
                                    sx={{ fontSize: 11, py: 0, minWidth: 0, textTransform: 'none', flexShrink: 0 }}
                                >
                                    Mask {p.resname}{p.resid}{p.icode || ''}
                                </Button>
                            ) : null}
                        </Box>
                    ))}
                </Box>
            </Popover>
        </>
    );
}
