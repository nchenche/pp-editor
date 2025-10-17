import React, { useState } from 'react';
import { Box, Button, ButtonGroup, Tooltip, FormControl, Select, Menu, MenuItem } from '@mui/material';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function SequenceTrackToolbar({
    linkMode = false,
    bondsMode = false,
    onToggleLinkMode = () => { },
    onToggleCutMode = () => { },
    canLink = true,
    canUnlink = true,
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
            {/* Bonds: Link / Cut */}
            <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': btnSx }}>
                <Tooltip title="Link residues (2D sketch)" arrow>
                    <Button
                        onClick={onToggleLinkMode}
                        color="inherit"
                        variant={linkMode ? 'contained' : 'outlined'}
                        disabled={!canLink}
                        startIcon={<DeviceHubIcon fontSize="inherit" />}
                    >
                        Link
                    </Button>
                </Tooltip>
                <Tooltip title="Cut bonds (2D sketch)" arrow>
                    <Button
                        onClick={onToggleCutMode}
                        color="inherit"
                        variant={bondsMode ? 'contained' : 'outlined'}
                        disabled={!canUnlink}
                        startIcon={<LinkOffIcon fontSize="inherit" />}                        
                    >
                        Unlink
                    </Button>
                </Tooltip>
            </ButtonGroup>
        </Box>
    );
}