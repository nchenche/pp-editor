import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { StateSelection, StateTransform } from "molstar/lib/mol-state";
import { Script } from 'molstar/lib/mol-script/script';
import { StructureSelection } from 'molstar/lib/mol-model/structure';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';

import { Structure, StructureProperties, } from "molstar/lib/mol-model/structure";
import { lociLabel } from "molstar/lib/mol-theme/label";
import { EmptyLoci } from 'molstar/lib/mol-model/loci';

import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";



const MolStarViewer = ({
    pdbFile,
    blobFile,
    pdbId,
    defaultRepresentation = 'cartoon',
    defaultColorScheme = 'chain-id',
    height = '400px',
    width = '100%'
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pluginRef = useRef(null);
    const [pluginInitialized, setPluginInitialized] = useState(false);
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentRepresentation, setCurrentRepresentation] = useState(defaultRepresentation);
    const [currentColorScheme, setCurrentColorScheme] = useState(defaultColorScheme);

    const [seqId, setSeqId] = useState('');

    // Initialize the plugin only once.
    useEffect(() => {
        const initPlugin = async () => {
            if (!canvasRef.current || !containerRef.current) return;
            try {

                const MySpec = {
                    ...DefaultPluginSpec(),
                    config: [
                        [PluginConfig.VolumeStreaming.Enabled, false]
                    ]
                }

                const plugin = new PluginContext(DefaultPluginSpec(MySpec));
                if (!plugin.initViewer(canvasRef.current, containerRef.current)) {
                    throw new Error('Failed to initialize MolStar viewer');
                }
                await plugin.init();


                pluginRef.current = plugin;
                window["molstar"] = plugin;
                window["Structure"] = Structure;
                window["StructureProperties"] = StructureProperties;
                window["lociLabel"] = lociLabel;

                setPluginInitialized(true);
            } catch (err) {
                console.error('Error initializing MolStar:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        initPlugin();

        return () => {
            if (pluginRef.current) {
                pluginRef.current.dispose();
            }
        };
    }, []);

    // Load structure once the plugin is initialized and whenever the source props change.
    useEffect(() => {
        if (!pluginInitialized) return;
        const loadStructure = async () => {
            setLoading(true);
            try {
                if (pdbId) {
                    await loadFromPdbId(pdbId);
                } else if (pdbFile) {
                    await loadFromPdbFile(pdbFile);
                } else if (blobFile) {
                    await loadFromBlob(blobFile);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error loading structure:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadStructure();
    }, [pluginInitialized, pdbId, pdbFile, blobFile]);


    // Select residue by position
    useEffect(() => {
        if (!pluginInitialized) return;
        if (!pluginRef.current) return;

        const plugin = pluginRef.current;
        if (!seqId) {
            plugin?.managers.interactivity.lociHighlights.highlightOnly({loci: EmptyLoci});
            return;
        }
        const selectedResidue = parseInt(seqId);
        if (isNaN(selectedResidue)) return;

        const data = plugin?.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
        if (!data) return;

        const sel = Script.getStructureSelection((Q) =>
            Q.struct.generator.atomGroups({
                "residue-test": Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), selectedResidue,]),
                "group-by": Q.struct.atomProperty.macromolecular.residueKey(),
            }),
            data
        );
        const loci = StructureSelection.toLociWithSourceUnits(sel);  // lociSelects
        plugin?.managers.interactivity.lociHighlights.highlightOnly({loci,});

    }, [seqId, pluginInitialized]);

    // Subscribe to residue selection events.
    useEffect(() => {

        if (!pluginInitialized) return;
        console.log('Plugin in useEffect:');

        const plugin = pluginRef.current;
        const handleClick = (event) => {

            const loci = event.current.loci;
            if (!loci || loci.length === 0 || loci.kind === 'empty-loci') return;
            // console.log('Loci:', loci);

            const label = lociLabel(loci, {htmlStyling: false, granularity: 'residue', hidePrefix: true, condensed: true});
            console.log('lociLabel:', label);
        };

        // Subscribe to the click event
        plugin.behaviors.interaction.hover.subscribe(handleClick);

        // Cleanup function to unsubscribe when the component unmounts
        return () => {
            plugin.behaviors.interaction.hover.unsubscribe(handleClick);
        };
    }, [pluginRef.current]); // Dependencies array


    // Update representation when the representation or color scheme changes.
    useEffect(() => {
        if (!structure || !pluginRef.current) return;
        updateRepresentation(currentRepresentation, currentColorScheme);
    }, [currentRepresentation, currentColorScheme]);


    // Memoized helper to determine file format.
    const determineFileFormat = useCallback((filename, mimeType) => {
        if (filename.endsWith('.pdb')) return 'pdb';
        if (filename.endsWith('.cif') || filename.endsWith('.mmcif')) return 'mmcif';
        if (filename.endsWith('.bcif')) return 'mmcif';
        if (filename.endsWith('.sdf')) return 'sdf';
        if (mimeType === 'chemical/x-pdb') return 'pdb';
        if (mimeType === 'chemical/x-mmcif') return 'mmcif';
        return 'pdb';
    }, []);

    // Process structure data, parse trajectory and create an initial representation.
    const processStructureData = useCallback(async (fileData, format) => {
        const trajectorySO = await pluginRef.current.builders.structure.parseTrajectory(fileData, format);
        const modelSO = await pluginRef.current.builders.structure.createModel(trajectorySO);
        const structureSO = await pluginRef.current.builders.structure.createStructure(modelSO);
        console.log('Structure:', structureSO);
        setStructure(structureSO);

        // Add the initial representation.
        await pluginRef.current.builders.structure.representation.addRepresentation(
            structureSO,
            { type: currentRepresentation, color: currentColorScheme },
            { tag: 'current-representation' }
        );
    }, [currentRepresentation, currentColorScheme]);

    const loadFromPdbId = useCallback(async (id) => {
        if (!pluginRef.current) return;
        try {
            await pluginRef.current.clear();
            const url = `https://models.rcsb.org/${id}.bcif`;
            const fileData = await pluginRef.current.builders.data.download({ url, isBinary: true });
            await processStructureData(fileData, 'mmcif');
        } catch (err) {
            setError(`Failed to load PDB ID ${id}: ${err.message}`);
            throw err;
        }
    }, [processStructureData]);

    const loadFromPdbFile = useCallback(async (file) => {
        if (!pluginRef.current) return;
        try {
            await pluginRef.current.clear();
            const fileData = await pluginRef.current.builders.data.readFile({ file });
            await processStructureData(fileData, 'pdb');
        } catch (err) {
            setError(`Failed to load PDB file: ${err.message}`);
            throw err;
        }
    }, [processStructureData]);

    const loadFromBlob = useCallback(async (blob) => {
        if (!pluginRef.current) return;
        try {
            await pluginRef.current.clear();
            const file = new File([blob], 'structure.pdb', { type: blob.type });
            const fileData = await pluginRef.current.builders.data.readFile({ file });
            const format = determineFileFormat(file.name, blob.type);
            await processStructureData(fileData, format);
        } catch (err) {
            setError(`Failed to load blob: ${err.message}`);
            throw err;
        }
    }, [determineFileFormat, processStructureData]);

    // Update the representation by deleting existing ones tagged 'current-representation'
    // and adding a new one.
    const updateRepresentation = useCallback(async (type, colorScheme, structureSO = structure) => {
        if (!structureSO || !pluginRef.current) return;

        console.log('Updating representation:', type, colorScheme);

        try {
            // const builder = pluginRef.current.build();
            // const representations = StateSelection.findWithAllTags(
            //     builder.getTree(),
            //     builder.toRoot().ref,
            //     new Set(['current-representation'])
            // );
            // console.log('Deleting representations:', representations);
            // if (representations.length !== 0) {
            //     representations.forEach((rep) => {
            //         if (rep.ref) builder.delete(rep.ref);
            //     });
            // }
            // builder.commit();
            await pluginRef.current.builders.structure.representation.addRepresentation(
                structureSO,
                { type, color: colorScheme },
                { tag: 'current-representation' }
            );
        } catch (err) {
            console.error('Failed to update representation:', err);
        }
    }, [structure]);

    const handleRepresentationChange = useCallback((representation) => {
        setCurrentRepresentation(representation);
    }, []);

    const handleColorSchemeChange = useCallback((colorScheme) => {
        setCurrentColorScheme(colorScheme);
    }, []);

    return (
        <div className="molstar-viewer mx-auto text-center">
            <h3 className="text-lg font-medium mb-2">Mol* Viewer</h3>

            <div>
                <input
                    type="text"
                    value={seqId}
                    onChange={(e) => setSeqId(e.target.value)}
                    placeholder="Residue ID to select"
                    className="w-64 p-2 border rounded text-sm mb-2"
                />
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: width,
                    height: height,
                    margin: '0 auto',
                    display: 'block',
                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%'
                    }}
                />

                {loading && (
                    <div className="loading-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        zIndex: 10
                    }}>
                        <span>Loading structure...</span>
                    </div>
                )}

                {error && (
                    <div className="error-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 200, 200, 0.7)',
                        zIndex: 10
                    }}>
                        <span>Error: {error}</span>
                    </div>
                )}
            </div>

            <div className="controls mt-2 flex gap-2">
                <RepresentationSelector
                    currentRepresentation={currentRepresentation}
                    onChange={handleRepresentationChange}
                />

                <ColorSchemeSelector
                    currentColorScheme={currentColorScheme}
                    onChange={handleColorSchemeChange}
                />
            </div>
        </div>
    );
};

