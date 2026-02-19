import React, { useState } from 'react';
import {
    Box,
    Button,
    Tooltip,
    Menu,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CompressIcon from '@mui/icons-material/Compress';

const MODE_OPTIONS = [
    { value: 'none', label: 'None', tip: 'No constraints' },
    { value: 'ss', label: 'Secondary', tip: 'Secondary-structure constraints (helix, sheet, …)' },
    { value: 'template', label: '3D', tip: '3D template / scaffold guidance' },
];

export default function ChainsToolbar({
    onAddChain = () => { },
    constraintMode = 'ss',
    onConstraintModeChange = () => { },
    canUseTemplateMode = true,
}) {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));

    // ── Narrow-viewport menu fallback ──
    const [menuEl, setMenuEl] = useState(null);
    const menuOpen = Boolean(menuEl);

    const handleModeChange = (_e, next) => {
        if (next != null) onConstraintModeChange(next);
    };

    const currentLabel = MODE_OPTIONS.find((o) => o.value === constraintMode)?.label ?? 'None';

    const addBtnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        minWidth: 34,
        px: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-end' }}>

            {/* ── Constraint-mode selector ── */}
            {isNarrow ? (
                /* Collapsed menu for narrow viewports */
                <>
                    <Tooltip title={`Constraints: ${currentLabel}`} arrow>
                        <span>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => setMenuEl(e.currentTarget)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen ? 'true' : undefined}
                                aria-label="constraint mode"
                                sx={{ ...addBtnSx }}
                            >
                                <CompressIcon fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
                    <Menu
                        anchorEl={menuEl}
                        open={menuOpen}
                        onClose={() => setMenuEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        MenuListProps={{ dense: true, 'aria-label': 'constraint mode menu' }}
                    >
                        {MODE_OPTIONS.map((opt) => (
                            <MenuItem
                                key={opt.value}
                                selected={constraintMode === opt.value}
                                disabled={opt.value === 'template' && !canUseTemplateMode}
                                onClick={() => {
                                    onConstraintModeChange(opt.value);
                                    setMenuEl(null);
                                }}
                            >
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Menu>
                </>
            ) : (
                /* Segmented toggle for wider viewports */
                <ToggleButtonGroup
                    value={constraintMode}
                    exclusive
                    onChange={handleModeChange}
                    size="small"
                    aria-label="constraint mode"
                    sx={{
                        height: 28,
                        '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 500,
                            lineHeight: 1,
                            px: 1,
                            py: 0,
                            color: 'text.secondary',
                            borderColor: 'divider',
                            '&.Mui-selected': {
                                bgcolor: 'action.selected',
                                color: 'text.primary',
                                fontWeight: 600,
                            },
                        },
                    }}
                >
                    {MODE_OPTIONS.map((opt) => (
                        <ToggleButton
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.value === 'template' && !canUseTemplateMode}
                            aria-label={opt.tip}
                        >
                            <Tooltip title={opt.tip} arrow enterDelay={400}>
                                <span>{opt.label}</span>
                            </Tooltip>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            )}

            {/* ── Add chain (pinned far-right) ── */}
            <Tooltip title="Add chain" arrow>
                <span>
                    <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={onAddChain}
                        aria-label="add chain"
                        sx={{ ...addBtnSx }}
                    >
                        <AddIcon fontSize="inherit" />
                    </Button>
                </span>
            </Tooltip>
        </Box>
    );
}