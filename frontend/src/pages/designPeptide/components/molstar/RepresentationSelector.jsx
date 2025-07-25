import { useMemo } from 'react';

// Selector for representations.
const RepresentationSelector = ({ value, onChange }) => {
    const representations = useMemo(() =>   [
        { id: 'cartoon', label: 'Cartoon' },
        { id: 'ball-and-stick', label: 'Ball & Stick' },
        { id: 'spacefill', label: 'Spacefill' },
        { id: 'backbone', label: 'Backbone' },
        { id: 'licorice', label: 'Licorice' },
        { id: 'ribbon', label: 'Ribbon' },
        { id: 'line', label: 'Line' },
    ], []);

    return (
        <div className="representation-selector">
            <label className="text-sm font-medium">Representation:</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="ml-2 p-1 border rounded text-sm"
            >
                {representations.map(rep => (
                    <option key={rep.id} value={rep.id}>{rep.label}</option>
                ))}
            </select>
        </div>
    );
};

export { RepresentationSelector };