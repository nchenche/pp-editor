import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { log } from '../utils/dev'


export const useFetchMolecule = (smiles, queryParams) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);


    useEffect(() => {
        if (!smiles) return;

        const baseURL = `${API_BASE_URL}/api/molecules/svg-rendering`;
        const params = new URLSearchParams();

        // Append query parameters
        Object.entries(queryParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(val => params.append(key, val));
            } else if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        });

        const url = `${baseURL}?${params.toString()}`;
        const payload = JSON.stringify({ smiles });

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: payload
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const result = await response.json();
                setData(() => result);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [smiles]);

    return { data, isLoading, error };
};


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


export const useGetData = (url) => {
    const [data, setData] = useState(null); // null so we can store objects
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      if (!url) return;
  
      const controller = new AbortController();
  
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`Error fetching data: ${response.status}`);
          }
          const json = await response.json();
          // Set the entire response object (which includes data, meta, status)
          setData(json);
          setError(null);
        } catch (err) {
          if (err.name !== 'AbortError') {
            setError(err.message);
          }
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchData();
  
      // Abort fetch on unmount
      return () => controller.abort();
    }, [url]);
  
    return { data, isLoading, error };
  };