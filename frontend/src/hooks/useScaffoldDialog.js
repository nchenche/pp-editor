import { useCallback, useRef, useState } from 'react';

export function useScaffoldDialog({ onUploadScaffoldFile, onFetchScaffoldById }) {
    const [scaffoldDialogOpen, setScaffoldDialogOpen] = useState(false);
    const [scaffoldMode, setScaffoldMode] = useState('file'); // 'file' | 'pdbId'
    const [pdbIdInput, setPdbIdInput] = useState('');
    const fileInputRef = useRef(null);

    const openScaffoldDialog = useCallback(() => {
        setScaffoldDialogOpen(true);
        setScaffoldMode('file');
        setPdbIdInput('');
    }, []);

    const closeScaffoldDialog = useCallback(() => {
        setScaffoldDialogOpen(false);
        setPdbIdInput('');
    }, []);

    const handleScaffoldFileChange = useCallback(
        (e) => {
            const file = e.target.files?.[0];
            if (file) {
                onUploadScaffoldFile?.(file);
                closeScaffoldDialog();
            }
            e.target.value = '';
        },
        [onUploadScaffoldFile, closeScaffoldDialog],
    );

    const handleConfirmPdbId = useCallback(async () => {
        const trimmed = pdbIdInput.trim();
        if (!trimmed) return;
        await onFetchScaffoldById?.(trimmed);
        closeScaffoldDialog();
    }, [pdbIdInput, onFetchScaffoldById, closeScaffoldDialog]);

    return {
        scaffoldDialogOpen,
        scaffoldMode,
        setScaffoldMode,
        pdbIdInput,
        setPdbIdInput,
        fileInputRef,
        openScaffoldDialog,
        closeScaffoldDialog,
        handleScaffoldFileChange,
        handleConfirmPdbId,
    };
}