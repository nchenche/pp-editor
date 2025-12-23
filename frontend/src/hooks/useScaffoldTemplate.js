import { useCallback, useState } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';

export function useScaffoldTemplate() {
    const [scaffoldTemplate, setScaffoldTemplate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [messages, setMessages] = useState([]);
    const [standardization, setStandardization] = useState(null);

    const buildParsePdbUrl = useCallback((options = {}) => {
        const standardize = options?.standardize ?? true;
        const backboneOnly = options?.backboneOnly ?? options?.backbone_only ?? false;

        const params = new URLSearchParams();
        params.set('standardize', standardize ? 'true' : 'false');
        params.set('backbone_only', backboneOnly ? 'true' : 'true');

        return `${API_BASE_URL}/api/structures/parse_pdb?${params.toString()}`;
    }, []);

    const parsePdbResponse = useCallback((name, text, meta) => {
        // meta is the JSON from your Flask route
        const w = Array.isArray(meta?.warnings) ? meta.warnings.filter(Boolean).map(String) : [];
        const m = Array.isArray(meta?.messages) ? meta.messages.filter(Boolean).map(String) : [];
        const s = meta?.standardization && typeof meta.standardization === 'object' ? meta.standardization : null;
        const chains = meta?.data?.chains ?? [];
        const source = meta?.data?.source || null; // e.g., 'pdb_id' or 'file_upload'
        const pdbPath = meta?.data?.pdb_path || null;
        const doc_id = meta?.data?._id || null;

        setWarnings(w);
        setMessages(m);
        setStandardization(s);
        setScaffoldTemplate({
            id: doc_id,
            name,
            text, // may be null/unknown for pdb_id case if backend does not return it
            chains: chains.map((c) => c.id),
            chainData: chains,
            source: source,
            pdbPath: pdbPath,
            warnings: w,
            messages: m,
            standardization: s,
        });
    }, []);


    const deleteTemplateOnServer = useCallback(async (templateId) => {
        if (!templateId) return;
        try {
            const res = await apiFetch(
                `${API_BASE_URL}/api/structures/delete_pdb_template?template_id=${encodeURIComponent(templateId)}`,
                { method: 'DELETE' },
            );
            const payload = await res.json().catch(() => null);
            if (!res.ok || payload?.status !== 'success') {
                throw new Error(payload?.message || `Failed to delete template ${templateId}`);
            }
        } catch (err) {
            console.warn('[scaffold] delete failed', err);
        }
    }, []);

    const uploadScaffoldFile = useCallback(async (file, options = undefined) => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);

        try {
            const text = null; // await file.text();

            const form = new FormData();
            form.append('file', file); // backend expects `file` in form-data

            const res = await apiFetch(buildParsePdbUrl(options), {
                method: 'POST',
                body: form,
            });

            const meta = await res.json().catch(() => null);

            if (!res.ok || !meta || meta.status !== 'success') {
                setScaffoldTemplate({
                    id: null,
                    name: file.name,
                    text,
                    chains: null,
                    chainData: null,
                    source: null,
                    pdbPath: null,
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
    }, [buildParsePdbUrl, parsePdbResponse]);

    const fetchScaffoldById = useCallback(async (pdbId, options = undefined) => {
        // console.log('fetchScaffoldById', pdbId);
        if (!pdbId) return;
        setLoading(true);
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);

        try {
            const res = await apiFetch(buildParsePdbUrl(options), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pdb_id: pdbId }),
            });

            const meta = await res.json().catch(() => null);

            if (!res.ok || !meta || meta.status !== 'success') {
                setScaffoldTemplate({
                    id: null,
                    name: pdbId.toUpperCase(),
                    text: null,
                    chains: null,
                    chainData: null,
                    source: null,
                    pdbPath: null,
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
    }, [buildParsePdbUrl, parsePdbResponse]);

    const handleClearScaffold = useCallback(async () => {
        const templateId = scaffoldTemplate?.id ?? null;
        if (templateId) {
            await deleteTemplateOnServer(templateId);
        }
        setScaffoldTemplate(null);
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);
    }, [deleteTemplateOnServer, scaffoldTemplate]);

    return {
        scaffoldTemplate,
        setScaffoldTemplate,
        uploadScaffoldFile,
        fetchScaffoldById,
        handleClearScaffold,
        loading,
        error,
        warnings,
        messages,
        standardization,
    };
}