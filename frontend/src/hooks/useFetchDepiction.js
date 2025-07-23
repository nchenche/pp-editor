// src/hooks/useFetchDepiction.js
import { useState, useCallback } from 'react';

export function useFetchDepiction() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDepiction = useCallback(async (url) => {
        setLoading(true);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const res = await response.json();
                setError(res.message);
                setLoading(false);
                return;
            }
            const json = await response.json();
            console.log('Depiction data:', json);
            setData(json.data);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, error, loading, fetchDepiction, setData };
}
