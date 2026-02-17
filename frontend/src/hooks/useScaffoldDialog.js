import { useCallback, useRef, useState } from 'react';

export function useScaffoldDialog({ onUploadScaffoldFile, onFetchScaffoldById, onConstraintModeChange }) {
    const [scaffoldDialogOpen, setScaffoldDialogOpen] = useState(false);
    const [scaffoldMode, setScaffoldMode] = useState('file'); // 'file' | 'pdbId' | 'preset'
    const [pdbIdInput, setPdbIdInput] = useState('');
    const [presetLoading, setPresetLoading] = useState(false);
    const fileInputRef = useRef(null);

    const openScaffoldDialog = useCallback(() => {
        setScaffoldDialogOpen(true);
        setScaffoldMode('file');
        setPdbIdInput('');
        setPresetLoading(false);
    }, []);

    const closeScaffoldDialog = useCallback(() => {
        setScaffoldDialogOpen(false);
        setPdbIdInput('');
        setPresetLoading(false);
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

    /** Load a preset scaffold template. Switches constraint mode to "template" automatically. */
    const handleLoadPreset = useCallback(async (preset) => {
        if (!preset?.source) return;
        setPresetLoading(true);
        try {
            // Switch constraint mode to template
            onConstraintModeChange?.('template');

            if (preset.source.kind === 'pdbId') {
                await onFetchScaffoldById?.(preset.source.pdbId);
            } else if (preset.source.kind === 'asset') {
                // Fetch bundled asset file from public folder and upload via existing path
                const resp = await fetch(preset.source.path);
                if (!resp.ok) throw new Error(`Failed to fetch template asset: ${resp.statusText}`);
                const blob = await resp.blob();
                const file = new File([blob], preset.source.filename || 'template.pdb', {
                    type: 'chemical/x-pdb',
                });
                await onUploadScaffoldFile?.(file);
            }
            closeScaffoldDialog();
        } catch (err) {
            console.error('Failed to load preset scaffold:', err);
            setPresetLoading(false);
        }
    }, [onFetchScaffoldById, onUploadScaffoldFile, onConstraintModeChange, closeScaffoldDialog]);

    return {
        scaffoldDialogOpen,
        scaffoldMode,
        setScaffoldMode,
        pdbIdInput,
        setPdbIdInput,
        presetLoading,
        fileInputRef,
        openScaffoldDialog,
        closeScaffoldDialog,
        handleScaffoldFileChange,
        handleConfirmPdbId,
        handleLoadPreset,
    };
}