// src/hooks/useFetchDepiction.js
import { useState, useCallback } from 'react';
import { DEPICT_2D_URL, DB_NAME } from '../config';
import { apiFetch } from '../utils/api';


export function useFetchDepiction() {

    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDepiction = useCallback(async (params = {}) => {
        if (params && typeof params !== 'object') {
            throw new Error('Params must be an object');
        }

        // Build URL safely (supports DEPICT_2D_URL already having query params).
        // Owner scoping: apiFetch() will append owner_id/user_id automatically when connected.
        const url = new URL(DEPICT_2D_URL, window.location.origin);
        url.searchParams.set('db_name', DB_NAME);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                if (v == null) continue;
                url.searchParams.set(k, String(v));
            }
        }

        setLoading(true);
        try {
            const response = await apiFetch(url.toString(), { method: 'GET' });
            const json = await response.json().catch(() => null);

            if (!response.ok) {
                console.error('Error fetching depiction:', json);
                setError(json?.message || json?.error || `Failed to fetch depiction (status ${response.status})`);
                return;
            }

            setData(json?.data ?? null);
            setError(null);
        } catch (err) {
            setError(err?.message || 'Failed to fetch depiction.');
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, error, loading, fetchDepiction, setData };
}
