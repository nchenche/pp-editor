import { useState, useCallback, useEffect, useRef } from "react";

import { CircularProgress } from "@mui/material";
import { PresetStructureRepresentations } from 'molstar/lib/mol-plugin-state/builder/structure/representation-preset';
import { Color } from 'molstar/lib/mol-util/color';
import { StateSelection } from 'molstar/lib/mol-state/state/selection';
import { CollapsableControls, PurePluginUIComponent } from 'molstar/lib/mol-plugin-ui/base';
import { MagicWandSvg } from 'molstar/lib/mol-plugin-ui/controls/icons';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PostprocessingParams } from 'molstar/lib/mol-canvas3d/passes/postprocessing';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { StructureComponentManager } from 'molstar/lib/mol-plugin-state/manager/structure/component';
import { cameraProject } from "molstar/lib/mol-canvas3d/camera/util";
import { transformDirectionArray } from "molstar/lib/mol-geo/util";
import { ChainIdColorThemeProvider } from 'molstar/lib/mol-theme/color/chain-id';
import { ElementSymbolColorThemeProvider } from 'molstar/lib/mol-theme/color/element-symbol';


/* Molstar programmatical access to some functionalities

# Hydrogens visualization

Hide all hydrogens:
plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, hydrogens: 'hide-all' })
Show all hydrogens:
plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, hydrogens: 'all' })
Only polar hydrogens:
plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, hydrogens: 'only-polar' })

# Lighting and effects
Set lighting to "soft":
plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, ignoreLight: false });

Set lighting to "flat":
plugin.managers.structure.component.setOptions({ ...plugin.managers.structure.component.state.options, ignoreLight: true });

Enable outline and occlusion effects with custom parameters:
See applyStyle() function below.



*/


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
                            color: Color(0x000000),  // black
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
                            color: Color(0x000000),  // black
                            transparentThreshold: 0.4,
                        }
                },
                shadow: { name: 'off', params: {} },
            },
            // Use a solid background so user-selected background colors are visible.
            transparentBackground: false,
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
    enabledRepresentations = null,
    defaultColorScheme = 'chain-id',
    atomLabelsEnabled = false,
    labelsEnabled = null,
    representationAlphaByRep = null,
    tagPrefix = 'ui',
} = {}) {
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep the previous data subtree around until the new structure is ready,
    // then delete it. This avoids a blank canvas during parsing and reduces flicker.
    const dataRootRef = useRef(null);
    const loadReqIdRef = useRef(0);

    // Always use latest representation/color scheme (in case they are made dynamic)
    const processStructureData = useCallback(async (fileData, format) => {
        if (!pluginRef.current) return;
        const plugin = pluginRef.current;
        const trajectorySO = await plugin.builders.structure.parseTrajectory(fileData, format);
        const modelSO = await plugin.builders.structure.createModel(trajectorySO);
        const structureSO = await plugin.builders.structure.createStructure(modelSO);
        setStructure(structureSO);
        await applyStyle(plugin);
    }, [pluginRef]);

    const deleteSubtreeByRef = useCallback(async (rootRef) => {
        if (!pluginRef.current || !rootRef) return;
        const plugin = pluginRef.current;
        try {
            const sel = StateSelection.Generators.byRef(rootRef).subtree();
            const cells = StateSelection.select(sel, plugin.state.data);
            if (!cells || cells.length === 0) return;

            const builder = plugin.state.data.build();
            // Delete deepest nodes first to avoid dependency issues.
            for (let i = cells.length - 1; i >= 0; i--) {
                const ref = cells[i]?.transform?.ref;
                if (!ref) continue;
                builder.delete(ref);
            }
            await builder.commit();
        } catch {
            // ignore
        }
    }, [pluginRef]);

    const clear = useCallback(async () => {
        // Invalidate any in-flight loads.
        loadReqIdRef.current++;

        const prevRoot = dataRootRef.current;
        dataRootRef.current = null;

        // Reset reconciliation history so next load starts clean.
        prevEnabledRef.current = [];
        prevColorRef.current = null;
        prevStructureRef.current = null;
        prevLabelsEnabledRef.current = { element: false, residue: false, chain: false };
        prevAlphaSigRef.current = null;

        setStructure(null);
        setError(null);
        setLoading(false);

        if (prevRoot) {
            await deleteSubtreeByRef(prevRoot);
        }
    }, [deleteSubtreeByRef]);

    const repTag = useCallback((repType) => `${tagPrefix}:rep:${repType}`, [tagPrefix]);
    const labelsTag = useCallback((level) => `${tagPrefix}:labels:${level}`, [tagPrefix]);
    const prevEnabledRef = useRef([]);
    const prevColorRef = useRef(null);
    const prevStructureRef = useRef(null);
    const prevLabelsEnabledRef = useRef({ element: false, residue: false, chain: false });
    const prevAlphaSigRef = useRef(null);

    const getEffectiveEnabled = useCallback(() => {
        const arr = Array.isArray(enabledRepresentations)
            ? enabledRepresentations
            : (defaultRepresentation ? [defaultRepresentation] : []);
        // sanitize/normalize
        return Array.from(new Set(arr.filter(Boolean).map(String)));
    }, [enabledRepresentations, defaultRepresentation]);

    const removeTaggedInSubtree = useCallback(async (rootRef, tag) => {
        if (!pluginRef.current || !rootRef || !tag) return;
        const plugin = pluginRef.current;
        const sel = StateSelection.Generators.byRef(rootRef).subtree().withTag(tag);
        const cells = StateSelection.select(sel, plugin.state.data);
        if (!cells || cells.length === 0) return;

        const builder = plugin.state.data.build();
        for (const cell of cells) {
            if (!cell?.transform?.ref) continue;
            builder.delete(cell.transform.ref);
        }
        await builder.commit();
    }, [pluginRef]);

    // Loader: PDB raw data string
    const loadFromRawData = useCallback(async (data, format = 'pdb') => {
        if (!pluginRef.current) return;
        const myReqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const plugin = pluginRef.current;
            const prevRoot = dataRootRef.current;

            const fileData = await plugin.builders.data.rawData({ data });
            const nextRoot = fileData?.cell?.transform?.ref || null;

            await processStructureData(fileData, format);

            if (loadReqIdRef.current !== myReqId) return;

            dataRootRef.current = nextRoot;
            if (prevRoot) {
                await deleteSubtreeByRef(prevRoot);
            }
            setLoading(false);
        } catch (err) {
            setError(`Failed to load raw data: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData, deleteSubtreeByRef]);

    // Loader: PDB ID
    const loadFromPdbId = useCallback(async (id) => {
        if (!pluginRef.current) return;
        const myReqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const plugin = pluginRef.current;
            const prevRoot = dataRootRef.current;
            const url = `https://models.rcsb.org/${id}.bcif`;
            const fileData = await plugin.builders.data.download({ url, isBinary: true });
            const nextRoot = fileData?.cell?.transform?.ref || null;

            await processStructureData(fileData, 'mmcif');

            if (loadReqIdRef.current !== myReqId) return;

            dataRootRef.current = nextRoot;
            if (prevRoot) {
                await deleteSubtreeByRef(prevRoot);
            }
            setLoading(false);
        } catch (err) {
            setError(`Failed to load PDB ID: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData, deleteSubtreeByRef]);

    // Loader: File (input[type=file])
    const loadFromPdbFile = useCallback(async (file) => {
        if (!pluginRef.current) return;
        const myReqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const plugin = pluginRef.current;
            const prevRoot = dataRootRef.current;

            const fileData = await plugin.builders.data.readFile({ file });
            const nextRoot = fileData?.cell?.transform?.ref || null;
            const format = determineFileFormat(file.name, file.type);
            await processStructureData(fileData, format);

            if (loadReqIdRef.current !== myReqId) return;

            dataRootRef.current = nextRoot;
            if (prevRoot) {
                await deleteSubtreeByRef(prevRoot);
            }
            setLoading(false);
        } catch (err) {
            setError(`Failed to load file: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData, deleteSubtreeByRef]);

    // Loader: URL
    const loadFromURL = useCallback(async (url) => {
        if (!pluginRef.current) return;
        const myReqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const plugin = pluginRef.current;
            const prevRoot = dataRootRef.current;

            const fileData = await plugin.builders.data.download({ url, isBinary: false });
            const nextRoot = fileData?.cell?.transform?.ref || null;
            await processStructureData(fileData, 'pdb');

            if (loadReqIdRef.current !== myReqId) return;

            dataRootRef.current = nextRoot;
            if (prevRoot) {
                await deleteSubtreeByRef(prevRoot);
            }
            setLoading(false);
        } catch (err) {
            setError(`Failed to load URL: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData, deleteSubtreeByRef]);

    // Loader: Blob (for drag & drop)
    const loadFromBlob = useCallback(async (blob) => {
        if (!pluginRef.current) return;
        const myReqId = ++loadReqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const plugin = pluginRef.current;
            const prevRoot = dataRootRef.current;
            const file = new File([blob], 'structure.pdb', { type: blob.type });
            const fileData = await plugin.builders.data.readFile({ file });
            const nextRoot = fileData?.cell?.transform?.ref || null;
            const format = determineFileFormat(file.name, blob.type);
            await processStructureData(fileData, format);

            if (loadReqIdRef.current !== myReqId) return;

            dataRootRef.current = nextRoot;
            if (prevRoot) {
                await deleteSubtreeByRef(prevRoot);
            }
            setLoading(false);
        } catch (err) {
            setError(`Failed to load blob: ${err.message}`);
            setLoading(false);
        }
    }, [pluginRef, processStructureData, deleteSubtreeByRef]);


    // Reconcile multiple representations (toggle on/off) and keep colors in sync.
    useEffect(() => {
        if (!structure || !pluginRef.current) return;

        const plugin = pluginRef.current;
        const enabled = getEffectiveEnabled();

        const getAlphaForRep = (repType) => {
            const v = representationAlphaByRep && typeof representationAlphaByRep === 'object'
                ? representationAlphaByRep[String(repType)]
                : undefined;
            const a = Number(v);
            if (!Number.isFinite(a)) return 1;
            return Math.min(1, Math.max(0, a));
        };

        const prevEnabled = Array.isArray(prevEnabledRef.current) ? prevEnabledRef.current : [];

        // Validate color theme name against Mol* registry. If an unknown name is passed
        // (e.g. from an outdated UI list), Mol* falls back to defaults that can vary.
        const colorRegistry = plugin?.representation?.structure?.themes?.colorThemeRegistry;
        const requestedColor = defaultColorScheme;
        const effectiveColor = (colorRegistry && requestedColor && colorRegistry.get(requestedColor).name === requestedColor)
            ? requestedColor
            : 'chain-id';

        // Provide stable theme params when needed.
        // In particular, forcing asymId to 'label' avoids color shifts when regenerated PDBs
        // have unstable/blank auth_asym_id values or offsets.
        const effectiveColorParams = effectiveColor === 'chain-id'
            ? { ...ChainIdColorThemeProvider.defaultValues, asymId: 'label' }
            : effectiveColor === 'element-symbol'
                // Mol* ElementSymbol theme defaults carbon atoms to chain-id coloring.
                // That makes organic structures appear to randomly change colors between loads.
                // Force carbon to a stable, slightly whitish tint for readability and contrast.
                ? {
                    ...ElementSymbolColorThemeProvider.defaultValues,
                    carbonColor: { name: 'uniform', params: { value: Color(0xc8c8c8) } },
                }
                : undefined;

        const prevColor = prevColorRef.current;
        const isNewStructure = prevStructureRef.current !== structure;
        const colorChanged = prevColor !== effectiveColor;
        const alphaSig = enabled.map((rep) => `${rep}:${getAlphaForRep(rep)}`).join('|');
        const alphaChanged = prevAlphaSigRef.current !== alphaSig;

        const removed = isNewStructure
            ? []
            : prevEnabled.filter((x) => !enabled.includes(x));
        const added = isNewStructure
            ? enabled
            : enabled.filter((x) => !prevEnabled.includes(x));

        const run = async () => {
            const rootRef = structure?.cell?.transform?.ref;
            if (!rootRef) return;

            // Mol* can sometimes adjust the camera when adding/removing representations.
            // Preserve the current camera pose across representation-only updates.
            const preserveCamera = !isNewStructure
                && !!plugin?.canvas3d?.camera?.getSnapshot
                && !!plugin?.managers?.camera?.setSnapshot;
            const cameraSnapshot = preserveCamera ? plugin.canvas3d.camera.getSnapshot() : null;

            try {
                // Remove disabled reps
                for (const repType of removed) {
                    await removeTaggedInSubtree(rootRef, repTag(repType));
                }

                // If color/alpha changed (or a new structure), re-apply enabled reps.
                if (isNewStructure || colorChanged || alphaChanged) {
                    for (const repType of enabled) {
                        await plugin.builders.structure.representation.addRepresentation(
                            structure,
                            {
                                type: repType,
                                color: effectiveColor,
                                colorParams: effectiveColorParams,
                                typeParams: { alpha: getAlphaForRep(repType) }
                            },
                            { tag: repTag(repType) }
                        );
                    }

                    prevEnabledRef.current = enabled;
                    prevColorRef.current = effectiveColor;
                    prevAlphaSigRef.current = alphaSig;
                    prevStructureRef.current = structure;
                    return;
                }

                // Add newly enabled reps
                for (const repType of added) {
                    await plugin.builders.structure.representation.addRepresentation(
                        structure,
                        {
                            type: repType,
                            color: effectiveColor,
                            colorParams: effectiveColorParams,
                            typeParams: { alpha: getAlphaForRep(repType) }
                        },
                        { tag: repTag(repType) }
                    );
                }

                prevEnabledRef.current = enabled;
                prevColorRef.current = effectiveColor;
                prevAlphaSigRef.current = alphaSig;
                prevStructureRef.current = structure;
            } finally {
                if (cameraSnapshot) {
                    try {
                        plugin.managers.camera.setSnapshot(cameraSnapshot, 0);
                    } catch {
                        // ignore
                    }
                }
            }
        };

        run().catch((e) => {
            // Avoid throwing in effects; surface a minimal message
            console.warn('Mol* representation reconcile failed:', e);
        });
    }, [structure, pluginRef, getEffectiveEnabled, defaultColorScheme, repTag, removeTaggedInSubtree, representationAlphaByRep]);

    // Labels toggles (independent of representations)
    useEffect(() => {
        if (!structure || !pluginRef.current) return;
        const plugin = pluginRef.current;
        const rootRef = structure?.cell?.transform?.ref;
        if (!rootRef) return;

        const prev = prevLabelsEnabledRef.current ?? { element: false, residue: false, chain: false };
        const next = (labelsEnabled && typeof labelsEnabled === 'object')
            ? {
                element: !!labelsEnabled.element,
                residue: !!labelsEnabled.residue,
                chain: !!labelsEnabled.chain,
            }
            : { element: !!atomLabelsEnabled, residue: false, chain: false };

        const isNewStructure = prevStructureRef.current !== structure;
        if (!isNewStructure
            && prev.element === next.element
            && prev.residue === next.residue
            && prev.chain === next.chain
        ) return;

        const levels = ['element', 'residue', 'chain'];

        const run = async () => {
            for (const level of levels) {
                const enabled = !!next[level];
                if (!enabled) {
                    await removeTaggedInSubtree(rootRef, labelsTag(level));
                    continue;
                }

                await plugin.builders.structure.representation.addRepresentation(
                    structure,
                    {
                        type: 'label',
                        typeParams: {
                            sizeFactor: 0.6,
                            tether: false,
                            level,
                        },
                    },
                    { tag: labelsTag(level) }
                );
            }

            prevLabelsEnabledRef.current = next;
        };

        run().catch((e) => {
            console.warn('Mol* labels reconcile failed:', e);
        });
    }, [structure, pluginRef, atomLabelsEnabled, labelsEnabled, labelsTag, removeTaggedInSubtree]);

    return {
        structure,
        loading,
        error,
        setError,
        setStructure,
        clear,
        loadFromPdbId,
        loadFromPdbFile,
        loadFromRawData,
        loadFromBlob,
        loadFromURL,
    };
}
