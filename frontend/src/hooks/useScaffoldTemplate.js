import { useCallback, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

export function useScaffoldTemplate() {
    const [scaffoldTemplate, setScaffoldTemplate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const parsePdbResponse = useCallback((name, text, meta) => {
        // meta is the JSON from your Flask route: { status, data: { chains: [...] } }
        const chains = meta?.data?.chains ?? [];
        setScaffoldTemplate({
            name,
            text, // may be null/unknown for pdb_id case if backend does not return it
            chains: chains.map((c) => c.id),
            chainData: chains,
        });
    }, []);

    const uploadScaffoldFile = useCallback(async (file) => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            const text = await file.text();

            const form = new FormData();
            form.append('file', file); // backend expects `file` in form-data

            const res = await fetch(`${API_BASE_URL}/api/structures/parse_pdb`, {
                method: 'POST',
                body: form,
            });

            const meta = await res.json().catch(() => null);

            if (!res.ok || !meta || meta.status !== 'success') {
                setScaffoldTemplate({
                    name: file.name,
                    text,
                    chains: null,
                    chainData: null,
                });
                setError(meta?.message || `Failed to parse PDB (status ${res.status})`);
                return;
            }

            parsePdbResponse(file.name, text, meta);
        } catch (e) {
            setError(e?.message || 'Failed to upload scaffold.');
        } finally {
            setLoading(false);
        }
    }, [parsePdbResponse]);

    const fetchScaffoldById = useCallback(async (pdbId) => {
        console.log('fetchScaffoldById', pdbId);
        if (!pdbId) return;
        setLoading(true);
        setError(null);

        try {
            const form = new FormData();
            form.append('pdb_id', pdbId);

            const res = await fetch(`${API_BASE_URL}/api/structures/parse_pdb`, {
                method: 'POST',
                body: form,
            });

            const meta = await res.json().catch(() => null);

            if (!res.ok || !meta || meta.status !== 'success') {
                setScaffoldTemplate({
                    name: pdbId.toUpperCase(),
                    text: null,
                    chains: null,
                    chainData: null,
                });
                setError(meta?.message || `Failed to fetch PDB ${pdbId} (status ${res.status})`);
                return;
            }

            // We don't have full PDB text here unless backend adds it; keep null for now
            parsePdbResponse(pdbId.toUpperCase(), null, meta);
        } catch (e) {
            setError(e?.message || 'Failed to fetch scaffold by PDB ID.');
        } finally {
            setLoading(false);
        }
    }, [parsePdbResponse]);

    const handleClearScaffold = useCallback(() => {
        setScaffoldTemplate(null);
        setError(null);
    }, []);

    return {
        scaffoldTemplate,
        setScaffoldTemplate,
        uploadScaffoldFile,
        fetchScaffoldById,
        handleClearScaffold,
        loading,
        error,
    };
}