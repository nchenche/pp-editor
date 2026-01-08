import React, { useState } from 'react';
import { Box, Button, ButtonGroup, Tooltip, Menu, MenuItem, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import TuneIcon from '@mui/icons-material/Tune';

export default function ChainsToolbar({
    linkMode = false,
    bondsMode = false,
    onToggleLinkMode = () => { },
    onToggleCutMode = () => { },
    canLink = true,
    canUnlink = true,
    onAddChain = () => { },
    constraintMode = 'ss',
    onConstraintModeChange = () => { },
    canUseTemplateMode = true,
}) {

    const [constraintModeEl, setConstraintModeEl] = useState(null);
    const constraintMenuOpen = Boolean(constraintModeEl);

    const btnSx = {
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 28,
        px: 1,
        color: 'text.secondary',
        borderColor: 'divider',
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Tooltip title="Add chain" arrow>
                <span>
                    <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={onAddChain}
                        aria-label="add chain"
                        sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                    >
                        <AddIcon fontSize="inherit" />
                    </Button>
                </span>
            </Tooltip>

            {/* Bonds: Link / Unlink */}
            <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': btnSx }}>
                <Tooltip title="Link monomers" arrow>
                    <span>
                        <Button
                            onClick={onToggleLinkMode}
                            color="inherit"
                            variant={linkMode ? 'contained' : 'outlined'}
                            disabled={!canLink}
                        >
                            <DeviceHubIcon fontSize="inherit" />
                        </Button>
                    </span>
                </Tooltip>
                <Tooltip title="Unlink monomers" arrow>
                    <span>
                        <Button
                            onClick={onToggleCutMode}
                            color="inherit"
                            variant={bondsMode ? 'contained' : 'outlined'}
                            disabled={!canUnlink}
                            // startIcon={<LinkOffIcon fontSize="inherit" />}
                        >
                            <LinkOffIcon fontSize="inherit" />
                        </Button>
                    </span>
                </Tooltip>
            </ButtonGroup>

            {/* Global constraint system mode */}
            <Tooltip title="Constraint mode" arrow>
                <span>
                    <IconButton
                        size="small"
                        onClick={(e) => setConstraintModeEl(e.currentTarget)}
                        aria-haspopup="menu"
                        aria-expanded={constraintMenuOpen ? 'true' : undefined}
                        aria-label="constraint mode"
                        sx={{
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 0.65,
                        }}
                    >
                        <TuneIcon fontSize="inherit" />
                    </IconButton>
                </span>
            </Tooltip>

            <Menu
                anchorEl={constraintModeEl}
                open={constraintMenuOpen}
                onClose={() => setConstraintModeEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                MenuListProps={{ dense: true, 'aria-label': 'constraint mode menu' }}
            >
                <MenuItem
                    selected={constraintMode === 'none'}
                    onClick={() => {
                        onConstraintModeChange('none');
                        setConstraintModeEl(null);
                    }}
                >
                    None
                </MenuItem>
                <MenuItem
                    selected={constraintMode === 'ss'}
                    onClick={() => {
                        onConstraintModeChange('ss');
                        setConstraintModeEl(null);
                    }}
                >
                    Secondary structure constraints
                </MenuItem>
                <MenuItem
                    selected={constraintMode === 'template'}
                    onClick={() => {
                        onConstraintModeChange('template');
                        setConstraintModeEl(null);
                    }}
                >
                    Template guidance
                </MenuItem>
            </Menu>
        </Box>
    );
}