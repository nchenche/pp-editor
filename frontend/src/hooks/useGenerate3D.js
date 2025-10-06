// src/hooks/useGenerate3D.js
import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

import { decomposeBiln } from '../utils/bilnUtils';

export function useGenerate3D() {

    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);    

    const generate3D = useCallback(async (bilnValue) => {
        setLoading(true);
        // HHHHHHHHH, CCCCCCCCC, EEEEEEEEE
        // Generate helix as long as the sequence
        const parsedBiln = decomposeBiln(bilnValue);        
        const helixLength = parsedBiln.tokens.length;
        const secstruct = 'H'.repeat(helixLength);
        try {
            const response = await fetch(`${API_BASE_URL}/api/core/molecules/generate_3d?without_ss=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sequence: bilnValue})  // secstruct: secstruct
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
    }, [setResult, setError, setLoading]);

    return { result, error, loading, generate3D, setResult };
}
