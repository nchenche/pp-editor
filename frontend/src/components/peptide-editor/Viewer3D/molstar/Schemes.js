// list of structure representations accessible from plugin.representation.structure.registry
const MolstarSchemes = {
    representationSchemes: [
        { id: 'cartoon', label: 'Cartoon' },
        { id: 'ball-and-stick', label: 'Ball & Stick' },
        { id: 'spacefill', label: 'Spacefill' },
        { id: 'backbone', label: 'Backbone' },
        { id: 'licorice', label: 'Licorice' },
        { id: 'ribbon', label: 'Ribbon' },
        { id: 'line', label: 'Line' },
        { id: 'molecular-surface', label: 'Molecular Surface' },
        // { id: 'point', label: 'Point' },
        { id: 'gaussian-surface', label: 'Gaussian Surface' },
        { id: 'gaussian-volume', label: 'Gaussian Volume' },
        // { id: 'ellipsoid', label: 'Ellipsoid' },
        // { id: 'interactions', label: 'Interactions' },
        { id: 'putty', label: 'Putty' },
    ],
    colorBySchemes: [
        { id: 'chain-id', label: 'Chain' },
        { id: 'residue-name', label: 'Residue Name' },
        { id: 'sequence-id', label: 'Sequence Position' },
        { id: 'secondary-structure', label: 'Secondary Structure' },
        { id: 'residue-type', label: 'Residue Type' },
        { id: 'hydrophobicity', label: 'Hydrophobicity' },
        { id: 'uniform', label: 'Uniform' },
        { id: 'element-symbol', label: 'Element Symbol' },
        { id: 'element-index', label: 'Element Index' },
        { id: 'atom-id', label: 'Atom ID' },
    ],
    resetViewScheme: [
        { id: 'reset-zoom', label: 'Reset zoom' },
        { id: 'orient-axes', label: 'Orient axes' },
        { id: 'reset-axes', label: 'Reset axes' },
    ],
};

export { MolstarSchemes };


