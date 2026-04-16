import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';

// Cache template PDB payloads in-memory to avoid re-fetching when the peptide changes.
// Keyed by template_id returned by /api/structures/parse_pdb.
const TEMPLATE_PDB_TEXT_CACHE = new Map();

const SCAFFOLD_TEMPLATE_STORAGE_KEY = 'pp-editor:scaffold-template:v1';

const AA3_TO_1 = {
    ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C',
    GLN: 'Q', GLU: 'E', GLY: 'G', HIS: 'H', ILE: 'I',
    LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P',
    SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V',
    SEC: 'U', PYL: 'O',
};

function toOneLetter(resname) {
    const code = String(resname ?? '').trim().toUpperCase();
    if (!code) return 'X';
    return AA3_TO_1[code] || (code.length === 1 ? code : 'X');
}

function parsePdbChains(pdbText) {
    const text = pdbText != null ? String(pdbText) : '';
    if (!text.trim()) return [];

    // PDB fixed columns:
    // - record name: 1-6
    // - resname: 18-20 (0-based slice 17..20)
    // - chain id: 22 (0-based 21)
    // - resseq: 23-26 (0-based 22..26)
    const chainOrder = [];
    const chains = new Map(); // chainId -> Map(resid -> { resid, resname, resn })

    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        if (!line) continue;
        const rec = line.slice(0, 6).trim();
        if (rec !== 'ATOM' && rec !== 'HETATM') continue;

        const resname = line.slice(17, 20).trim();
        const chainIdRaw = line.slice(21, 22);
        const chainId = (chainIdRaw != null ? String(chainIdRaw) : '').trim() || '_';
        const residStr = line.slice(22, 26).trim();
        const resid = Number.parseInt(residStr, 10);
        if (!Number.isFinite(resid)) continue;

        if (!chains.has(chainId)) {
            chains.set(chainId, new Map());
            chainOrder.push(chainId);
        }
        const resMap = chains.get(chainId);
        if (!resMap.has(resid)) {
            resMap.set(resid, { resid, resname: resname || null, resn: toOneLetter(resname) });
        }
    }

    return chainOrder.map((id) => {
        const resMap = chains.get(id);
        const residues = Array.from(resMap.values()).sort((a, b) => Number(a.resid) - Number(b.resid));
        return { id, residues };
    });
}

function readPersistedTemplate() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window?.localStorage?.getItem(SCAFFOLD_TEMPLATE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const id = parsed?.id ?? null;
        if (!id) return null;
        return {
            id,
            name: parsed?.name ?? null,
            text: null,
            chains: Array.isArray(parsed?.chains) ? parsed.chains : null,
            chainData: Array.isArray(parsed?.chainData) ? parsed.chainData : null,
            source: parsed?.source ?? null,
            pdbPath: parsed?.pdbPath ?? null,
            warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
            messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
            standardization: parsed?.standardization ?? null,
        };
    } catch {
        return null;
    }
}

