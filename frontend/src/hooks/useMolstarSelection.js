import { useEffect, useRef } from "react";
import { Script } from "molstar/lib/mol-script/script";
import { StructureElement, StructureSelection } from "molstar/lib/mol-model/structure";
import { StructureProperties } from "molstar/lib/mol-model/structure";
import { EmptyLoci } from 'molstar/lib/mol-model/loci';
import { Bond } from 'molstar/lib/mol-model/structure';
import { hoveredTemplateResidueStore } from '../state/hoveredTemplateResidueStore';

export function useMolstarSelection({
    pluginRef,
    pluginInitialized,
    structure,
    templateStructure,
    hoveredMonomer, // e.g. "A-3"
    handleMonomerHover, // callback from parent (optional)
}) {
    const hoverHighlightRafIdRef = useRef(null);
    const lastHoverHighlightedResidueRef = useRef(null);
    // Keep a ref to the latest handler to avoid stale closures
    const hoverHandlerRef = useRef(handleMonomerHover);
    useEffect(() => { hoverHandlerRef.current = handleMonomerHover; }, [handleMonomerHover]);

    // Keep refs to the latest structures so the hover subscription (registered once)
    // can correctly classify loci even if template loads later.
    const mainStructureRef = useRef(null);
    const templateStructureRef = useRef(null);
    useEffect(() => {
        mainStructureRef.current = structure?.cell?.obj?.data ?? null;
    }, [structure]);
    useEffect(() => {
        templateStructureRef.current = templateStructure?.cell?.obj?.data ?? null;
    }, [templateStructure]);

    // Subscribe to Mol* hover events ONCE
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        const plugin = pluginRef.current;

        const handleMolstarHover = (event) => {
            if (!event.current || !event.current.loci || event.current.loci.kind === 'empty-loci') {
                hoveredTemplateResidueStore.clear();
                hoverHandlerRef.current && hoverHandlerRef.current('');
                return;
            }
            const loci = event.current.loci;

            const resolveTarget = (s) => {
                const mainStruct = mainStructureRef.current;
                const templateStruct = templateStructureRef.current;
                if (s && templateStruct && s === templateStruct) return 'template';
                if (s && mainStruct && s === mainStruct) return 'main';
                return 'unknown';
            };

            if (StructureElement.Loci.is(loci)) {
                const loc = StructureElement.Loci.getFirstLocation(loci);
                if (loc) {
                    const target = resolveTarget(loc.structure);
                    const residueId = StructureProperties.residue.label_seq_id(loc);
                    const chainId = StructureProperties.chain.label_asym_id(loc);

                    if (target === 'template') {
                        // Publish to template-hover store; clear sequence hover.
                        hoveredTemplateResidueStore.set({ chainId, resid: residueId });
                        hoverHandlerRef.current && hoverHandlerRef.current('');
                        return;
                    }
                    if (target === 'unknown') {
                        // Strict ignore — clear both paths.
                        hoveredTemplateResidueStore.clear();
                        hoverHandlerRef.current && hoverHandlerRef.current('');
                        return;
                    }
                    // target === 'main'
                    hoveredTemplateResidueStore.clear();
                    hoverHandlerRef.current && hoverHandlerRef.current({
                        origin: 'molstarViewer',
                        target,
                        chainId,
                        resid: residueId,
                    });
                }
            } else if (Bond.isLoci(loci)) {
                const bondLoc = loci.bonds[0];
                if (bondLoc) {
                    const target = resolveTarget(loci.structure);
                    if (target === 'template') {
                        // Bond hover on template: extract resid and publish to template store.
                        const aUnit = bondLoc.aUnit;
                        const aIndex = bondLoc.aIndex;
                        const aElement = aUnit?.elements?.[aIndex];
                        const bLoc = {
                            structure: loci.structure,
                            unit: aUnit,
                            element: aElement != null ? aElement : aIndex,
                        };
                        const residueId = StructureProperties.residue.label_seq_id(bLoc);
                        const chainId = StructureProperties.chain.label_asym_id(bLoc);
                        hoveredTemplateResidueStore.set({ chainId, resid: residueId });
                        hoverHandlerRef.current && hoverHandlerRef.current('');
                        return;
                    }
                    if (target === 'unknown') {
                        hoveredTemplateResidueStore.clear();
                        hoverHandlerRef.current && hoverHandlerRef.current('');
                        return;
                    }
                    hoveredTemplateResidueStore.clear();
                    // Build a residue id the same way as atom hover: label_seq_id
                    const aUnit = bondLoc.aUnit;
                    const aIndex = bondLoc.aIndex;
                    const aElement = aUnit?.elements?.[aIndex];
                    const loc = {
                        structure: loci.structure,
                        unit: aUnit,
                        // StructureProperties expects an element id, not the index into unit.elements
                        element: aElement != null ? aElement : aIndex,
                    };
                    const residueId = StructureProperties.residue.label_seq_id(loc);
                    const chainId = StructureProperties.chain.label_asym_id(loc);
                    hoverHandlerRef.current && hoverHandlerRef.current({
                        origin: 'molstarViewer',
                        target,
                        chainId,
                        resid: residueId,
                    });
                }
            }
        };

        plugin.behaviors.interaction.hover.subscribe(handleMolstarHover);

        return () => {
            try {
                plugin.behaviors.interaction.hover.unsubscribe(handleMolstarHover);
            } catch (e) {
                // ignore
            }
        };
    }, [pluginInitialized, pluginRef]);

    // Highlight selection in Mol* when hoveredMonomer changes
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        const plugin = pluginRef.current;
        if (hoverHighlightRafIdRef.current) {
            cancelAnimationFrame(hoverHighlightRafIdRef.current);
            hoverHighlightRafIdRef.current = null;
        }

        // Parse target residue (or null to clear).
        let selectedResidue = null;
        if (hoveredMonomer) {
            const idx = parseInt(String(hoveredMonomer).split('-')[1], 10);
            if (Number.isFinite(idx)) selectedResidue = idx + 1;
        }

        // Skip redundant work.
        if (selectedResidue != null && lastHoverHighlightedResidueRef.current === selectedResidue) return;

        hoverHighlightRafIdRef.current = requestAnimationFrame(() => {
            hoverHighlightRafIdRef.current = null;

            if (selectedResidue == null) {
                lastHoverHighlightedResidueRef.current = null;
                plugin.managers.interactivity.lociHighlights.highlightOnly({ loci: EmptyLoci });
                return;
            }

            const data = structure?.cell?.obj?.data
                || plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
            if (!data) return;

            try {
                const sel = Script.getStructureSelection((Q) =>
                    Q.struct.generator.atomGroups({
                        "residue-test": Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), selectedResidue]),
                        "group-by": Q.struct.atomProperty.macromolecular.residueKey(),
                    }),
                    data
                );
                const loci = StructureSelection.toLociWithSourceUnits(sel);
                lastHoverHighlightedResidueRef.current = selectedResidue;
                plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
            } catch {
                // ignore
            }
        });

        return () => {
            if (hoverHighlightRafIdRef.current) {
                cancelAnimationFrame(hoverHighlightRafIdRef.current);
                hoverHighlightRafIdRef.current = null;
            }
        };
    }, [hoveredMonomer, pluginInitialized, pluginRef, structure]);

        // Select residue by position
        // useEffect(() => {
        //     if (!pluginInitialized) return;
        //     if (!pluginRef.current) return;
    
        //     const plugin = pluginRef.current;
        //     if (!hoveredMonomer) {
        //         plugin?.managers.interactivity.lociHighlights.highlightOnly({ loci: EmptyLoci });
        //         return;
        //     }
    
        //     const selectedResidue = parseInt(hoveredMonomer.split('-')[1]) + 1;
        //     if (isNaN(selectedResidue)) return;
    
        //     const data = plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
        //     if (!data) return;
    
        //     const sel = Script.getStructureSelection((Q) =>
        //         Q.struct.generator.atomGroups({
        //             "residue-test": Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), selectedResidue,]),
        //             "group-by": Q.struct.atomProperty.macromolecular.residueKey(),
        //         }),
        //         data
        //     );
        //     const loci = StructureSelection.toLociWithSourceUnits(sel);  // lociSelects
        //     plugin?.managers.interactivity.lociHighlights.highlightOnly({ loci, });
    
        // }, [hoveredMonomer, pluginInitialized]);
}
