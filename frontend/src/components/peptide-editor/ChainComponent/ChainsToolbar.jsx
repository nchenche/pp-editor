import React, { useState } from 'react';
import {
    Box,
    Button,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CompressIcon from '@mui/icons-material/Compress';

const MODE_OPTIONS = [
    { value: 'none', label: 'None', description: 'No constraints' },
    { value: 'ss', label: 'Secondary structure', description: 'Helix / sheet / coil per residue' },
    { value: 'template', label: '3D template', description: 'Scaffold guidance from PDB / mmCIF' },
];

export default function ChainsToolbar({
    onAddChain = () => { },
    maxChainsReached = false,
    constraintMode = 'ss',
    onConstraintModeChange = () => { },
    canUseTemplateMode = true,
}) {
    const [menuEl, setMenuEl] = useState(null);
    const menuOpen = Boolean(menuEl);

    const btnSx = {
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

            {/* ── Constraint-mode menu ── */}
            <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={(e) => setMenuEl(e.currentTarget)}
                startIcon={<CompressIcon sx={{ fontSize: '14px !important' }} />}
                aria-haspopup="menu"
                aria-expanded={menuOpen ? 'true' : undefined}
                aria-label="structural constraints"
                sx={{
                    ...btnSx,
                    minWidth: 'auto',
                    px: 1,
                    fontWeight: 500,
                    fontSize: '0.74rem',
                }}
            >
                Structural constraints…
            </Button>

            <Menu
                anchorEl={menuEl}
                open={menuOpen}
                onClose={() => setMenuEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                MenuListProps={{ 'aria-label': 'constraint mode menu' }}
                slotProps={{ paper: { sx: { minWidth: 220 } } }}
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
                        <ListItemIcon>
                            {constraintMode === opt.value ? (
                                <CheckIcon fontSize="small" />
                            ) : null}
                        </ListItemIcon>
                        <ListItemText
                            primary={opt.label}
                            secondary={opt.description}
                            primaryTypographyProps={{ fontWeight: constraintMode === opt.value ? 600 : 400 }}
                        />
                    </MenuItem>
                ))}
            </Menu>

            {/* ── Add chain (pinned far-right) ── */}
            <Tooltip title={maxChainsReached ? 'Maximum of 10 chains reached' : 'Add chain'} arrow>
                <span>
                    <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={onAddChain}
                        disabled={maxChainsReached}
                        aria-label="add chain"
                        sx={{ ...btnSx }}
                    >
                        <AddIcon fontSize="inherit" />
                    </Button>
                </span>
            </Tooltip>
        </Box>
    );
}