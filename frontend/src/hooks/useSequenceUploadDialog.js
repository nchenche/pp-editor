import { useCallback, useState } from 'react';
import { parseFastaToBiln, convertHelmToBiln } from '../utils/bilnUtils';

export function useSequenceUploadDialog({ onApplyBiln }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState('fasta'); // 'fasta' | 'helm'
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleOpen = useCallback(() => {
        setOpen(true);
        setMode('fasta');
        setText('');
        setError('');
    }, []);

    const handleClose = useCallback(() => {
        if (loading) return;
        setOpen(false);
        setText('');
        setError('');
    }, [loading]);

    const handleConfirm = useCallback(async () => {
        const value = text.trim();
        if (!value) {
            setError('Please enter a sequence.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            let newBiln = '';

            if (mode === 'fasta') {
                newBiln = parseFastaToBiln(value);
            } else {
                newBiln = await convertHelmToBiln(value);
            }

            onApplyBiln?.(newBiln);
            setOpen(false);
            setText('');
        } catch (e) {
            setError(e?.message || 'Failed to process the sequence.');
        } finally {
            setLoading(false);
        }
    }, [mode, text, onApplyBiln]);

    return {
        open,
        mode,
        setMode,
        text,
        setText,
        error,
        setError,
        loading,
        handleOpen,
        handleClose,
        handleConfirm,
    };
}