function persistTemplateMeta(scaffoldTemplate) {
    if (typeof window === 'undefined') return;
    try {
        if (!scaffoldTemplate?.id) {
            window?.localStorage?.removeItem(SCAFFOLD_TEMPLATE_STORAGE_KEY);
            return;
        }
        // Persist metadata only; PDB text can be large and is re-fetched by template id.
        const payload = {
            id: scaffoldTemplate.id,
            name: scaffoldTemplate?.name ?? null,
            chains: scaffoldTemplate?.chains ?? null,
            chainData: scaffoldTemplate?.chainData ?? null,
            source: scaffoldTemplate?.source ?? null,
            pdbPath: scaffoldTemplate?.pdbPath ?? null,
            warnings: scaffoldTemplate?.warnings ?? [],
            messages: scaffoldTemplate?.messages ?? [],
            standardization: scaffoldTemplate?.standardization ?? null,
        };
        window?.localStorage?.setItem(SCAFFOLD_TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* ignore quota/serialization errors */
    }
}

export function useScaffoldTemplate() {
    const [scaffoldTemplate, setScaffoldTemplate] = useState(() => readPersistedTemplate());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [messages, setMessages] = useState([]);
    const [standardization, setStandardization] = useState(null);

    const hydratedRef = useRef(false);

    const fetchTemplatePdbText = useCallback(async (templateId) => {
        const id = templateId ? String(templateId).trim() : '';
        if (!id) return null;
        if (TEMPLATE_PDB_TEXT_CACHE.has(id)) return TEMPLATE_PDB_TEXT_CACHE.get(id);

        const url = `${API_BASE_URL}/api/structures/get_pdb_template?template_id=${encodeURIComponent(id)}`;
        const res = await apiFetch(url, { method: 'GET' });
        const payload = await res.json().catch(() => null);
        if (!res.ok || payload?.status !== 'success') {
            throw new Error(payload?.message || `Failed to download template PDB (status ${res.status})`);
        }
        const pdbText = payload?.data?.pdb_text ?? payload?.data?.pdbText ?? null;
        const text = pdbText != null ? String(pdbText) : null;
        TEMPLATE_PDB_TEXT_CACHE.set(id, text);
        return text;
    }, []);

    const restoreTemplateById = useCallback(async (templateId) => {
        const id = templateId != null ? String(templateId).trim() : '';
        if (!id) return { ok: false, reason: 'missing_id' };

        setLoading(true);
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);

        try {
            const pdbText = await fetchTemplatePdbText(id);
            if (!pdbText) {
                setError('Template fetch returned empty content.');
                return { ok: false, reason: 'empty' };
            }

            // Populate chain metadata from the PDB text so mapping UI can resolve residues.
            const parsedChainData = parsePdbChains(pdbText);
            const parsedChains = parsedChainData.length ? parsedChainData.map((c) => c.id) : null;

            setScaffoldTemplate((prev) => {
                const prevObj = prev && typeof prev === 'object' ? prev : null;
                const name = prevObj?.id === id && prevObj?.name ? prevObj.name : `Template ${id.slice(0, 8)}`;
                const next = {
                    id,
                    name,
                    text: pdbText,
                    // Restore chain metadata from parsed PDB text (preferred).
                    // Fall back to any persisted metadata if parsing didn't yield residues.
                    chains: parsedChains || (prevObj?.id === id ? (prevObj?.chains ?? null) : null),
                    chainData: parsedChainData.length ? parsedChainData : (prevObj?.id === id ? (prevObj?.chainData ?? null) : null),
                    source: prevObj?.id === id ? (prevObj?.source ?? { template_id: id }) : { template_id: id },
                    pdbPath: prevObj?.id === id ? (prevObj?.pdbPath ?? null) : null,
                    warnings: [],
                    messages: [],
                    standardization: null,
                };
                return next;
            });

            return { ok: true };
        } catch (e) {
            const msg = String(e?.message || '').toLowerCase().includes('unknown template_id')
                ? 'This job used a template that has expired or was deleted; template constraints cannot be restored.'
                : (e?.message || 'Failed to restore template from history.');
            setError(msg);
            return { ok: false, reason: 'error', error: msg };
        } finally {
            setLoading(false);
        }
    }, [fetchTemplatePdbText]);

    // Hydrate PDB text for persisted templates (metadata-only in localStorage).
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        const templateId = scaffoldTemplate?.id ?? null;
        if (!templateId) return;
        if (scaffoldTemplate?.text) return;

        fetchTemplatePdbText(templateId)
            .then((pdbText) => {
                setScaffoldTemplate((prev) => {
                    if (!prev || prev.id !== templateId) return prev;
                    return { ...prev, text: pdbText };
                });
            })
            .catch((e) => {
                console.warn('[scaffold] hydrate get_pdb_template failed — clearing stale template', e);
                // Template expired or was purged on the backend.
                // Clear stale state so the user isn't stuck in template mode
                // with an unresolvable template_id.
                setScaffoldTemplate(null);
                try { window?.localStorage?.removeItem(SCAFFOLD_TEMPLATE_STORAGE_KEY); } catch { /* ignore */ }
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist scaffold template metadata across navigation.
    useEffect(() => {
        persistTemplateMeta(scaffoldTemplate);
    }, [scaffoldTemplate]);

    const buildParsePdbUrl = useCallback((options = {}) => {
        const standardize = options?.standardize ?? true;
        const backboneOnly = options?.backboneOnly ?? options?.backbone_only ?? false;

        const params = new URLSearchParams();
        params.set('standardize', standardize ? 'true' : 'false');
        params.set('backbone_only', backboneOnly ? 'true' : 'false');

        return `${API_BASE_URL}/api/structures/parse_pdb?${params.toString()}`;
    }, []);

    const parsePdbResponse = useCallback((name, text, meta) => {
        // meta is the JSON from your Flask route. Different deployments return either:
        //  - { status, data: { _id, chains, ... }, warnings/messages/standardization }
        //  - { status, _id, chains, ... , warnings/messages/standardization }
        const w = Array.isArray(meta?.warnings) ? meta.warnings.filter(Boolean).map(String) : [];
        const m = Array.isArray(meta?.messages) ? meta.messages.filter(Boolean).map(String) : [];
        const s = meta?.standardization && typeof meta.standardization === 'object' ? meta.standardization : null;

        const doc = (meta?.data && typeof meta.data === 'object') ? meta.data : meta;
        const chains = Array.isArray(doc?.chains) ? doc.chains : [];
        const source = doc?.source || null; // e.g., { pdb_id, backbone_only, ... }
        const pdbPath = doc?.pdb_path || null;
        const doc_id = doc?._id || null;

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
            console.log('PDB parse success', meta);
            parsePdbResponse(file.name, text, meta);

            // Retrieve standardized PDB text by template id for Mol* overlay.
            const doc = (meta?.data && typeof meta.data === 'object') ? meta.data : meta;
            const templateId = doc?._id || null;
            if (templateId) {
                try {
                    const pdbText = await fetchTemplatePdbText(templateId);
                    setScaffoldTemplate((prev) => {
                        if (!prev || prev.id !== templateId) return prev;
                        if (prev.text === pdbText) return prev;
                        return { ...prev, text: pdbText };
                    });
                } catch (e) {
                    // Non-fatal: template metadata is still usable even if PDB text fetch fails.
                    console.warn('[scaffold] get_pdb_template failed', e);
                }
            }
        } catch (e) {
            setError(e?.message || 'Failed to upload scaffold.');
        } finally {
            setLoading(false);
        }
    }, [buildParsePdbUrl, fetchTemplatePdbText, parsePdbResponse]);

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

            // Retrieve standardized PDB text by template id for Mol* overlay.
            const doc = (meta?.data && typeof meta.data === 'object') ? meta.data : meta;
            const templateId = doc?._id || null;
            if (templateId) {
                try {
                    const pdbText = await fetchTemplatePdbText(templateId);
                    setScaffoldTemplate((prev) => {
                        if (!prev || prev.id !== templateId) return prev;
                        if (prev.text === pdbText) return prev;
                        return { ...prev, text: pdbText };
                    });
                } catch (e) {
                    console.warn('[scaffold] get_pdb_template failed', e);
                }
            }
        } catch (e) {
            setError(e?.message || 'Failed to fetch scaffold by PDB ID.');
        } finally {
            setLoading(false);
        }
    }, [buildParsePdbUrl, fetchTemplatePdbText, parsePdbResponse]);

    const handleClearScaffold = useCallback(async () => {
        const templateId = scaffoldTemplate?.id ?? null;
        if (templateId) {
            await deleteTemplateOnServer(templateId);
        }
        setScaffoldTemplate(null);
        try {
            window?.localStorage?.removeItem(SCAFFOLD_TEMPLATE_STORAGE_KEY);
        } catch {
            // ignore
        }
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);
    }, [deleteTemplateOnServer, scaffoldTemplate]);

    // Soft clear: only resets local state without deleting the template from the server.
    // Used when resuming a non-template job to clear the UI state.
    const clearScaffoldLocal = useCallback(() => {
        setScaffoldTemplate(null);
        try {
            window?.localStorage?.removeItem(SCAFFOLD_TEMPLATE_STORAGE_KEY);
        } catch {
            // ignore
        }
        setError(null);
        setWarnings([]);
        setMessages([]);
        setStandardization(null);
    }, []);

    return {
        scaffoldTemplate,
        setScaffoldTemplate,
        uploadScaffoldFile,
        fetchScaffoldById,
        restoreTemplateById,
        handleClearScaffold,
        clearScaffoldLocal,
        loading,
        error,
        warnings,
        messages,
        standardization,
    };
}