import { useMemo } from 'react';

// Selector for representations.
const ColorSchemeSelector = ({ value, onChange }) => {
    const colorSchemes = useMemo(() => [
        { id: 'chain-id', label: 'Chain' },
        { id: 'residue-name', label: 'Residue Name' },
        { id: 'sequence-id', label: 'Sequence Position' },
        { id: 'secondary-structure', label: 'Secondary Structure' },
        { id: 'hydrophobicity', label: 'Hydrophobicity' },
        { id: 'uniform', label: 'Uniform' },
    ], []);

    return (
        <div className="color-scheme-selector">
            <label className="text-sm font-medium">Color Scheme:</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="ml-2 p-1 border rounded text-sm"
            >
                {colorSchemes.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.label}</option>
                ))}
            </select>
        </div>
    );
};

export { ColorSchemeSelector };