import { useState, useCallback, useEffect } from "react";

import { CircularProgress } from "@mui/material";

// Helper: Determine file format
function determineFileFormat(filename, mimeType) {
    if (filename.endsWith('.pdb')) return 'pdb';
    if (filename.endsWith('.cif') || filename.endsWith('.mmcif')) return 'mmcif';
    if (filename.endsWith('.bcif')) return 'mmcif';
    if (filename.endsWith('.sdf')) return 'sdf';
    if (mimeType === 'chemical/x-pdb') return 'pdb';
    if (mimeType === 'chemical/x-mmcif') return 'mmcif';
    return 'pdb';
}

export function useMolstarStructure(pluginRef, {
    defaultRepresentation = 'cartoon',
    defaultColorScheme = 'chain-id',
} = {}) {
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Always use latest representation/color scheme (in case they are made dynamic)
    const processStructureData = useCallback(async (fileData, format, rep = defaultRepresentation, color = defaultColorScheme) => {
        if (!pluginRef.current) return;
        const plugin = pluginRef.current;
        const trajectorySO = await plugin.builders.structure.parseTrajectory(fileData, format);
        const modelSO = await plugin.builders.structure.createModel(trajectorySO);
        const structureSO = await plugin.builders.structure.createStructure(modelSO);
        setStructure(structureSO);
        await plugin.builders.structure.representation.addRepresentation(
            structureSO,
            { type: rep, color },
            { tag: 'current-representation' }
        );
    }, [pluginRef, defaultRepresentation, defaultColorScheme]);

    // Loader: PDB raw data string
    const loadFromRawData = useCallback(async (data, format = 'pdb') => {
        if (!pluginRef.current) return;
        setLoading(true);
        setError(null);
        try {
            await pluginRef.current.clear();
            const fileData = await pluginRef.current.builders.data.rawData({ data });
            await processStructureData(fileData, format);
            setLoading(false);
        } catch (err) {
            setError(`Failed to load raw data: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData]);

    // Loader: PDB ID
    const loadFromPdbId = useCallback(async (id) => {
        if (!pluginRef.current) return;
        setLoading(true);
        setError(null);
        try {
            await pluginRef.current.clear();
            const url = `https://models.rcsb.org/${id}.bcif`;
            const fileData = await pluginRef.current.builders.data.download({ url, isBinary: true });
            await processStructureData(fileData, 'mmcif');
            setLoading(false);
        } catch (err) {
            setError(`Failed to load PDB ID: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData]);

    // Loader: File (input[type=file])
    const loadFromPdbFile = useCallback(async (file) => {
        if (!pluginRef.current) return;
        setLoading(true);
        setError(null);
        try {
            await pluginRef.current.clear();
            const fileData = await pluginRef.current.builders.data.readFile({ file });
            const format = determineFileFormat(file.name, file.type);
            await processStructureData(fileData, format);
            setLoading(false);
        } catch (err) {
            setError(`Failed to load file: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData]);

    // Loader: URL
    const loadFromURL = useCallback(async (url) => {
        if (!pluginRef.current) return;
        setLoading(true);
        setError(null);
        try {
            await pluginRef.current.clear();
            const fileData = await pluginRef.current.builders.data.download({ url, isBinary: false });
            await processStructureData(fileData, 'pdb');
            setLoading(false);
        } catch (err) {
            setError(`Failed to load URL: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData]);

    // Loader: Blob (for drag & drop)
    const loadFromBlob = useCallback(async (blob) => {
        if (!pluginRef.current) return;
        setLoading(true);
        setError(null);
        try {
            await pluginRef.current.clear();
            const file = new File([blob], 'structure.pdb', { type: blob.type });
            const fileData = await pluginRef.current.builders.data.readFile({ file });
            const format = determineFileFormat(file.name, blob.type);
            await processStructureData(fileData, format);
            setLoading(false);
        } catch (err) {
            setError(`Failed to load blob: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData]);


    // **Add an effect to update rep/color**
    const updateRepresentation = useCallback(
        async (type, colorScheme) => {
            if (!structure || !pluginRef.current) return;
            const plugin = pluginRef.current;
            // Remove old representation (tagged 'current-representation')
            try {
                await plugin.builders.structure.representation.removeRepresentations(structure, { tag: 'current-representation' });
            } catch { }
            // Add new representation
            await plugin.builders.structure.representation.addRepresentation(
                structure,
                { type, color: colorScheme },
                { tag: "current-representation" }
            );
        },
        [structure, pluginRef]
    );

    // If representation/color changes, update it
    useEffect(() => {
        if (!structure) return;
        updateRepresentation(defaultRepresentation, defaultColorScheme);
    }, [structure, defaultRepresentation, defaultColorScheme, updateRepresentation]);

    return {
        structure,
        loading,
        error,
        setError,
        setStructure,
        loadFromPdbId,
        loadFromPdbFile,
        loadFromRawData,
        loadFromBlob,
        loadFromURL,
    };
}
