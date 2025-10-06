// src/hooks/useFetchDepiction.js
import { useState, useCallback } from 'react';

const DEPICT_2D_URL = 'http://localhost:5000/api/core/molecules/depiction/2d';


export function useFetchDepiction() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDepiction = async (params = {}) => {
        if (params && typeof params !== 'object') {
            throw new Error('Params must be an object');
        }

        // Construct query string from params
        const queryString = Object.keys(params).length > 0
            ? `?${new URLSearchParams(params).toString()}`
            : '';
        const fetchUrl = DEPICT_2D_URL + queryString;

        setLoading(true);
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                const res = await response.json();
                console.error('Error fetching depiction:', res);
                setError(res.message);
                setLoading(false);
                return;
            }
            const json = await response.json();
            setData(json.data);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return { data, error, loading, fetchDepiction, setData };
}
