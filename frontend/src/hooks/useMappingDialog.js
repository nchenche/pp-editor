import { useCallback, useState } from 'react';

export function useMappingDialog() {
    const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
    const [mappingDialogSeqIdx, setMappingDialogSeqIdx] = useState(null);

    const openMappingDialog = useCallback((seqIdx) => {
        setMappingDialogSeqIdx(seqIdx);
        setMappingDialogOpen(true);
    }, []);

    const closeMappingDialog = useCallback(() => {
        setMappingDialogSeqIdx(null);
        setMappingDialogOpen(false);
    }, []);

    return {
        mappingDialogOpen,
        mappingDialogSeqIdx,
        openMappingDialog,
        closeMappingDialog,
    };
}