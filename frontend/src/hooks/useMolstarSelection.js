import { useEffect, useRef } from "react";
import { Script } from "molstar/lib/mol-script/script";
import { StructureElement, StructureSelection } from "molstar/lib/mol-model/structure";
import { StructureProperties } from "molstar/lib/mol-model/structure";
import { EmptyLoci } from 'molstar/lib/mol-model/loci';
import { Bond } from 'molstar/lib/mol-model/structure';

export function useMolstarSelection({
    pluginRef,
    pluginInitialized,
    structure,
    hoveredMonomer, // e.g. "A-3"
    handleMonomerHover, // callback from parent (optional)
}) {
    // Keep a ref to the latest handler to avoid stale closures
    const hoverHandlerRef = useRef(handleMonomerHover);
    useEffect(() => { hoverHandlerRef.current = handleMonomerHover; }, [handleMonomerHover]);

    // Subscribe to Mol* hover events ONCE
    useEffect(() => {
        if (!pluginInitialized || !pluginRef.current) return;
        const plugin = pluginRef.current;

        const handleMolstarHover = (event) => {
            if (!event.current || !event.current.loci || event.current.loci.kind === 'empty-loci') {
                hoverHandlerRef.current && hoverHandlerRef.current('');
                return;
            }
            const loci = event.current.loci;

            if (StructureElement.Loci.is(loci)) {
                const loc = StructureElement.Loci.getFirstLocation(loci);
                if (loc) {
                    const residueId = StructureProperties.residue.label_seq_id(loc);
                    hoverHandlerRef.current && hoverHandlerRef.current({
                        origin: 'molstarViewer',
                        resid: residueId,
                    });
                }
            } else if (Bond.isLoci(loci)) {
                const bondLoc = loci.bonds[0];
                if (bondLoc) {
                    const a = bondLoc.aUnit;
                    const aIndex = bondLoc.aIndex;
                    const residueId = a.getResidueIndex(aIndex) + 1;
                    hoverHandlerRef.current && hoverHandlerRef.current({
                        origin: 'molstarViewer',
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
        if (!hoveredMonomer) {
            plugin.managers.interactivity.lociHighlights.highlightOnly({ loci: EmptyLoci });
            return;
        }
        // Extract numeric index from monomer id, e.g. "A-3" => 3 (or your format)
        const selectedResidue = parseInt(hoveredMonomer.split('-')[1]) + 1;
        if (isNaN(selectedResidue)) return;

        const data = structure?.cell?.obj?.data
            || plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
        if (!data) return;

        const sel = Script.getStructureSelection((Q) =>
            Q.struct.generator.atomGroups({
                "residue-test": Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), selectedResidue]),
                "group-by": Q.struct.atomProperty.macromolecular.residueKey(),
            }),
            data
        );
        const loci = StructureSelection.toLociWithSourceUnits(sel);
        plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
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
