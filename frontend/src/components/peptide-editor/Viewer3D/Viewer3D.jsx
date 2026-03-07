import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';

import { useMolstarPlugin } from '../../../hooks/useMolstarPlugin';
import { useMolstarStructure } from '../../../hooks/useMolstarStructure';
import { useMolstarSelection } from '../../../hooks/useMolstarSelection';

import { StructureSelectionQuery } from 'molstar/lib/mol-plugin-state/helpers/structure-selection-query';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { StateSelection } from 'molstar/lib/mol-state/state/selection';
import { Script } from 'molstar/lib/mol-script/script';
import { StructureSelection } from 'molstar/lib/mol-model/structure';
import { StructureElement, StructureProperties, Bond } from 'molstar/lib/mol-model/structure';


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
    hoveredMonomerLabel,
    handleMonomerHover,
    defaultRepresentation = 'ball-and-stick',
    defaultColorScheme = 'chain-id',
    background = 'light',
    lockCamera = false,
    height = '20rem',
    width = '100%',
    isGenerating3D = false,
    error,
}, ref) => {
    const [enabledRepresentations, setEnabledRepresentations] = useState(() => [defaultRepresentation].filter(Boolean));
    const [colorScheme, setColorScheme] = useState(defaultColorScheme);
    const [labelsEnabled, setLabelsEnabled] = useState({ element: false, residue: false, chain: false });
    const [representationAlphaByRep, setRepresentationAlphaByRep] = useState({});
    const [hoverLabel, setHoverLabel] = useState('');
    const [uiHoverLabel, setUiHoverLabel] = useState('');

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
        lockCamera,
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
        templateStructure,
        hoveredMonomer,
        handleMonomerHover,
    });

    // When the user hovers a residue in the chain sequence UI, show a label
    // computed by the parent (avoids expensive Mol* selection queries on hover).
    useEffect(() => {
        setUiHoverLabel(hoveredMonomerLabel ? String(hoveredMonomerLabel) : '');
    }, [hoveredMonomerLabel]);

    // Bottom-right hover label inside the Mol* viewer.
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        const plugin = pluginRef.current;

        const handleHover = (event) => {
            try {
                const loci = event?.current?.loci;
                if (!loci || loci.kind === 'empty-loci') {
                    setHoverLabel('');
                    return;
                }

                if (StructureElement.Loci.is(loci)) {
                    const loc = StructureElement.Loci.getFirstLocation(loci);
                    if (!loc) {
                        setHoverLabel('');
                        return;
                    }

                    const chain = StructureProperties.chain.label_asym_id(loc);
                    const comp = StructureProperties.atom.label_comp_id(loc);
                    const seq = StructureProperties.residue.label_seq_id(loc);
                    if (!chain || !comp || !seq) {
                        setHoverLabel('');
                        return;
                    }

                    setHoverLabel(`${chain} ${String(comp).toUpperCase()} ${seq}`);
                    return;
                }

                // If hovering over a bond, try to still show the residue.
                if (Bond.isLoci(loci)) {
                    const bondLoc = loci.bonds?.[0];
                    if (!bondLoc) {
                        setHoverLabel('');
                        return;
                    }
                    const aUnit = bondLoc.aUnit;
                    const aIndex = bondLoc.aIndex;
                    const aElement = aUnit?.elements?.[aIndex];
                    const loc = {
                        structure: loci.structure,
                        unit: aUnit,
                        // StructureProperties expects an element id, not the index into unit.elements
                        element: aElement != null ? aElement : aIndex,
                    };
                    const chain = StructureProperties.chain.label_asym_id(loc);
                    const comp = StructureProperties.atom.label_comp_id(loc);
                    const seq = StructureProperties.residue.label_seq_id(loc);
                    if (!chain || !comp || !seq) {
                        setHoverLabel('');
                        return;
                    }
                    setHoverLabel(`${chain} ${String(comp).toUpperCase()} ${seq}`);
                    return;
                }

                setHoverLabel('');
            } catch {
                setHoverLabel('');
            }
        };

        plugin.behaviors.interaction.hover.subscribe(handleHover);
        return () => {
            try { plugin.behaviors.interaction.hover.unsubscribe(handleHover); } catch { }
        };
    }, [pluginInitialized, pluginRef]);

    // Imperative API
    useImperativeHandle(ref, () => ({
        resetZoom: () => pluginRef.current?.canvas3d?.requestCameraReset?.(),
        orientAxes: () => pluginRef.current?.managers.camera.orientAxes(undefined, 0),
        resetAxes: () => pluginRef.current?.managers.camera.resetAxes(),
        resize: () => pluginRef.current?.canvas3d?.requestResize?.(),
        focusChain: ({ target = 'main', chainId } = {}) => {
            const plugin = pluginRef.current;
            if (!plugin) return;

            const chain = String(chainId ?? '').trim();
            if (!chain) return;

            const data = (target === 'template'
                ? templateStructure?.cell?.obj?.data
                : structure?.cell?.obj?.data);
            if (!data) return;

            try {
                const sel = Script.getStructureSelection((Q) => Q.struct.generator.atomGroups({
                    'chain-test': Q.core.rel.eq([
                        Q.struct.atomProperty.macromolecular.label_asym_id(),
                        chain,
                    ]),
                }), data);

                const loci = StructureSelection.toLociWithSourceUnits(sel);
                plugin.managers.camera.focusLoci(loci, { extraRadius: 1 });
            } catch {
                // ignore
            }
        },
        focusResidue: ({ target = 'main', chainId, seqId, debug } = {}) => {
            const plugin = pluginRef.current;
            if (!plugin) return;

            const seq = Number(seqId);
            const chain = String(chainId ?? '').trim();
            if (!Number.isFinite(seq)) return;

            const data = (target === 'template'
                ? templateStructure?.cell?.obj?.data
                : structure?.cell?.obj?.data);
            if (!data) return;

            try {
                const residueTest = chain
                    ? (Q) => Q.core.logic.and([
                        Q.core.rel.eq([
                            Q.struct.atomProperty.macromolecular.label_asym_id(),
                            chain,
                        ]),
                        Q.core.rel.eq([
                            Q.struct.atomProperty.macromolecular.label_seq_id(),
                            seq,
                        ]),
                    ])
                    : (Q) => Q.core.rel.eq([
                        Q.struct.atomProperty.macromolecular.label_seq_id(),
                        seq,
                    ]);

                const sel = Script.getStructureSelection((Q) => Q.struct.generator.atomGroups({
                    'residue-test': residueTest(Q),
                    'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
                }), data);

                const loci = StructureSelection.toLociWithSourceUnits(sel);

                if (debug) {
                    try {
                        const loc = StructureElement.Loci.getFirstLocation(loci);
                        if (loc) {
                            // eslint-disable-next-line no-console
                            console.debug('[pp-focus-residue] focus match', {
                                requested: { target, chainId: chain || undefined, seqId: seq },
                                debug,
                                label_asym_id: StructureProperties.chain.label_asym_id(loc),
                                auth_asym_id: StructureProperties.chain.auth_asym_id?.(loc),
                                label_seq_id: StructureProperties.residue.label_seq_id(loc),
                                auth_seq_id: StructureProperties.residue.auth_seq_id?.(loc),
                                label_comp_id: StructureProperties.atom.label_comp_id?.(loc),
                            });
                        } else {
                            // eslint-disable-next-line no-console
                            console.debug('[pp-focus-residue] focus match: no location', { requested: { target, chainId: chain || undefined, seqId: seq }, debug });
                        }
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.debug('[pp-focus-residue] focus debug failed', e);
                    }
                }
                plugin.managers.camera.focusLoci(loci, { extraRadius: 2 });
            } catch {
                // ignore
            }
        },
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
        /** Return a data-URI (PNG) of the current 3D viewport. */
        getScreenshotDataUri: async () => {
            try {
                return await pluginRef.current?.helpers?.viewportScreenshot?.getImageDataUri?.() ?? null;
            } catch {
                return null;
            }
        },
        getCameraSnapshot: () => {
            try {
                return pluginRef.current?.canvas3d?.camera?.getSnapshot?.() ?? null;
            } catch {
                return null;
            }
        },
        setCameraSnapshot: (snapshot, duration = 0) => {
            try {
                pluginRef.current?.managers?.camera?.setSnapshot?.(snapshot, duration);
            } catch {
                // ignore
            }
        },
        clear: async () => {
            try { await pluginRef.current?.clear?.(); } catch { }
        },
    }), [pluginRef, enabledRepresentations, labelsEnabled, representationAlphaByRep, structure, templateStructure]);

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

    // Signature of the active (enabled) template chain IDs, used to trigger the
    // chain highlight effect without reacting to every mapping field change.
    const templateActiveChainsSig = useMemo(() => {
        const arr = Array.isArray(templateMappings) ? templateMappings : [];
        if (!templateVisible || !arr.length) return '';
        return arr
            .filter((m) => m?.enabled)
            .map((m) => String(m?.chainId ?? m?.chain_id ?? '').trim())
            .filter(Boolean)
            .sort()
            .join(',');
    }, [templateMappings, templateVisible]);

    // Highlight the full PDB chains that have an enabled mapping.
    // Uses a warm muted gold that harmonizes with the mapped-residue amber but
    // is softer/more transparent, giving a subtle "halo" that makes the active
    // chain(s) distinguishable from inactive ones in multi-chain templates.
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        if (!templateStructure) return;

        const plugin = pluginRef.current;
        const rootRef = templateStructure?.cell?.transform?.ref;
        if (!rootRef) return;

        const chainHighlightTag = 'template:active-chain';
        const chainRepTagCartoon = 'template:active-chain-rep:cartoon';

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
            // Always clean up previous chain highlights.
            await removeTagInTemplate(chainRepTagCartoon);
            await removeTagInTemplate(chainHighlightTag);

            if (!templateVisible) return;

            const mappings = Array.isArray(templateMappings) ? templateMappings : [];
            const activeChainIds = [
                ...new Set(
                    mappings
                        .filter((m) => m?.enabled)
                        .map((m) => String(m?.chainId ?? m?.chain_id ?? '').trim())
                        .filter(Boolean),
                ),
            ];
            if (!activeChainIds.length) return;

            // Build a chain-test that matches any of the active chains.
            const chainTests = activeChainIds.map((id) =>
                MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), id]),
            );
            const chainTest = chainTests.length === 1 ? chainTests[0] : MS.core.logic.or(chainTests);

            const expr = MS.struct.generator.atomGroups({
                'chain-test': chainTest,
            });
            const q = StructureSelectionQuery('Active Template Chains', expr, { tags: [chainHighlightTag] });

            const comp = await plugin.builders.structure.tryCreateComponentFromSelection(
                templateStructure,
                q,
                'template-active-chain',
                { label: 'Active Chains', tags: [chainHighlightTag] },
            );

            if (!comp) return;

            const base = Math.min(1, Math.max(0, Number(templateOpacity) || 0));
            // Slightly above the base template opacity so the chain "glows" above the
            // neutral background chains, but well below the mapped-residue highlight.
            const chainAlpha = Math.min(1, base + 0.15);

            // Warm muted gold — adjacent to the mapped-residue amber (0xffb300) but
            // desaturated and darker so it reads as a subtle halo rather than a clash.
            const chainColorParams = { value: 0xc49a3c };

            await plugin.builders.structure.representation.addRepresentation(
                comp,
                { type: 'cartoon', color: 'uniform', colorParams: chainColorParams, typeParams: { alpha: chainAlpha } },
                { tag: chainRepTagCartoon },
            );
        };

        run().catch((e) => {
            console.warn('Mol* template active chain highlight failed:', e);
        });
    }, [pluginInitialized, pluginRef, templateStructure, templateVisible, templateMappings, templateActiveChainsSig, templateOpacity]);


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
            // Only include mappings with valid numeric residue bounds (>= 1). Empty strings often coerce to 0.
            const enabled = mappings.filter((m) => {
                if (!m?.enabled) return false;
                const start = Number(m?.start);
                const end = Number(m?.end);
                return Number.isFinite(start) && Number.isFinite(end) && start >= 1 && end >= 1;
            });
            if (!enabled.length) return;

            // Build ONE atomGroups selection across ALL enabled mappings.
            // This avoids MolScript union edge cases where only the first mapping applies.
            const clauses = enabled.flatMap((m) => {
                const chainId = String(m?.chainId ?? m?.chain_id ?? '').trim();
                const start = Number(m.start);
                const end = Number(m.end);
                if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) return [];

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
                    if (intervals.length === 0) return [];
                } else {
                    const s = Math.min(start, end);
                    const e = Math.max(start, end);
                    intervals.push([s, e]);
                }

                const rangeTests = intervals.map(([s, e]) =>
                    MS.core.rel.inRange([MS.struct.atomProperty.macromolecular.label_seq_id(), s, e]),
                );
                if (!rangeTests.length) return [];

                const rangeExpr = rangeTests.length === 1 ? rangeTests[0] : MS.core.logic.or(rangeTests);
                const clause = chainId
                    ? MS.core.logic.and([
                        MS.core.rel.eq([MS.struct.atomProperty.macromolecular.label_asym_id(), chainId]),
                        rangeExpr,
                    ])
                    : rangeExpr;

                return [clause];
            });

            if (!clauses.length) return;

            const residueTest = clauses.length === 1 ? clauses[0] : MS.core.logic.or(clauses);
            const expr = MS.struct.generator.atomGroups({
                'residue-test': residueTest,
                'group-by': MS.struct.atomProperty.macromolecular.residueKey(),
            });
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

            // Use a uniform tint for mapped residues so highlights are visually consistent.
            const mappedColorParams = { value: 0xffb300 };

            await plugin.builders.structure.representation.addRepresentation(
                comp,
                { type: 'cartoon', color: 'uniform', colorParams: mappedColorParams, typeParams: { alpha: mappedAlpha } },
                { tag: mappedRepTagCartoon },
            );

            await plugin.builders.structure.representation.addRepresentation(
                comp,
                { type: 'line', color: 'uniform', colorParams: mappedColorParams, typeParams: { alpha: Math.min(1, mappedAlpha * 0.85) } },
                { tag: mappedRepTagLine },
            );
        };

        run().catch((e) => {
            console.warn('Mol* template mapped representation failed:', e);
        });
    }, [pluginInitialized, pluginRef, templateStructure, templateVisible, templateMappings, templateMappedSig, templateOpacity]);


    return (
        <div className="molstar-viewer absolute inset-0">
            <div className="relative w-full h-full">
                {/* Host container for Mol* plugin */}
                <div
                    ref={containerRef}
                    className="absolute inset-0 overflow-hidden rounded-md"
                    style={{ minHeight: 0 }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>

                {/* Overlay frame: always stays visible above Mol* content */}
                <div className="pointer-events-none absolute inset-0 z-20 border border-dashed rounded-md" />

                {(hoverLabel || uiHoverLabel) && (
                    <div
                        className="absolute bottom-2 right-2 z-30 px-2 py-1 text-xs rounded"
                        style={{
                            background: 'rgba(0,0,0,0.55)',
                            color: 'white',
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}
                    >
                        {hoverLabel || uiHoverLabel}
                    </div>
                )}
            </div>
        </div>
    );
};

const Viewer3D = forwardRef(Viewer3DInner);
export { Viewer3D };