// Memoized selector for representations.
const RepresentationSelector = React.memo(({ currentRepresentation, onChange }) => {
    const representations = useMemo(() => ([
        { id: 'cartoon', label: 'Cartoon' },
        { id: 'ball-and-stick', label: 'Ball & Stick' },
        { id: 'spacefill', label: 'Spacefill' },
        { id: 'backbone', label: 'Backbone' },
        { id: 'licorice', label: 'Licorice' },
        { id: 'ribbon', label: 'Ribbon' },
        { id: 'line', label: 'Line' },
    ]), []);

    return (
        <div className="representation-selector">
            <label className="text-sm font-medium">Representation:</label>
            <select
                value={currentRepresentation}
                onChange={(e) => onChange(e.target.value)}
                className="ml-2 p-1 border rounded text-sm"
            >
                {representations.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.label}</option>
                ))}
            </select>
        </div>
    );
});

// Memoized selector for color schemes.
const ColorSchemeSelector = React.memo(({ currentColorScheme, onChange }) => {
    const colorSchemes = useMemo(() => ([
        { id: 'chain-id', label: 'Chain' },
        { id: 'residue-name', label: 'Residue Name' },
        { id: 'sequence-id', label: 'Sequence Position' },
        { id: 'secondary-structure', label: 'Secondary Structure' },
        { id: 'residue-type', label: 'Residue Type' },
        { id: 'hydrophobicity', label: 'Hydrophobicity' },
        { id: 'uniform', label: 'Uniform' },
    ]), []);

    return (
        <div className="color-scheme-selector">
            <label className="text-sm font-medium">Color Scheme:</label>
            <select
                value={currentColorScheme}
                onChange={(e) => onChange(e.target.value)}
                className="ml-2 p-1 border rounded text-sm"
            >
                {colorSchemes.map(scheme => (
                    <option key={scheme.id} value={scheme.id}>{scheme.label}</option>
                ))}
            </select>
        </div>
    );
});

const PeptideViewer = (props) => {
    const {
        showBackbone = false,
        showSideChains = false,
        highlightResidues = [],
        ...otherProps
    } = props;

    const [representations, setRepresentations] = useState([
        { type: 'cartoon', color: 'chain-id', visible: true }
    ]);

    return (
        <div className="peptide-viewer">
            <MolStarViewer {...otherProps} />

            <div className="peptide-controls mt-3 p-2 border rounded">
                <h3 className="text-lg font-medium mb-2">Peptide Options</h3>

                <div className="flex flex-col gap-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={showBackbone}
                            onChange={() => props.onToggleBackbone?.()}
                            className="mr-2"
                        />
                        Show Backbone
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={showSideChains}
                            onChange={() => props.onToggleSideChains?.()}
                            className="mr-2"
                        />
                        Show Side Chains
                    </label>

                    <div>
                        <label className="block text-sm mb-1">Highlight Residues:</label>
                        <input
                            type="text"
                            value={highlightResidues.join(', ')}
                            onChange={(e) => props.onHighlightChange?.(e.target.value.split(',').map(x => x.trim()))}
                            placeholder="e.g. A:123, B:45"
                            className="w-full p-1 border rounded"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export { MolStarViewer, PeptideViewer };
