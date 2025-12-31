import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';

import { useMolstarPlugin } from '../../../hooks/useMolstarPlugin';
import { useMolstarStructure } from '../../../hooks/useMolstarStructure';
import { useMolstarSelection } from '../../../hooks/useMolstarSelection';

import { StructureSelectionQuery } from 'molstar/lib/mol-plugin-state/helpers/structure-selection-query';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { StateSelection } from 'molstar/lib/mol-state/state/selection';


const Viewer3DInner = ({
    pdbFile,
    blobFile,
    pdbId,
    pdbURL,
    pdbRawData,

    // Optional overlay scaffold/template structure (secondary reference)
    templateKey,
    templatePdbRawData,
    templateVisible = false,
    templateOpacity = 0.25,
    templateMappings = null,

    hoveredMonomer,
    handleMonomerHover,
    defaultRepresentation = 'ball-and-stick',
    defaultColorScheme = 'chain-id',
    background = 'light',
    height = '20rem',
    width = '100%',
    isGenerating3D = false,
    error,
}, ref) => {
    const [enabledRepresentations, setEnabledRepresentations] = useState(() => [defaultRepresentation].filter(Boolean));
    const [colorScheme, setColorScheme] = useState(defaultColorScheme);
    const [labelsEnabled, setLabelsEnabled] = useState({ element: false, residue: false, chain: false });
    const [representationAlphaByRep, setRepresentationAlphaByRep] = useState({});

    const { pluginRef, canvasRef, containerRef, pluginInitialized, error: pluginError } = useMolstarPlugin({
        backgroundColor: background,
    });
    const {
        structure,
        loading: structureLoading,
        error: structureError,
        loadFromPdbId,
        loadFromPdbFile,
        loadFromRawData,
        loadFromBlob,
        loadFromURL,
    } = useMolstarStructure(pluginRef, {
        enabledRepresentations,
        defaultColorScheme: colorScheme,
        labelsEnabled,
        representationAlphaByRep,
        tagPrefix: 'main',
    });

    const templateEnabledReps = useMemo(() => {
        if (!templateVisible) return [];
        return ['cartoon', 'line'];
    }, [templateVisible]);

    const templateAlphaByRep = useMemo(() => {
        const base = Math.min(1, Math.max(0, Number(templateOpacity) || 0));
        return {
            cartoon: base,
            line: Math.min(1, base * 0.85),
        };
    }, [templateOpacity]);

    const {
        structure: templateStructure,
        loadFromRawData: loadTemplateFromRawData,
        clear: clearTemplateStructure,
    } = useMolstarStructure(pluginRef, {
        enabledRepresentations: templateEnabledReps,
        defaultColorScheme: 'uniform',
        labelsEnabled: { element: false, residue: false, chain: false },
        representationAlphaByRep: templateAlphaByRep,
        tagPrefix: 'template',
    });

    useMolstarSelection({
        pluginRef,
        pluginInitialized,
        structure,
        hoveredMonomer,
        handleMonomerHover,
    });

    // Imperative API
    useImperativeHandle(ref, () => ({
        resetZoom: () => pluginRef.current?.canvas3d?.requestCameraReset?.(),
        orientAxes: () => pluginRef.current?.managers.camera.orientAxes(undefined, 0),
        resetAxes: () => pluginRef.current?.managers.camera.resetAxes(),
        resize: () => pluginRef.current?.canvas3d?.requestResize?.(),
        // Legacy: exclusive representation (kept for compatibility)
        setRepresentation: (type) => setEnabledRepresentations([type].filter(Boolean)),
        // New: multi-representation control
        setRepresentationEnabled: (type, enabled) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            setEnabledRepresentations(prev => {
                const arr = Array.isArray(prev) ? prev : [];
                const has = arr.includes(rep);
                if (enabled && has) return arr;
                if (!enabled && !has) return arr;
                if (enabled) return [...arr, rep];
                return arr.filter(x => x !== rep);
            });
        },
        toggleRepresentation: (type) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            setEnabledRepresentations(prev => {
                const arr = Array.isArray(prev) ? prev : [];
                return arr.includes(rep) ? arr.filter(x => x !== rep) : [...arr, rep];
            });
        },
        getEnabledRepresentations: () => enabledRepresentations,
        setLabelEnabled: (level, enabled) => {
            if (!level) return;
            setLabelsEnabled((prev) => ({ ...prev, [String(level)]: !!enabled }));
        },
        getLabelsEnabled: () => labelsEnabled,
        // Back-compat: treat "atom labels" as element labels
        setAtomLabelsEnabled: (enabled) => setLabelsEnabled((prev) => ({ ...prev, element: !!enabled })),
        toggleAtomLabels: () => setLabelsEnabled((prev) => ({ ...prev, element: !prev.element })),
        getAtomLabelsEnabled: () => !!labelsEnabled.element,
        setColorScheme: (scheme) => setColorScheme(scheme),
        setRepresentationAlphaFor: (type, alpha) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            const a = Number(alpha);
            if (!Number.isFinite(a)) return;
            const clamped = Math.min(1, Math.max(0, a));
            setRepresentationAlphaByRep((prev) => ({ ...prev, [rep]: clamped }));
        },
        getRepresentationAlphaFor: (type) => {
            const rep = String(type || '').trim();
            if (!rep) return 1;
            const v = representationAlphaByRep?.[rep];
            return typeof v === 'number' && Number.isFinite(v) ? v : 1;
        },
        takeScreenshot: () => {
            try {
                // Mol* defaults the filename to a placeholder; pass an explicit name.
                pluginRef.current?.helpers?.viewportScreenshot?.download?.('pep-edit_3d.png');
            } catch {
                // ignore
            }
        },
        clear: async () => {
            try { await pluginRef.current?.clear?.(); } catch { }
        },
    }), [pluginRef, enabledRepresentations, labelsEnabled, representationAlphaByRep]);

    // Keep enabled representations in sync when defaultRepresentation prop changes
    useEffect(() => {
        setEnabledRepresentations([defaultRepresentation].filter(Boolean));
    }, [defaultRepresentation]);

    // Load structure once the plugin is initialized and whenever the source props change.
    useEffect(() => {
        if (!pluginInitialized) return;
        if (pdbId) loadFromPdbId(pdbId);
        else if (pdbFile) loadFromPdbFile(pdbFile);
        else if (blobFile) loadFromBlob(blobFile);
        else if (pdbURL) loadFromURL(pdbURL);
        else if (pdbRawData) loadFromRawData(pdbRawData);
        // if nothing provided, do nothing (shows "No structure")
    }, [pluginInitialized, pdbId, pdbFile, blobFile, pdbURL, pdbRawData, loadFromPdbId, loadFromPdbFile, loadFromBlob, loadFromURL, loadFromRawData]);

    // Load template overlay only when the template changes (not when peptide changes).
    const lastTemplateKeyRef = useRef(null);
    useEffect(() => {
        if (!pluginInitialized) return;
        const key = templateKey ? String(templateKey) : null;

        // If scaffold/template has been removed, unload any previously loaded overlay.
        if (!key) {
            lastTemplateKeyRef.current = null;
            clearTemplateStructure?.();
            return;
        }

        // If overlay is disabled we simply don't (re)load; existing structure can stay cached.
        if (!templatePdbRawData) return;
        if (lastTemplateKeyRef.current === key) return;
        lastTemplateKeyRef.current = key;
        loadTemplateFromRawData(templatePdbRawData, 'pdb');
    }, [pluginInitialized, templateKey, templatePdbRawData, loadTemplateFromRawData, clearTemplateStructure]);

    const templateMappedSig = useMemo(() => {
        const arr = Array.isArray(templateMappings) ? templateMappings : [];
        if (!templateVisible || !arr.length) return '';
        return arr
            .filter((m) => m?.enabled)
            .map((m) => {
                const chainId = m?.chainId ?? m?.chain_id ?? '';
                const start = m?.start ?? '';
                const end = m?.end ?? '';
                const masks = Array.isArray(m?.manualMasks) ? m.manualMasks.join(',') : Array.isArray(m?.manual_masks) ? m.manual_masks.join(',') : '';
                return `${chainId}:${start}-${end}:${masks}`;
            })
            .sort()
            .join('|');
    }, [templateMappings, templateVisible]);

    // Add a slightly stronger representation for the mapped residues on the template.
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        if (!templateStructure) return;

        const plugin = pluginRef.current;
        const rootRef = templateStructure?.cell?.transform?.ref;
        if (!rootRef) return;

        const mappedTag = 'template:mapped';
        const mappedRepTagCartoon = 'template:mapped-rep:cartoon';
        const mappedRepTagLine = 'template:mapped-rep:line';

        const removeTagInTemplate = async (tag) => {
            const sel = StateSelection.Generators.byRef(rootRef).subtree().withTag(tag);
            const cells = StateSelection.select(sel, plugin.state.data);
            if (!cells || cells.length === 0) return;
            const builder = plugin.state.data.build();
            for (let i = cells.length - 1; i >= 0; i--) {
                const ref = cells[i]?.transform?.ref;
                if (!ref) continue;
                builder.delete(ref);
            }
            await builder.commit();
        };

        const run = async () => {
            // Always remove previous mapped component/reps before re-applying.
            await removeTagInTemplate(mappedRepTagCartoon);
            await removeTagInTemplate(mappedRepTagLine);
            await removeTagInTemplate(mappedTag);

            // When the overlay is hidden, ensure no mapped-only reps remain.
            if (!templateVisible) return;

            const mappings = Array.isArray(templateMappings) ? templateMappings : [];
            const enabled = mappings.filter((m) => m?.enabled && m?.start != null && m?.end != null);
            if (!enabled.length) return;

            const queries = enabled.flatMap((m) => {
                const chainId = String(m?.chainId ?? m?.chain_id ?? '').trim();
                const start = Number(m.start);
                const end = Number(m.end);
                if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

                // manualMasks are indices in the AA-length template slice (0-based)
                const manualMasks = Array.isArray(m?.manualMasks)
                    ? m.manualMasks
                    : Array.isArray(m?.manual_masks)
                        ? m.manual_masks
                        : [];
                const masked = new Set(
                    manualMasks
                        .map((x) => Number(x))
                        .filter((x) => Number.isFinite(x) && x >= 0)
                        .map((x) => Math.trunc(x)),
                );

                // Prefer index-based mapping: selection is built in label_seq_id space.
                // This avoids issues when the displayed residue numbering has gaps/insertion codes.
                const templateResidues = Array.isArray(m?.templateResidues) ? m.templateResidues : [];
                const baseStart = Math.min(start, end);
                const intervals = [];

                if (templateResidues.length) {
                    let runStartIdx = null;
                    let prevIdx = null;
                    for (let i = 0; i < templateResidues.length; i++) {
                        if (masked.has(i)) {
                            if (runStartIdx != null && prevIdx != null) {
                                intervals.push([baseStart + runStartIdx, baseStart + prevIdx]);
                            }
                            runStartIdx = null;
                            prevIdx = null;
                            continue;
                        }
                        if (runStartIdx == null) runStartIdx = i;
                        prevIdx = i;
                    }
                    if (runStartIdx != null && prevIdx != null) {
                        intervals.push([baseStart + runStartIdx, baseStart + prevIdx]);
                    }

                    // If everything is masked, don't create any query for this mapping.
                    if (intervals.length === 0) return [];
                } else {
                    // Fallback: use start/end as a single interval.
                    const s = Math.min(start, end);
                    const e = Math.max(start, end);
                    intervals.push([s, e]);
                }

                // Note: uses label_* fields. If backend numbering differs (auth_*), mapped highlighting may be imperfect.
                // Important: build ONE atomGroups query per mapping, using OR across intervals.
                // Unioning multiple atomGroups can behave unexpectedly (only the first interval applies).
                const rangeTests = intervals.map(([s, e]) =>
                    MS.core.rel.inRange([MS.struct.atomProperty.macromolecular.label_seq_id(), s, e]),
                );
                if (!rangeTests.length) return [];

                const rangeExpr = rangeTests.length === 1 ? rangeTests[0] : MS.core.logic.or(rangeTests);
                const residueTest = chainId
                    ? MS.core.logic.and([
                        MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), chainId]),
                        rangeExpr,
                    ])
                    : rangeExpr;

                return [
                    MS.struct.generator.atomGroups({
                        'residue-test': residueTest,
                        'group-by': MS.struct.atomProperty.macromolecular.residueKey(),
                    }),
                ];
            }).filter(Boolean);

            if (!queries.length) return;

            const expr = queries.length === 1 ? queries[0] : MS.struct.modifier.union(queries);
            const q = StructureSelectionQuery('Mapped Template Residues', expr, { tags: [mappedTag] });

            const comp = await plugin.builders.structure.tryCreateComponentFromSelection(
                templateStructure,
                q,
                'template-mapped',
                { label: 'Mapped', tags: [mappedTag] },
            );

            if (!comp) return;

            const base = Math.min(1, Math.max(0, Number(templateOpacity) || 0));
            const mappedAlpha = Math.min(1, base + 0.35);

            await plugin.builders.structure.representation.addRepresentation(
                comp,
                { type: 'cartoon', color: 'chain-id', typeParams: { alpha: mappedAlpha } },
                { tag: mappedRepTagCartoon },
            );

            await plugin.builders.structure.representation.addRepresentation(
                comp,
                { type: 'line', color: 'chain-id', typeParams: { alpha: Math.min(1, mappedAlpha * 0.85) } },
                { tag: mappedRepTagLine },
            );
        };

        run().catch((e) => {
            console.warn('Mol* template mapped representation failed:', e);
        });
    }, [pluginInitialized, pluginRef, templateStructure, templateVisible, templateMappings, templateMappedSig, templateOpacity]);

    return (
        <div className="molstar-viewer mx-auto text-center absolute inset-0">
            {/* Host container for Mol* plugin */}
            <div
                ref={containerRef}
                className="relative w-full h-full overflow-hidden border border-dashed rounded-lg"
                style={{ width, height }}
            >
                {/* Canvas is always present */}
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%'}}
                />
            </div>
        </div>
    );
};

const Viewer3D = forwardRef(Viewer3DInner);
export { Viewer3D };