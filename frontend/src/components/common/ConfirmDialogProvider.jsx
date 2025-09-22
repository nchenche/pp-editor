import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Stack } from '@mui/material';

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        title: '',
        message: '',
        confirmText: 'Accept',
        cancelText: 'Cancel',
        hideCancel: false,
        onResolve: null,
    });

    const confirm = useCallback((opts) => {
        return new Promise((resolve) => {
            setState({
                open: true,
                title: opts.title || 'Confirm',
                message: opts.message || '',
                confirmText: opts.confirmText || 'Accept',
                cancelText: opts.cancelText || 'Cancel',
                hideCancel: !!opts.hideCancel,
                onResolve: resolve,
            });
        });
    }, []);

    const handleClose = useCallback(() => {
        setState(s => {
            s.onResolve?.(false);
            return { ...s, open: false, onResolve: null };
        });
    }, []);

    const handleAccept = useCallback(() => {
        setState(s => {
            s.onResolve?.(true);
            return { ...s, open: false, onResolve: null };
        });
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmCtx.Provider value={value}>
            {children}
            <Dialog
                open={state.open}
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
                keepMounted
            >
                {state.title ? <DialogTitle>{state.title}</DialogTitle> : null}
                <DialogContent dividers>
                    {typeof state.message === 'string'
                        ? <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{state.message}</Typography>
                        : <Stack spacing={1}>{state.message}</Stack>
                    }
                </DialogContent>
                <DialogActions>
                    {!state.hideCancel && (
                        <Button onClick={handleClose} color="inherit" variant="text">
                            {state.cancelText}
                        </Button>
                    )}
                    <Button onClick={handleAccept} color="primary" variant="contained">
                        {state.confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        </ConfirmCtx.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmCtx);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx.confirm;
}