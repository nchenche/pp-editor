import React, { useState } from 'react';
import { Box, Button, Tooltip, Menu, MenuItem, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CompressIcon from '@mui/icons-material/Compress';

export default function ChainsToolbar({
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

            {/* Global constraint system mode */}
            <Tooltip title="Constraint mode" arrow>
                <span>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => setConstraintModeEl(e.currentTarget)}
                        aria-haspopup="menu"
                        aria-expanded={constraintMenuOpen ? 'true' : undefined}
                        aria-label="constraint mode"
                        sx={{ ...btnSx, minWidth: 34, px: 0.5 }}
                    >
                        <CompressIcon fontSize="inherit" />
                    </Button>
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