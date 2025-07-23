// src/hooks/useGenerate3D.js
import { useState, useCallback } from 'react';

export function useGenerate3D(apiBaseUrl) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate3D = useCallback(async (bilnValue) => {
        setLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/api/core/molecules/generate_3d`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sequence: bilnValue })
            });
            if (!response.ok) {
                const err = await response.json();
                setError(err.message);
                setLoading(false);
                return;
            }
            const json = await response.json();
            setResult(json.data);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [apiBaseUrl]);

    return { result, error, loading, generate3D, setResult };
}
