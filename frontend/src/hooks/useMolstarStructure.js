import { useState, useCallback, useEffect } from "react";

import { CircularProgress } from "@mui/material";
import { PresetStructureRepresentations } from 'molstar/lib/mol-plugin-state/builder/structure/representation-preset';
import { Color } from 'molstar/lib/mol-util/color';
import { CollapsableControls, PurePluginUIComponent } from 'molstar/lib/mol-plugin-ui/base';
import { MagicWandSvg } from 'molstar/lib/mol-plugin-ui/controls/icons';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PostprocessingParams } from 'molstar/lib/mol-canvas3d/passes/postprocessing';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { StructureComponentManager } from 'molstar/lib/mol-plugin-state/manager/structure/component';
import { cameraProject } from "molstar/lib/mol-canvas3d/camera/util";
import { transformDirectionArray } from "molstar/lib/mol-geo/util";
import { RendererParams } from "molstar/lib/mol-gl/renderer";


async function applyStyle(plugin) {
    plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, ignoreLight: false });

    if (plugin.canvas3d) {
        const pp = plugin.canvas3d.props.postprocessing;
        plugin.canvas3d.setProps({
            postprocessing: {
                outline: {
                    name: 'on',
                    params: pp.outline.name === 'on'
                        ? pp.outline.params
                        : {
                            scale: 1,
                            color: Color(0x000000),
                            threshold: 0.33,
                            includeTransparent: true,
                        }
                },
                occlusion: {
                    name: 'on',
                    params: pp.occlusion.name === 'on'
                        ? pp.occlusion.params
                        : {
                            multiScale: { name: 'off', params: {} },
                            radius: 5,
                            bias: 0.8,
                            blurKernelSize: 15,
                            blurDepthBias: 0.5,
                            samples: 32,
                            resolutionScale: 1,
                            color: Color(0x000000),
                            transparentThreshold: 0.4,
                        }
                },
                shadow: { name: 'off', params: {} },
            },
            // transparentBackground: PD.Boolean(false),
            renderer: PD.Group({ ...RendererParams, backgroundColor: PD.Color(Color(0xFFFFFF)) }) // white
        });
    }
}


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
    const processStructureData = useCallback(async (fileData, format, rep = defaultRepresentation, colorScheme = defaultColorScheme) => {
        if (!pluginRef.current) return;
        const plugin = pluginRef.current;
        const trajectorySO = await plugin.builders.structure.parseTrajectory(fileData, format);
        const modelSO = await plugin.builders.structure.createModel(trajectorySO);
        const structureSO = await plugin.builders.structure.createStructure(modelSO);
        setStructure(structureSO);
        await plugin.builders.structure.representation.addRepresentation(
            structureSO,
            {
                type: rep,
                color: colorScheme,
                typeParams: { alpha: 0.01, },
            },
            { tag: 'current-representation' }
        );
        await applyStyle(plugin);
    }, [pluginRef]);

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
        // async () => {
        //     const { structures } = pluginRef.current.managers.structure.hierarchy.selection;
        //     console.log('Updating representation/color for structures:', structures);
        //     if (!structures) return;

        //     await pluginRef.current.managers.structure.component.applyPreset(structures, PresetStructureRepresentations['molecular-surface']);

        // },
        [structure]
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
