import { useState, useEffect, useRef } from 'react';

export function useLibraryFetching({ search = '', caps = false, natural = false, nonNatural = false }) {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const prevDataRef = useRef([]);

    useEffect(() => {
        const controller = new AbortController();

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (caps) params.append('filter', 'm_type:cap');
        if (natural) params.append('filter', 'm_subtype:natural');
        if (nonNatural) params.append('filter', 'm_subtype:non-natural');

        const url = `http://0.0.0.0:5000/api/db/monomers/images?${params.toString()}`;

        setIsLoading(true);
        setError(null);

        async function run() {
            try {
                setIsLoading(true);
                setError(null);
                fetch(url, { signal: controller.signal })
                    .then(res => {
                        if (!res.ok) throw new Error('Failed to fetch');
                        return res.json();
                    })
                    .then(json => setData(json.data || []))
                    .catch(err => {
                        if (err.name !== 'AbortError') setError(err.message);
                    })
                    .finally(() => setIsLoading(false));
            } catch (err) {
                if (err.name !== 'AbortError') setError(err.message);
                console.error(err);
            }
        }
        
        run();
        return () => controller.abort();
    }, [search, caps, natural, nonNatural]); // keep current behavior

    // remember last good data to avoid flicker while loading
    useEffect(() => {
        if (!isLoading && Array.isArray(data) && data.length) {
            prevDataRef.current = data;
        }
    }, [isLoading, data]);

    // Use previous data while loading
    const displayData = isLoading && prevDataRef.current.length > 0 ? prevDataRef.current : data;

    return { data: displayData, isLoading, error };
}