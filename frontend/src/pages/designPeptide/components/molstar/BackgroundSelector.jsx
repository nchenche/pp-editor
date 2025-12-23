import { useMemo } from 'react';

const BackgroundSelector = ({ value, onChange }) => {
    const options = useMemo(
        () => [
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
        ],
        []
    );

    return (
        <div className="background-selector">
            <label className="text-sm font-medium">Background:</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="ml-2 p-1 border rounded text-sm">
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export { BackgroundSelector };
