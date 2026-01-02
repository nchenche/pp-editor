import React from 'react';
import { Box, Button, ButtonGroup, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LinkOffIcon from '@mui/icons-material/LinkOff';

export default function ChainsToolbar({
    linkMode = false,
    bondsMode = false,
    onToggleLinkMode = () => { },
    onToggleCutMode = () => { },
    canLink = true,
    canUnlink = true,
    constraintMode = 'ss',
    onConstraintModeChange = () => { },
    canUseTemplateMode = true,
}) {

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
            {/* Bonds: Link / Unlink */}
            <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': btnSx }}>
                <Tooltip title="Link residues (2D sketch)" arrow>
                    <span>
                        <Button
                            onClick={onToggleLinkMode}
                            color="inherit"
                            variant={linkMode ? 'contained' : 'outlined'}
                            disabled={!canLink}
                            startIcon={<DeviceHubIcon fontSize="inherit" />}
                        >
                            Link
                        </Button>
                    </span>
                </Tooltip>
                <Tooltip title="Unlink bonds (2D sketch)" arrow>
                    <span>
                        <Button
                            onClick={onToggleCutMode}
                            color="inherit"
                            variant={bondsMode ? 'contained' : 'outlined'}
                            disabled={!canUnlink}
                            startIcon={<LinkOffIcon fontSize="inherit" />}
                        >
                            Unlink
                        </Button>
                    </span>
                </Tooltip>
            </ButtonGroup>

            {/* Global constraint system mode */}
            <Tooltip title="Constraint mode (applies to the whole peptide)" arrow>
                <span>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={constraintMode}
                        onChange={(_, next) => {
                            if (!next) return;
                            onConstraintModeChange(next);
                        }}
                        aria-label="constraint mode"
                        sx={{ '& .MuiToggleButton-root': btnSx, '& .MuiToggleButton-root.Mui-selected': { color: 'primary.main' } }}
                    >
                        <ToggleButton value="ss" aria-label="secondary structure mode">
                            Secondary
                        </ToggleButton>
                        <ToggleButton value="template" aria-label="template guidance mode" disabled={!canUseTemplateMode}>
                            Template
                        </ToggleButton>
                    </ToggleButtonGroup>
                </span>
            </Tooltip>
        </Box>
    );
}