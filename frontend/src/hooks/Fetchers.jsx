import { useState, useEffect } from 'react';


export const useFetchData = ( url, payload ) => {

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: payload,
                    signal,
                });
                
                if (!response.ok) {
                    throw new Error(`Error fetching data to ${url}`);
                }

                const json = await response.json();
                setData(json);
                setError(null);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [url, payload]);

    return { data, isLoading, error };
};
