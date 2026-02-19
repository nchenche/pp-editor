import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    Alert,
    Box,
    Paper,
    Typography,
    Divider,
    TextField,
    Button,
    Checkbox,
    Menu,
    ListItemText,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableSortLabel,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';

import FormWizard from 'react-form-wizard-component';
import 'react-form-wizard-component/dist/style.css';

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumnOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';

import { API_DB_URL, API_URL } from '../../config';
import { apiFetch, apiFetchNoOwner } from '../../utils/api';
import { invalidateLibraryFetching } from '../../hooks/useLibraryFetching';

import { useFragments, useFormSubmission, classifyMolecule, validateSdf } from './hooks/CustomHooks';
import SdfValidationDialog from './components/SdfValidationDialog';
import SdfFormatHelp from './components/SdfFormatHelp';
import { TabStep1, TabStep2, TabStep3, TabStep4, TabStepBondsAndFragment, isFragmentAllowed } from './components/Steps';
import TabStepStereo from './components/StereoStep';

const ADMIN_TOKEN_STORAGE_KEY = 'pp-editor:public-admin-token:v1';

function readAdminToken() {
    try {
        const raw = window?.localStorage?.getItem(ADMIN_TOKEN_STORAGE_KEY);
        const v = String(raw ?? '').trim();
        return v || null;
    } catch {
        return null;
    }
}

function writeAdminToken(token) {
    const v = String(token ?? '').trim();
    try {
        if (!v) {
            window?.localStorage?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
            return null;
        }
        window?.localStorage?.setItem(ADMIN_TOKEN_STORAGE_KEY, v);
        return v;
    } catch {
        return v || null;
    }
}

function makeAdminHeaders(token, extraHeaders) {
    const headers = new Headers(extraHeaders || undefined);
    const t = String(token ?? '').trim();
    if (t) headers.set('X-Admin-Token', t);
    return headers;
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NEVER_VISIBLE_KEYS = new Set([
    'owner_id',
    'created_at',
    'updated_at',
    'ID',
    'id',
    '_id',
    'image_binary',
    'm_abbr',
]);

const DEFAULT_HIDDEN_KEYS = new Set([
    'created_at',
    'updated_at',
]);

const COLUMN_LABELS = {
    symbol: 'Symbol',
    m_name: 'Name',
    pdbName: 'PDB',
    m_type: 'Type',
    m_subtype: 'Subtype',
    natAnalog: 'Natural analog',
    smiles: 'SMILES',
    canonic_smiles: 'Canonical SMILES',
    m_Rgroups: 'R groups',
    m_RgroupIdx: 'R group idx',
    m_attachmentPointIdx: 'Attach points',
    m_abbr: 'Abbreviation',
    created_at: 'Created',
    updated_at: 'Updated',
};

const VISIBLE_COLUMNS_STORAGE_KEY = 'pp-public-monomers-visible-columns';
const COLUMN_WIDTHS_STORAGE_KEY = 'pp-public-monomers-column-widths';

const COLUMN_MIN_WIDTH = {
    symbol: 120,
    m_name: 240,
    pdbName: 90,
    m_type: 90,
    m_subtype: 120,
    natAnalog: 140,
};

const ACTIONS_COL_WIDTH = 140;
const IMG_COL_WIDTH = 86;
const IMG_COL_MIN_WIDTH = 72;

const NATURAL_ANALOG_OPTIONS = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y', 'X'];
const NATURAL_ANALOG_SET = new Set(NATURAL_ANALOG_OPTIONS);

const PREFERRED_ORDER = [
    'symbol',
    'm_name',
    'pdbName',
    'm_type',
    'm_subtype',
    'natAnalog',
    'smiles',
    'canonic_smiles',
    'm_Rgroups',
    'm_RgroupIdx',
    'm_attachmentPointIdx',
];

function formatRGroups(value) {
    const arr = Array.isArray(value) ? value : String(value || '').split(',');
    const parts = [];
    for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        const s = String(v ?? '').trim();
        if (!s) continue;
        parts.push(`R${i + 1}:${s}`);
    }
    return parts.length ? parts.join(' ') : '';
}

function labelForKey(key) {
    return COLUMN_LABELS[key] || key;
}

function sortValueForCell(value, key) {
    if (key === 'm_Rgroups') return formatRGroups(value);
    return String(value ?? '');
}

function normalizeNatAnalogInput(v) {
    const value = String(v ?? '').trim().toUpperCase();
    const one = value ? value[0] : '';
    if (!one) return '';
    return NATURAL_ANALOG_SET.has(one) ? one : '';
}

function normalizePdbNameInput(v) {
    const upper = String(v || '').toUpperCase().replace(/\s+/g, '');
    return upper.replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

function normalizeType(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (v === 'aa' || v === 'cap' || v === 'other') return v;
    return v;
}

function normalizeSubtype(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (v === 'natural' || v === 'non-natural' || v === 'cap') return v;
    return v;
}

function enforceTypeSubtypeRule(type, subtype) {
    const nextType = normalizeType(type);
    let nextSubtype = normalizeSubtype(subtype);
    if (nextType === 'cap') nextSubtype = 'cap';
    if (nextType === 'other') nextSubtype = 'non-natural';
    return { type: nextType, subtype: nextSubtype };
}

function getRGroupSlots(m) {
    const raw = m || {};
    const rGroups = Array.isArray(raw?.m_Rgroups) ? raw.m_Rgroups : [];
    const rGroupIdx = Array.isArray(raw?.m_RgroupIdx) ? raw.m_RgroupIdx : [];

    const slots = [];
    const maxLen = Math.max(rGroups.length, rGroupIdx.length, 0);
    for (let i = 0; i < maxLen; i++) {
        const g = rGroups[i];
        const hasGroup = g != null && String(g).trim() !== '';
        const hasIdx = rGroupIdx[i] != null;
        if (hasGroup || hasIdx) slots.push(i);
    }

    // If there is no explicit R-group information in the record, keep the legacy default
    // so the editor can still expose the common R1..R4 inputs.
    if (slots.length === 0 && maxLen === 0) return [0, 1, 2, 3];
    return slots;
}

function normalizeMonomer(m) {
    const raw = m || {};
    const symbol = String(raw?.symbol ?? raw?.m_abbr ?? '').trim();
    const name = String(raw?.m_name ?? raw?.name ?? '').trim();
    const natAnalog = String(raw?.natAnalog ?? raw?.nat_analog ?? '').trim();
    const pdbName = String(raw?.pdbName ?? raw?.pdb_name ?? '').trim();
    const type = String(raw?.m_type ?? raw?.type ?? '').trim();
    const subtype = String(raw?.m_subtype ?? raw?.subtype ?? '').trim();
    const imageBase64 = raw?.image_binary ?? raw?.image_url ?? raw?.image ?? raw?.image_base64 ?? raw?.imageBase64 ?? null;
    return {
        raw,
        symbol,
        name,
        natAnalog,
        pdbName,
        type,
        subtype,
        imageBase64,
    };
}

function parseSdfRecords(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const matches = normalized.match(/[\s\S]*?\$\$\$\$\s*(?:\n|$)/g);
    if (matches && matches.length > 0) return matches;

    const only = normalized;
    if (!only) return [];
    return [only.replace(/\n*$/g, '') + '\n$$$$\n'];
}

function normalizeSdfRecordForUpload(recordText) {
    const normalized = String(recordText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const idx = normalized.lastIndexOf('$$$$');
    let body;
    if (idx === -1) {
        body = normalized.replace(/\n*$/g, '') + '\n$$$$\n';
    } else {
        body = normalized.slice(0, idx + 4).replace(/\s*$/g, '') + '\n';
    }
    // Ensure the record starts with a newline (blank molecule-name line).
    // Without this, concatenated records would have the second record's
    // program/header line glued directly after the previous '$$$$\n',
    // which RDKit cannot parse.
    if (!body.startsWith('\n')) {
        body = '\n' + body;
    }
    return body;
}

function getSdfTagValue(recordText, tagName) {
    const tag = escapeRegExp(tagName);
    const re = new RegExp(`>\\s*<${tag}>\\s*\\n([^\\n]*)`, 'i');
    const m = String(recordText || '').match(re);
    return m?.[1]?.trim() || '';
}

function getSdfDisplayLabel(recordText, fallback) {
    const symbol = getSdfTagValue(recordText, 'symbol') || getSdfTagValue(recordText, 'id');
    const name = getSdfTagValue(recordText, 'm_name') || getSdfTagValue(recordText, 'name');
    const left = symbol ? symbol : fallback;
    return name ? `${left} — ${name}` : left;
}

function getHeader(headers, name) {
    if (!headers) return null;
    if (headers instanceof Headers) return headers.get(name);
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (String(k).toLowerCase() === lower) return String(v);
    }
    return null;
}

const CreatePublicMonomerDialog = memo(function CreatePublicMonomerDialog({
    open,
    onClose,
    dbName,
    apiDbFetch,
    load,
}) {
    const [createMode, setCreateMode] = useState(null); // null | 'upload-sdf' | 'scratch'
    const [createError, setCreateError] = useState('');
    const [createIsUploading, setCreateIsUploading] = useState(false);
    const [createFileName, setCreateFileName] = useState('');
    const [createRecords, setCreateRecords] = useState([]); // [{ id, text }]
    const [createSelectedRecordId, setCreateSelectedRecordId] = useState('');

    const [scratchSmiles, setScratchSmiles] = useState('CCO');
    const [scratchSelectedBonds, setScratchSelectedBonds] = useState([]);
    const [scratchSelectedFragmentIndex, setScratchSelectedFragmentIndex] = useState(-1);
    const [scratchCurrentIndex, setScratchCurrentIndex] = useState(0);
    const [scratchFormData, setScratchFormData] = useState({});
    const [scratchStepError, setScratchStepError] = useState('');

    const wizardRef = useRef(null);
    const scratchFormRef = useRef(null);
    const stereoRef = useRef(null);
    const [stereoMolBlock, setStereoMolBlock] = useState('');
    const [scratchStereoMap, setScratchStereoMap] = useState({});
    const lastClassifiedRef = useRef({ smiles: '', data: null });

    const [validationDialog, setValidationDialog] = useState({ open: false, errors: [], warnings: [], functionalCheck: null });

    const [scratchFragments] = useFragments(scratchSmiles, scratchSelectedBonds);
    const [handleScratchFormSubmit, scratchMolBlock] = useFormSubmission(scratchFormData, scratchFragments, scratchSelectedFragmentIndex);

    const resetCreateDialog = useCallback(() => {
        setCreateMode(null);
        setCreateError('');
        setCreateIsUploading(false);
        setCreateFileName('');
        setCreateRecords([]);
        setCreateSelectedRecordId('');

        setScratchSmiles('CCO');
        setScratchSelectedBonds([]);
        setScratchSelectedFragmentIndex(-1);
        setScratchCurrentIndex(0);
        setScratchFormData({});
        setScratchStepError('');
        setStereoMolBlock('');
        setScratchStereoMap({});
        lastClassifiedRef.current = { smiles: '', data: null };
        setValidationDialog({ open: false, errors: [], warnings: [], functionalCheck: null });
    }, []);

    useEffect(() => {
        if (!open) return;
        resetCreateDialog();
    }, [open, resetCreateDialog]);

    const close = useCallback(() => {
        resetCreateDialog();
        onClose();
    }, [onClose, resetCreateDialog]);

    const StepGuideline = useCallback(({ title, children }) => {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {children}
                </Typography>
            </Paper>
        );
    }, []);

    const StepGuidelineWithError = useCallback(({ title, children, error: stepError }) => {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {children}
                </Typography>
                {stepError ? (
                    <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
                        {stepError}
                    </Typography>
                ) : null}
            </Paper>
        );
    }, []);

    const checkSymbolExists = useCallback(async (values) => {
        const symbol = String(values?.symbol || '').trim();
        if (!symbol) return { exists: false };

        const params = new URLSearchParams();
        params.set('db_name', dbName);
        params.set('symbol', symbol);

        const res = await apiDbFetch(`${API_DB_URL}/monomers/exists?${params.toString()}`, { method: 'GET' });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            return { exists: false, error: json?.message || json?.error || `Failed to validate symbol (status ${res.status})` };
        }

        if (typeof json?.data?.symbol?.exists === 'boolean') {
            return { exists: json.data.symbol.exists };
        }

        if (typeof json?.exists === 'boolean') return { exists: json.exists };
        if (typeof json?.data?.exists === 'boolean') return { exists: json.data.exists };

        return { exists: false };
    }, [apiDbFetch, dbName]);

    const handleCreateFilePicked = useCallback(async (file) => {
        if (!file) return;
        setCreateError('');
        setCreateFileName(String(file.name || ''));

        // Client-side size guard (backend limit: 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            setCreateError('File is too large. The maximum allowed size is 10 MB.');
            return;
        }

        try {
            const text = await file.text();
            const records = parseSdfRecords(text).map((t, idx) => ({ id: String(idx + 1), text: t }));
            setCreateRecords(records);
            setCreateSelectedRecordId(records[0]?.id || '');
            if (records.length === 0) {
                setCreateError('No monomers found in this SDF file.');
            }
        } catch (e) {
            setCreateError(e?.message || 'Failed to read SDF file.');
            setCreateRecords([]);
            setCreateSelectedRecordId('');
        }
    }, []);

    const updateCreateRecordText = useCallback((recordId, nextText) => {
        setCreateRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, text: nextText } : r)));
    }, []);

    const uploadCreateRecords = useCallback(async () => {
        setCreateError('');
        if (!Array.isArray(createRecords) || createRecords.length === 0) {
            setCreateError('No SDF records to upload.');
            return;
        }

        const sdfText = createRecords.map((r) => normalizeSdfRecordForUpload(r.text)).join('');

        setCreateIsUploading(true);
        try {
            // --- Validate SDF before ingestion ---
            try {
                const result = await validateSdf(
                    { sdf: sdfText, strict: true, functional_check: true, owner_id: null },
                    { fetchFn: apiFetchNoOwner },
                );
                if (!result.valid) {
                    setValidationDialog({
                        open: true,
                        errors: result.errors || [],
                        warnings: result.warnings || [],
                        functionalCheck: result.functional_check || null,
                    });
                    return; // Block upload
                }
            } catch (valErr) {
                if (valErr?.name === 'AbortError') throw valErr;
                setCreateError(`SDF validation error: ${valErr?.message || 'Unknown error'}`);
                return;
            }

            const params = new URLSearchParams();
            params.set('db_name', dbName);
            params.set('scope', 'public');
            params.set('write_mode', 'upsert');
            const res = await apiDbFetch(`${API_DB_URL}/monomers/add?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: sdfText,
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to upload monomers (status ${res.status})`;
                setCreateError(String(msg));
                return;
            }

            invalidateLibraryFetching('public-monomers-uploaded');
            close();
            await load();
        } catch (e) {
            setCreateError(e?.message || 'Failed to upload monomers.');
        } finally {
            setCreateIsUploading(false);
        }
    }, [apiDbFetch, close, createRecords, dbName, load]);

    const scratchTabChanged = useCallback(({ prevIndex }) => {
        setTimeout(() => setScratchCurrentIndex(() => prevIndex), 0);
    }, []);

    useEffect(() => {
        if (createMode !== 'scratch') return;
        setScratchSelectedBonds([]);
        setScratchStepError('');
    }, [scratchSmiles, createMode]);

    useEffect(() => {
        if (createMode !== 'scratch') return;
        setScratchFormData({});
        setScratchStepError('');
    }, [scratchSelectedFragmentIndex, createMode]);

    useEffect(() => {
        if (createMode !== 'scratch') return;
        if (scratchFragments.length > 0) {
            const firstAllowed = scratchFragments.findIndex((f) => isFragmentAllowed(f, 4));
            setScratchSelectedFragmentIndex(firstAllowed >= 0 ? firstAllowed : -1);
        } else {
            setScratchSelectedFragmentIndex(-1);
        }
    }, [scratchFragments, createMode]);

    const handleScratchSelectedBonds = useCallback((bondIndex) => {
        setScratchSelectedBonds((prev) =>
            prev.includes(bondIndex) ? prev.filter((idx) => idx !== bondIndex) : [...prev, bondIndex]
        );
    }, []);

    const handleScratchSelectedFragment = useCallback((fragmentIndex) => {
        setScratchStepError('');
        setScratchSelectedFragmentIndex(fragmentIndex);
    }, []);

    const handleScratchFormDataChange = useCallback((data) => {
        setScratchStepError('');
        setScratchFormData(data);
    }, []);

    const scratchCheckTab = useCallback(async () => {
        switch (scratchCurrentIndex) {
            case 0:
                return Boolean(String(scratchSmiles || '').trim());
            case 1: {
                // Merged bond-selection + fragment-selection step
                if (!Array.isArray(scratchSelectedBonds) || scratchSelectedBonds.length === 0) return false;
                if (scratchSelectedFragmentIndex === -1) return false;
                if (!isFragmentAllowed(scratchFragments?.[scratchSelectedFragmentIndex], 4)) return false;

                // Classify the selected fragment to prefill Step 4 (type + R-group labels)
                const fragmentSmiles = scratchFragments?.[scratchSelectedFragmentIndex] || '';
                if (fragmentSmiles && fragmentSmiles !== lastClassifiedRef.current.smiles) {
                    try {
                        const classifyData = await classifyMolecule(fragmentSmiles);
                        lastClassifiedRef.current = { smiles: fragmentSmiles, data: classifyData };
                        if (classifyData) {
                            const prefill = {};
                            // Type
                            if (classifyData.type) {
                                prefill.selectType = classifyData.type;
                                prefill.selectSubType = classifyData.type === 'cap' ? 'cap' : 'non-natural';
                                prefill.naturalAnalog = classifyData.type === 'cap' ? 'X' : '';
                            }
                            // R-group labels & leaving groups from server
                            if (classifyData.form_prefill && typeof classifyData.form_prefill === 'object') {
                                Object.assign(prefill, classifyData.form_prefill);
                            }
                            setScratchFormData((prev) => ({ ...prev, ...prefill }));
                        }
                    } catch (err) {
                        // Classification is best-effort; don't block navigation
                        if (err?.name === 'AbortError') throw err;
                    }
                }
                return true;
            }
            case 2: {
                if (!scratchFormRef.current) return false;
                const isValid = await scratchFormRef.current.isValid();
                if (!isValid) return false;

                const values = scratchFormRef.current.getFormData ? scratchFormRef.current.getFormData() : scratchFormData;
                const existsRes = await checkSymbolExists(values);
                if (existsRes?.error) {
                    setScratchStepError(String(existsRes.error));
                    return false;
                }
                if (existsRes?.exists) {
                    setScratchStepError('This symbol already exists in the public library; uploading will upsert/overwrite it.');
                } else {
                    setScratchStepError('');
                }

                handleScratchFormSubmit();
                return true;
            }
            case 3: {
                // Stereochemistry confirmation step
                if (!stereoRef.current) return true;
                if (stereoRef.current.isLoading()) return false;

                if (!stereoRef.current.hasCenters()) {
                    // No chiral centers — skip stereo/apply, keep original molblock
                    setStereoMolBlock('');
                    return true;
                }

                try {
                    const stereoMap = stereoRef.current.getStereoMap();
                    const fragmentSmiles = scratchFragments?.[scratchSelectedFragmentIndex] || '';
                    const res = await apiFetch(`${API_URL}/molecules/stereo/apply`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            smiles: fragmentSmiles,
                            form: scratchFormData,
                            stereo: stereoMap,
                        }),
                    });
                    const json = await res.json().catch(() => null);
                    if (!res.ok) {
                        setScratchStepError(json?.error || `Stereo apply failed (status ${res.status})`);
                        return false;
                    }
                    setStereoMolBlock(String(json?.data?.molblock || ''));
                    setScratchStepError('');
                    return true;
                } catch (err) {
                    setScratchStepError(err?.message || 'Failed to apply stereo configuration.');
                    return false;
                }
            }
            case 4:
                return true;
            default:
                return true;
        }
    }, [checkSymbolExists, handleScratchFormSubmit, scratchCurrentIndex, scratchFormData, scratchFragments, scratchSelectedBonds, scratchSelectedFragmentIndex, scratchSmiles]);

    const handleScratchNext = useCallback(async () => {
        const ok = await scratchCheckTab();
        if (wizardRef.current && ok) wizardRef.current.nextTab();
    }, [scratchCheckTab]);

    const handleScratchPrev = useCallback(() => {
        if (wizardRef.current) wizardRef.current.prevTab();
    }, []);

    const handleScratchComplete = useCallback(async () => {
        const mol = String(stereoMolBlock || scratchMolBlock || '');
        if (!mol.trim()) {
            setCreateError('No molblock generated. Please complete the previous steps first.');
            return;
        }

        setCreateError('');
        setCreateIsUploading(true);
        try {
            const sdfText = normalizeSdfRecordForUpload(mol);

            // --- Validate SDF before ingestion ---
            try {
                const result = await validateSdf(
                    { sdf: sdfText, strict: true, functional_check: true, owner_id: null },
                    { fetchFn: apiFetchNoOwner },
                );
                if (!result.valid) {
                    setValidationDialog({
                        open: true,
                        errors: result.errors || [],
                        warnings: result.warnings || [],
                        functionalCheck: result.functional_check || null,
                    });
                    return; // Block upload
                }
            } catch (valErr) {
                if (valErr?.name === 'AbortError') throw valErr;
                setCreateError(`SDF validation error: ${valErr?.message || 'Unknown error'}`);
                return;
            }

            const params = new URLSearchParams();
            params.set('db_name', dbName);
            params.set('scope', 'public');
            params.set('write_mode', 'upsert');

            const res = await apiDbFetch(`${API_DB_URL}/monomers/add?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: sdfText,
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to upload monomer (status ${res.status})`;
                setCreateError(String(msg));
                return;
            }

            invalidateLibraryFetching('public-monomer-added');
            close();
            await load();
        } catch (e) {
            setCreateError(e?.message || 'Failed to upload monomer.');
        } finally {
            setCreateIsUploading(false);
        }
    }, [apiDbFetch, close, dbName, load, stereoMolBlock, scratchMolBlock]);

    return (
        <>
        <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
            <DialogTitle>Create monomer</DialogTitle>
            <DialogContent dividers>
                {createError ? (
                    <Typography variant="body2" sx={{ color: 'error.main', mb: 1 }}>
                        {createError}
                    </Typography>
                ) : null}

                {createMode == null ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Choose how you want to add monomers.
                        </Typography>

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setCreateError('');
                                setCreateMode('upload-sdf');
                            }}
                        >
                            Upload SDF file
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setCreateError('');
                                setCreateMode('scratch');
                            }}
                        >
                            Create from scratch (SMILES → steps)
                        </Button>
                    </Box>
                ) : null}

                {createMode === 'scratch' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <FormWizard
                            ref={wizardRef}
                            color="rgb(30, 41, 59)"
                            stepSize="xs"
                            shape="circle"
                            onComplete={handleScratchComplete}
                            onTabChange={scratchTabChanged}
                            backButtonTemplate={() => (
                                <Button variant="contained" onClick={handleScratchPrev} disabled={createIsUploading}>
                                    Back
                                </Button>
                            )}
                            nextButtonTemplate={() => (
                                <Button variant="contained" onClick={handleScratchNext} disabled={createIsUploading}>
                                    Next
                                </Button>
                            )}
                        >
                            <FormWizard.TabContent title="Choose a molecule" icon="ti-user">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <StepGuideline title="Guideline">
                                        Enter or paste a valid SMILES string for the molecule you want to convert into a monomer.
                                    </StepGuideline>
                                    <TabStep1 smiles={scratchSmiles} handleChangeSmiles={setScratchSmiles} />
                                </Box>
                            </FormWizard.TabContent>

                            <FormWizard.TabContent title="Define attachment points" icon="ti-settings">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <StepGuidelineWithError title="Guideline" error={scratchStepError}>
                                        Click one or more bonds on the left to cut the molecule into fragments.{' '}
                                        Then select the fragment that will become the monomer core from the carousel on the right. A maximum of 4 attachment points ("*") is allowed.
                                    </StepGuidelineWithError>
                                    <TabStepBondsAndFragment
                                        smiles={scratchSmiles}
                                        handleSelectedBonds={handleScratchSelectedBonds}
                                        selectedBonds={scratchSelectedBonds}
                                        fragments={scratchFragments}
                                        selectedFragmentIndex={scratchSelectedFragmentIndex}
                                        handleSelectedFragment={handleScratchSelectedFragment}
                                        onInvalidFragment={(msg) => setScratchStepError(String(msg || ''))}
                                    />
                                </Box>
                            </FormWizard.TabContent>

                            <FormWizard.TabContent title="Fill in Monomer Metadata" icon="ti-check">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <StepGuidelineWithError title="Guideline" error={scratchStepError}>
                                        Fill in monomer metadata. Clicking “Next” will validate the form and also check that the Symbol does not already exist.
                                    </StepGuidelineWithError>
                                    <TabStep4
                                        ref={scratchFormRef}
                                        fragmentSmiles={scratchFragments?.[scratchSelectedFragmentIndex]}
                                        initialData={scratchFormData}
                                        onFormDataChange={handleScratchFormDataChange}
                                        pdbConfig={{
                                            label: 'PDB',
                                            placeholder: 'A1B2',
                                            required: true,
                                            minLength: 3,
                                            maxLength: 4,
                                            normalize: (raw) =>
                                                String(raw || '')
                                                    .toUpperCase()
                                                    .replace(/\s+/g, '')
                                                    .replace(/[^A-Z0-9]/g, '')
                                                    .slice(0, 4),
                                            minLengthMessage: 'Minimum length is 3 characters',
                                            maxLengthMessage: 'Maximum length is 4 characters',
                                        }}
                                    />
                                </Box>
                            </FormWizard.TabContent>

                            <FormWizard.TabContent title="Review Stereochemistry" icon="ti-check">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <StepGuideline title="Guideline">
                                        Review and confirm the stereochemistry assignments for chiral centers.
                                        The server has analyzed the capped molecule. You may override R / S
                                        before proceeding.
                                    </StepGuideline>
                                    <TabStepStereo
                                        ref={stereoRef}
                                        smiles={scratchFragments?.[scratchSelectedFragmentIndex] || ''}
                                        form={scratchFormData}
                                        savedStereoMap={scratchStereoMap}
                                        onStereoMapChange={setScratchStereoMap}
                                    />
                                </Box>
                            </FormWizard.TabContent>

                            <FormWizard.TabContent title="Validate" icon="ti-check">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <StepGuideline title="Guideline">
                                        Review the generated molblock. If anything looks wrong you can edit it
                                        directly below before clicking "Complete" to upload this monomer into the public library.
                                    </StepGuideline>
                                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                                        This molblock is editable &mdash; feel free to make corrections before uploading.
                                    </Alert>
                                    <TextField
                                        label="Generated molblock"
                                        value={stereoMolBlock || scratchMolBlock || ''}
                                        onChange={(e) => setStereoMolBlock(e.target.value)}
                                        multiline
                                        minRows={10}
                                        maxRows={18}
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                sx: { fontFamily: 'monospace', '& textarea': { overflow: 'auto' } },
                                            },
                                        }}
                                    />
                                </Box>
                            </FormWizard.TabContent>
                        </FormWizard>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Button variant="text" onClick={() => setCreateMode(null)} disabled={createIsUploading}>
                                Back
                            </Button>
                        </Box>

                        <style>{`
                            @import url("https://cdn.jsdelivr.net/gh/lykmapipo/themify-icons@0.1.2/css/themify-icons.css");
                            .wizard-card-footer{ display:flex; justify-content:center; margin-top:10px; gap:20px; flex-wrap:wrap; row-gap:10px; position:sticky; bottom:0; z-index:2; padding:10px 0; }
                        `}</style>
                    </Box>
                ) : null}

                {createMode === 'upload-sdf' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <SdfFormatHelp />

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button variant="outlined" component="label">
                                Choose file
                                <input
                                    type="file"
                                    hidden
                                    accept=".sdf,.sd,.mol"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        void handleCreateFilePicked(f);
                                        e.target.value = '';
                                    }}
                                />
                            </Button>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {createFileName ? createFileName : 'No file selected'}
                            </Typography>
                            <Button variant="text" onClick={() => setCreateMode(null)}>
                                Back
                            </Button>
                        </Box>

                        {createRecords.length > 0 ? (
                            <FormControl size="small" fullWidth>
                                <InputLabel id="sdf-record-label">Monomer record</InputLabel>
                                <Select
                                    labelId="sdf-record-label"
                                    label="Monomer record"
                                    value={createSelectedRecordId}
                                    onChange={(e) => setCreateSelectedRecordId(String(e.target.value))}
                                >
                                    {createRecords.map((r, idx) => (
                                        <MenuItem key={r.id} value={r.id}>
                                            {getSdfDisplayLabel(r.text, `#${idx + 1}`)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null}

                        {createRecords.length > 0 && createSelectedRecordId ? (
                            <TextField
                                label="SDF record (editable)"
                                value={createRecords.find((r) => r.id === createSelectedRecordId)?.text || ''}
                                onChange={(e) => updateCreateRecordText(createSelectedRecordId, e.target.value)}
                                multiline
                                minRows={10}
                                fullWidth
                            />
                        ) : null}

                        {createRecords.length > 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Records loaded: {createRecords.length}
                            </Typography>
                        ) : null}
                    </Box>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={close} disabled={createIsUploading}>Close</Button>
                {createMode === 'upload-sdf' ? (
                    <Button
                        onClick={uploadCreateRecords}
                        variant="contained"
                        disabled={createIsUploading || createRecords.length === 0}
                        startIcon={createIsUploading ? <CircularProgress size={18} /> : null}
                    >
                        Upload
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>

            <SdfValidationDialog
                open={validationDialog.open}
                onClose={() => setValidationDialog((prev) => ({ ...prev, open: false }))}
                errors={validationDialog.errors}
                warnings={validationDialog.warnings}
                functionalCheck={validationDialog.functionalCheck}
            />
        </>
    );
});

export default function PublicMonomers() {
    const [adminToken, setAdminToken] = useState(() => readAdminToken());
    const [tokenDraft, setTokenDraft] = useState('');

    const [adminCheck, setAdminCheck] = useState({
        status: 'idle',
        enabled: null,
        authorized: null,
        message: '',
    });

    const checkAdminToken = useCallback(async (tokenToCheck) => {
        setAdminCheck({ status: 'checking', enabled: null, authorized: null, message: '' });

        try {
            const res = await apiFetchNoOwner(`${API_DB_URL}/monomers/admin/check`, {
                method: 'GET',
                headers: makeAdminHeaders(tokenToCheck),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const message = json?.message || json?.error || `Admin check failed (status ${res.status})`;
                setAdminCheck({ status: 'denied', enabled: true, authorized: false, message: String(message) });
                return { ok: false, enabled: true, authorized: false, message: String(message) };
            }

            const enabled = Boolean(json?.data?.enabled);
            const authorized = Boolean(json?.data?.authorized);
            setAdminCheck({
                status: 'ok',
                enabled,
                authorized,
                message: enabled ? 'Authorized.' : 'Token auth is disabled on the server (PUBLIC_ADMIN_TOKEN not set).',
            });
            return { ok: true, enabled, authorized, message: '' };
        } catch (e) {
            const message = e?.message || String(e);
            setAdminCheck({ status: 'error', enabled: null, authorized: null, message });
            return { ok: false, enabled: null, authorized: null, message };
        }
    }, []);

    useEffect(() => {
        checkAdminToken(adminToken);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminToken]);

    const isAuthed = useMemo(() => {
        if (adminCheck.enabled === false) return true;
        return Boolean(adminToken) && adminCheck.authorized === true;
    }, [adminCheck.enabled, adminCheck.authorized, adminToken]);

    const apiDbFetch = useCallback(
        async (url, init) => {
            const nextInit = { ...(init || {}) };
            nextInit.headers = makeAdminHeaders(adminToken, nextInit.headers);
            return apiFetchNoOwner(url, nextInit);
        },
        [adminToken]
    );

    const [dbName, setDbName] = useState('pepedit');
    const [monomers, setMonomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editError, setEditError] = useState('');

    const [search, setSearch] = useState('');
    const [sortState, setSortState] = useState({ key: 'symbol', direction: 'asc' });
    const [visibleColumns, setVisibleColumns] = useState([]);
    const [columnWidths, setColumnWidths] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(COLUMN_WIDTHS_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    });

    const [columnsAnchorEl, setColumnsAnchorEl] = useState(null);
    const isColumnsMenuOpen = Boolean(columnsAnchorEl);

    const [imagePreview, setImagePreview] = useState({ open: false, symbol: '', imageBase64: null });

    const [editDialog, setEditDialog] = useState({ open: false, monomer: null, originalSymbol: '', rGroupSlots: [], baseRGroups: [] });
    const [editForm, setEditForm] = useState({
        symbol: '',
        name: '',
        natAnalog: 'X',
        pdbName: '',
        type: 'aa',
        subtype: 'aa',
        rGroupsByIndex: {},
    });

    const editRGroupCount = editDialog?.rGroupSlots?.length ?? 0;
    const capRequired = editRGroupCount === 1;
    const capForbidden = editRGroupCount > 1;

    const [deleteDialog, setDeleteDialog] = useState({ open: false, monomer: null });
    const [bulkDeleteDialog, setBulkDeleteDialog] = useState({ open: false, symbols: [] });
    const [bulkDeleteError, setBulkDeleteError] = useState('');
    const [bulkDeleteIsDeleting, setBulkDeleteIsDeleting] = useState(false);
    const [deleteAllDialog, setDeleteAllDialog] = useState(false);
    const [selectedSymbols, setSelectedSymbols] = useState(new Set());

    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const clearAdminToken = useCallback(() => {
        writeAdminToken('');
        setAdminToken(null);
        setTokenDraft('');
        setError('');
        setMonomers([]);
    }, []);

    const saveToken = useCallback(async () => {
        const candidate = String(tokenDraft ?? '').trim();
        if (!candidate) return;
        setError('');
        const res = await checkAdminToken(candidate);
        if (!res.ok) {
            setError(res.message || 'Invalid admin token.');
            return;
        }
        if (res.enabled && !res.authorized) {
            setError('Invalid admin token.');
            return;
        }
        const next = writeAdminToken(candidate);
        setAdminToken(next);
        setTokenDraft('');
    }, [checkAdminToken, tokenDraft]);

    const publicListUrl = useMemo(() => {
        const params = new URLSearchParams();
        params.set('db_name', dbName);
        params.set('include_images', 'true');
        return `${API_DB_URL}/monomers?${params.toString()}`;
    }, [dbName]);

    const load = useCallback(async () => {
        if (!isAuthed) return;
        setError('');
        setIsLoading(true);
        try {
            const res = await apiDbFetch(publicListUrl, { method: 'GET' });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to load public monomers (status ${res.status})`;
                setError(String(msg));
                setMonomers([]);
                return;
            }

            const data = json?.data ?? json;
            const list = Array.isArray(data) ? data : (Array.isArray(data?.monomers) ? data.monomers : []);
            setMonomers(Array.isArray(list) ? list : []);
        } catch (e) {
            setError(e?.message || 'Failed to load public monomers.');
            setMonomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiDbFetch, isAuthed, publicListUrl]);

    useEffect(() => {
        if (!isAuthed) return;
        load();
    }, [isAuthed, load]);

    const normalized = useMemo(() => monomers.map(normalizeMonomer), [monomers]);

    const tableKeys = useMemo(() => {
        const keys = new Set();
        for (const m of normalized) {
            const raw = m?.raw;
            if (!raw || typeof raw !== 'object') continue;
            for (const k of Object.keys(raw)) {
                if (k === 'sdf') continue;
                if (NEVER_VISIBLE_KEYS.has(k)) continue;
                keys.add(k);
            }
        }
        const arr = Array.from(keys);
        const orderIndex = (k) => {
            const idx = PREFERRED_ORDER.indexOf(k);
            return idx === -1 ? 10_000 : idx;
        };
        arr.sort((a, b) => {
            const ao = orderIndex(a);
            const bo = orderIndex(b);
            if (ao !== bo) return ao - bo;
            return labelForKey(a).localeCompare(labelForKey(b));
        });
        return arr;
    }, [normalized]);

    useEffect(() => {
        setVisibleColumns((prev) => {
            if (prev && prev.length > 0) return prev;

            try {
                const stored = window?.localStorage?.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        const filteredStored = parsed.filter((k) => tableKeys.includes(k));
                        if (filteredStored.length > 0) return filteredStored;
                    }
                }
            } catch {
                // ignore
            }

            return tableKeys.filter((k) => !DEFAULT_HIDDEN_KEYS.has(k));
        });
    }, [tableKeys]);

    useEffect(() => {
        if (!visibleColumns || visibleColumns.length === 0) return;
        try {
            window?.localStorage?.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
        } catch {
            // ignore
        }
    }, [visibleColumns]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths || {}));
        } catch {
            // ignore
        }
    }, [columnWidths]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return normalized;
        return normalized.filter((m) =>
            [m.symbol, m.name, m.natAnalog, m.pdbName, m.type, m.subtype].some((f) => String(f || '').toLowerCase().includes(q))
        );
    }, [normalized, search]);

    const sortedFiltered = useMemo(() => {
        const { key, direction } = sortState;
        if (!key) return filtered;
        const dir = direction === 'desc' ? -1 : 1;

        const valueOf = (row) => {
            const rawValue = row?.raw?.[key];
            if (rawValue == null) return '';
            if (typeof rawValue === 'number') return rawValue;
            return sortValueForCell(rawValue, key);
        };

        return [...filtered].sort((a, b) => {
            const av = valueOf(a);
            const bv = valueOf(b);
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av).localeCompare(String(bv)) * dir;
        });
    }, [filtered, sortState]);

    const openColumnsMenu = useCallback((e) => {
        setColumnsAnchorEl(e.currentTarget);
    }, []);

    const closeColumnsMenu = useCallback(() => {
        setColumnsAnchorEl(null);
    }, []);

    const toggleColumn = useCallback((key) => {
        setVisibleColumns((prev) => {
            const has = prev.includes(key);
            const next = has ? prev.filter((k) => k !== key) : [...prev, key];
            return next.length > 0 ? next : prev;
        });
    }, []);

    const requestSort = useCallback((key) => {
        setSortState((s) => {
            if (s.key !== key) return { key, direction: 'asc' };
            return { key, direction: s.direction === 'asc' ? 'desc' : 'asc' };
        });
    }, []);

    const openImage = useCallback((m) => {
        const nm = normalizeMonomer(m);
        setImagePreview({ open: true, symbol: nm.symbol, imageBase64: nm.imageBase64 });
    }, []);

    const closeImage = useCallback(() => {
        setImagePreview({ open: false, symbol: '', imageBase64: null });
    }, []);

    const checkSymbolExists = useCallback(async (values) => {
        const symbol = String(values?.symbol || '').trim();
        if (!symbol) return { exists: false };

        const params = new URLSearchParams();
        params.set('db_name', dbName);
        params.set('symbol', symbol);

        const res = await apiDbFetch(`${API_DB_URL}/monomers/exists?${params.toString()}`, { method: 'GET' });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            return { exists: false, error: json?.message || json?.error || `Failed to validate symbol (status ${res.status})` };
        }

        if (typeof json?.data?.symbol?.exists === 'boolean') {
            return { exists: json.data.symbol.exists };
        }

        if (typeof json?.exists === 'boolean') return { exists: json.exists };
        if (typeof json?.data?.exists === 'boolean') return { exists: json.data.exists };

        return { exists: false };
    }, [apiDbFetch, dbName]);

    const openCreateDialog = useCallback(() => {
        setCreateDialogOpen(true);
    }, []);

    const closeCreateDialog = useCallback(() => {
        setCreateDialogOpen(false);
    }, []);


    const openEdit = useCallback((m) => {
        setEditError('');
        const nm = normalizeMonomer(m);
        const slots = getRGroupSlots(m);
        const rGroupCount = slots.length;

        const desiredType = rGroupCount === 1 ? 'cap' : nm.type;
        const fixed = enforceTypeSubtypeRule(desiredType, nm.subtype);
        const natAnalog = normalizeNatAnalogInput(nm.natAnalog) || 'X';
        const baseRGroups = Array.isArray(m?.m_Rgroups) ? m.m_Rgroups.slice() : [];
        const rGroupsByIndex = {};
        for (const i of slots) {
            rGroupsByIndex[i] = baseRGroups[i] == null ? '' : String(baseRGroups[i]);
        }
        setEditForm({
            symbol: nm.symbol,
            name: nm.name,
            natAnalog,
            pdbName: normalizePdbNameInput(nm.pdbName),
            type: fixed.type,
            subtype: fixed.subtype,
            rGroupsByIndex,
        });
        setEditDialog({ open: true, monomer: m, originalSymbol: nm.symbol, rGroupSlots: slots, baseRGroups });
    }, []);

    const closeEdit = useCallback(() => {
        setEditError('');
        setEditDialog({ open: false, monomer: null, originalSymbol: '', rGroupSlots: [], baseRGroups: [] });
    }, []);

    const submitEdit = useCallback(async () => {
        setEditError('');
        const symbol = String(editForm.symbol || '').trim();
        if (!symbol) return;

        const rGroupCount = editDialog?.rGroupSlots?.length ?? 0;
        if (rGroupCount > 1 && editForm.type === 'cap') {
            const msg = 'Type “cap” is not allowed when more than one R group is defined.';
            setEditError(msg);
            setError(msg);
            return;
        }

        if (rGroupCount === 1 && editForm.type !== 'cap') {
            const msg = 'When exactly one R group is defined, type must be “cap”.';
            setEditError(msg);
            setError(msg);
            return;
        }

        const originalSymbol = String(editDialog.originalSymbol || symbol).trim();
        const pdbName = normalizePdbNameInput(editForm.pdbName);
        if (pdbName && !/^[A-Z0-9]{3,4}$/.test(pdbName)) {
            const msg = 'PDB name must be 3–4 uppercase alphanumeric characters (A–Z, 0–9).';
            setEditError(msg);
            setError(msg);
            return;
        }

        const fixed = enforceTypeSubtypeRule(editForm.type, editForm.subtype);

        const natAnalog = normalizeNatAnalogInput(editForm.natAnalog) || 'X';

        const nextRGroups = Array.isArray(editDialog.baseRGroups) ? editDialog.baseRGroups.slice() : [];
        for (const i of editDialog.rGroupSlots || []) {
            const v = String(editForm.rGroupsByIndex?.[i] ?? '').trim();
            if (v !== 'H' && v !== 'OH') {
                const msg = `Invalid R${Number(i) + 1} group. Allowed values: H, OH.`;
                setEditError(msg);
                setError(msg);
                return;
            }
            nextRGroups[i] = v;
        }

        setEditError('');
        setError('');
        setIsLoading(true);
        try {
            const payload = {
                db_name: dbName,
                collection: 'public_monomers',
                targets: [originalSymbol],
                set_fields: {
                    id_field: symbol,
                    m_name: String(editForm.name || '').trim(),
                    symbol,
                    m_abbr: symbol,
                    natAnalog,
                    pdbName,
                    m_type: fixed.type,
                    m_subtype: fixed.subtype,
                    m_Rgroups: nextRGroups,
                },
            };

            const res = await apiDbFetch(`${API_DB_URL}/monomers/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to edit monomer (status ${res.status})`;
                setEditError(String(msg));
                setError(String(msg));
                return;
            }

            invalidateLibraryFetching('public-monomer-edited');
            closeEdit();
            await load();
        } catch (e) {
            const msg = e?.message || 'Failed to edit monomer.';
            setEditError(msg);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [apiDbFetch, closeEdit, dbName, editDialog, editForm, load]);

    const requestDelete = useCallback((m) => {
        setDeleteDialog({ open: true, monomer: m });
    }, []);

    const closeDelete = useCallback(() => {
        setDeleteDialog({ open: false, monomer: null });
    }, []);

    const confirmDelete = useCallback(async () => {
        const m = deleteDialog.monomer;
        const symbol = String(m?.symbol ?? '').trim();
        if (!symbol) return;

        setError('');
        setIsLoading(true);
        try {
            const res = await apiDbFetch(`${API_DB_URL}/monomers/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ db_name: dbName, scope: 'public', symbols: [symbol] }),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to delete monomer (status ${res.status})`;
                setError(String(msg));
                return;
            }

            invalidateLibraryFetching('public-monomer-deleted');
            closeDelete();
            await load();
        } catch (e) {
            setError(e?.message || 'Failed to delete monomer.');
        } finally {
            setIsLoading(false);
        }
    }, [apiDbFetch, closeDelete, dbName, deleteDialog.monomer, load]);

    // ── Selection ──
    const selectionCount = selectedSymbols.size;

    const toggleSelect = useCallback((symbol) => {
        setSelectedSymbols((prev) => {
            const next = new Set(prev);
            if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        setSelectedSymbols((prev) => {
            const allSymbols = sortedFiltered.map((r) => String(r?.symbol || '').trim()).filter(Boolean);
            const allSelected = allSymbols.length > 0 && allSymbols.every((s) => prev.has(s));
            return allSelected ? new Set() : new Set(allSymbols);
        });
    }, [sortedFiltered]);

    // ── Bulk delete (selected) ──
    const openBulkDeleteDialog = useCallback(() => {
        const symbols = Array.from(selectedSymbols || []).filter(Boolean);
        if (symbols.length === 0) return;
        setBulkDeleteError('');
        setBulkDeleteDialog({ open: true, symbols });
    }, [selectedSymbols]);

    const closeBulkDeleteDialog = useCallback(() => {
        setBulkDeleteDialog({ open: false, symbols: [] });
        setBulkDeleteError('');
    }, []);

    const confirmBulkDelete = useCallback(async () => {
        const symbols = bulkDeleteDialog.symbols;
        if (!symbols || symbols.length === 0) return;

        setBulkDeleteError('');
        setBulkDeleteIsDeleting(true);
        try {
            const res = await apiDbFetch(`${API_DB_URL}/monomers/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ db_name: dbName, scope: 'public', symbols }),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to delete monomers (status ${res.status})`;
                setBulkDeleteError(String(msg));
                return;
            }

            setSelectedSymbols(new Set());
            invalidateLibraryFetching('public-monomers-bulk-deleted');
            closeBulkDeleteDialog();
            await load();
        } catch (e) {
            setBulkDeleteError(e?.message || 'Failed to delete monomers.');
        } finally {
            setBulkDeleteIsDeleting(false);
        }
    }, [apiDbFetch, bulkDeleteDialog.symbols, closeBulkDeleteDialog, dbName, load]);

    // ── Delete all ──
    const openDeleteAllDialog = useCallback(() => setDeleteAllDialog(true), []);
    const closeDeleteAllDialog = useCallback(() => setDeleteAllDialog(false), []);

    const confirmDeleteAll = useCallback(async () => {
        const allSymbols = (normalized || []).map((m) => String(m?.symbol || '').trim()).filter(Boolean);
        if (allSymbols.length === 0) return;

        setError('');
        setIsLoading(true);
        try {
            const res = await apiDbFetch(`${API_DB_URL}/monomers/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ db_name: dbName, scope: 'public', symbols: allSymbols }),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = json?.message || json?.error || `Failed to delete all monomers (status ${res.status})`;
                setError(String(msg));
                return;
            }

            setSelectedSymbols(new Set());
            invalidateLibraryFetching('public-monomers-all-deleted');
            closeDeleteAllDialog();
            await load();
        } catch (e) {
            setError(e?.message || 'Failed to delete all monomers.');
        } finally {
            setIsLoading(false);
        }
    }, [apiDbFetch, closeDeleteAllDialog, dbName, load, normalized]);

    const exportMonomerSdf = useCallback((m) => {
        const symbol = String(m?.symbol || m?._id || 'monomer').trim() || 'monomer';
        const sdf = m?.sdf;
        if (!sdf || !String(sdf).trim()) {
            setError(`No SDF available for ${symbol}.`);
            return;
        }
        downloadTextFile(`${symbol}.sdf`, String(sdf));
    }, []);

    const exportAllSdf = useCallback(() => {
        const all = (normalized || []).map((m) => m?.raw).filter(Boolean);
        const sdfs = all
            .map((m) => (m?.sdf && String(m.sdf).trim() ? String(m.sdf) : ''))
            .filter(Boolean);

        if (sdfs.length === 0) {
            setError('No SDF data available to export.');
            return;
        }

        const content = sdfs.join('');
        const stamp = new Date().toISOString().slice(0, 10);
        downloadTextFile(`public_monomers_${stamp}.sdf`, content);
    }, [normalized]);

    const columnsForMenu = useMemo(() => tableKeys.filter((k) => !NEVER_VISIBLE_KEYS.has(k)), [tableKeys]);

    const renderCell = useCallback((raw, key) => {
        const value = raw?.[key];
        if (value == null) return '';
        if (key === 'm_Rgroups') return formatRGroups(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }, []);

    const columnsWidth = useCallback((key) => {
        if (key === '__img__') return Math.max(columnWidths.__img__ || IMG_COL_WIDTH, IMG_COL_MIN_WIDTH);
        if (key === '__actions__') return ACTIONS_COL_WIDTH;
        const base = columnWidths?.[key];
        const min = COLUMN_MIN_WIDTH?.[key] || 120;
        return Math.max(Number(base) || min, min);
    }, [columnWidths]);

    const updateColumnWidth = useCallback((key, nextPx) => {
        setColumnWidths((prev) => ({ ...prev, [key]: Math.max(60, Math.round(nextPx)) }));
    }, []);

    const startResize = useCallback((e, key) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startW = columnsWidth(key);

        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            updateColumnWidth(key, startW + dx);
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [columnsWidth, updateColumnWidth]);

    if (!isAuthed) {
        return (
            <Box sx={{ height: '100%', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Paper
                    variant="outlined"
                    sx={{ p: 2, width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.5px', mb: 1 }}>
                        PUBLIC MONOMERS (ADMIN)
                    </Typography>

                    {adminCheck.status === 'checking' ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Checking admin token requirements…
                        </Alert>
                    ) : null}

                    {adminCheck.enabled === false ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            PUBLIC_ADMIN_TOKEN is not set on the server; admin token auth is disabled.
                            This page will be accessible without a token.
                        </Alert>
                    ) : null}

                    {adminCheck.status === 'denied' ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {adminCheck.message || 'Admin token is required and was not accepted.'}
                        </Alert>
                    ) : null}

                    {adminCheck.status === 'error' ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {adminCheck.message || 'Failed to check admin token.'}
                        </Alert>
                    ) : null}

                    {error ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    ) : null}

                    <Box sx={{ maxWidth: 720 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                            Enter the admin token to access the public monomer management UI.
                            This token is sent as the <strong>X-Admin-Token</strong> header for write operations.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                            <TextField
                                label="DB name"
                                value={dbName}
                                onChange={(e) => setDbName(e.target.value)}
                                size="small"
                                sx={{ width: 220 }}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                label="Admin token"
                                value={tokenDraft}
                                onChange={(e) => setTokenDraft(e.target.value)}
                                placeholder="Paste token"
                                size="small"
                                sx={{ minWidth: 420, flex: 1 }}
                            />
                            <Button variant="contained" onClick={saveToken} disabled={!String(tokenDraft).trim() || adminCheck.status === 'checking'}>
                                Save token
                            </Button>
                            <Button variant="outlined" onClick={() => setTokenDraft('')} disabled={!tokenDraft}>
                                Clear
                            </Button>
                            <Button variant="text" color="inherit" onClick={clearAdminToken}>
                                Disconnect
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.5px' }}>
                            PUBLIC MONOMERS
                        </Typography>
                        {adminCheck.enabled === false ? (
                            <Typography variant="body2" sx={{ color: 'warning.main', mt: 0.5 }}>
                                Admin token auth is disabled on the server (PUBLIC_ADMIN_TOKEN not set).
                            </Typography>
                        ) : null}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <TextField
                            label="DB name"
                            value={dbName}
                            onChange={(e) => setDbName(e.target.value)}
                            size="small"
                            sx={{ width: 200 }}
                        />

                        <Tooltip title="Refresh">
                            <span>
                                <IconButton size="small" onClick={load} disabled={isLoading}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Choose columns">
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ViewColumnIcon fontSize="small" />}
                                    onClick={openColumnsMenu}
                                >
                                    Columns
                                </Button>
                            </span>
                        </Tooltip>

                        <Tooltip title="Export all as SDF">
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadIcon fontSize="small" />}
                                    onClick={exportAllSdf}
                                    disabled={isLoading || normalized.length === 0}
                                >
                                    Export SDF
                                </Button>
                            </span>
                        </Tooltip>

                        <Tooltip title={selectionCount === 0 ? 'Select monomers first' : `Delete ${selectionCount} selected monomer${selectionCount > 1 ? 's' : ''}`}>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon fontSize="small" />}
                                    onClick={openBulkDeleteDialog}
                                    disabled={selectionCount === 0 || isLoading}
                                >
                                    Delete ({selectionCount})
                                </Button>
                            </span>
                        </Tooltip>

                        <Tooltip title="Delete ALL monomers from the database">
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteSweepIcon fontSize="small" />}
                                    onClick={openDeleteAllDialog}
                                    disabled={isLoading || normalized.length === 0}
                                >
                                    Delete All
                                </Button>
                            </span>
                        </Tooltip>

                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon fontSize="small" />}
                            onClick={openCreateDialog}
                        >
                            Add
                        </Button>

                        <Button size="small" variant="text" color="inherit" onClick={clearAdminToken}>
                            Disconnect
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ mb: 1 }} />

                {error ? (
                    <Alert severity="error" sx={{ mb: 1 }}>
                        {error}
                    </Alert>
                ) : null}

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    <TextField
                        label="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        sx={{ minWidth: 360, flex: 1 }}
                    />
                    {isLoading ? <CircularProgress size={18} /> : null}

                    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', pl: 1 }}>
                        {sortedFiltered.length} / {normalized.length} monomers
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {/* Selection checkbox */}
                                <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper' }}>
                                    <Checkbox
                                        size="small"
                                        indeterminate={selectionCount > 0 && selectionCount < sortedFiltered.length}
                                        checked={sortedFiltered.length > 0 && selectionCount === sortedFiltered.length}
                                        onChange={toggleSelectAll}
                                    />
                                </TableCell>
                                <TableCell
                                    sx={{
                                        width: ACTIONS_COL_WIDTH,
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 3,
                                        backgroundColor: 'background.paper',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Actions
                                </TableCell>

                                <TableCell sx={{ width: columnsWidth('__img__'), minWidth: IMG_COL_MIN_WIDTH }}>Image</TableCell>

                                {visibleColumns.map((key) => (
                                    <TableCell
                                        key={key}
                                        sx={{ width: columnsWidth(key), minWidth: COLUMN_MIN_WIDTH[key] || 120, position: 'relative' }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TableSortLabel
                                                active={sortState.key === key}
                                                direction={sortState.key === key ? sortState.direction : 'asc'}
                                                onClick={() => requestSort(key)}
                                            >
                                                {labelForKey(key)}
                                            </TableSortLabel>

                                            <Box
                                                onMouseDown={(e) => startResize(e, key)}
                                                sx={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    height: '100%',
                                                    width: 6,
                                                    cursor: 'col-resize',
                                                    zIndex: 2,
                                                }}
                                            />
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {sortedFiltered.map((row) => {
                                const raw = row?.raw || {};
                                const symbol = String(row?.symbol || '').trim();
                                const img = row?.imageBase64;
                                const hasImg = Boolean(img && String(img).trim());

                                return (
                                    <TableRow key={symbol || JSON.stringify(raw)} hover selected={selectedSymbols.has(symbol)}>
                                        {/* Selection checkbox */}
                                        <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.paper' }}>
                                            <Checkbox
                                                size="small"
                                                checked={selectedSymbols.has(symbol)}
                                                onChange={() => toggleSelect(symbol)}
                                            />
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                width: ACTIONS_COL_WIDTH,
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 2,
                                                backgroundColor: 'background.paper',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <Tooltip title="Edit">
                                                <span>
                                                    <IconButton size="small" onClick={() => openEdit(raw)} disabled={isLoading}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <span>
                                                    <IconButton size="small" onClick={() => requestDelete(raw)} disabled={isLoading}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Export SDF">
                                                <span>
                                                    <IconButton size="small" onClick={() => exportMonomerSdf(raw)} disabled={isLoading}>
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell sx={{ width: columnsWidth('__img__') }}>
                                            {hasImg ? (
                                                <Tooltip title="View image">
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        onClick={() => openImage(raw)}
                                                        sx={{
                                                            p: 0,
                                                            m: 0,
                                                            border: 0,
                                                            background: 'transparent',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                        }}
                                                        aria-label={`View image for ${symbol || 'monomer'}`}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={`data:image/png;base64,${img}`}
                                                            alt={`Structure of ${symbol || 'monomer'}`}
                                                            sx={{ width: 44, height: 44, objectFit: 'contain', display: 'block' }}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="No image">
                                                    <span>
                                                        <ImageIcon fontSize="small" />
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </TableCell>

                                        {visibleColumns.map((key) => (
                                            <TableCell key={key} sx={{ width: columnsWidth(key) }}>
                                                {renderCell(raw, key)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                <Menu
                    anchorEl={columnsAnchorEl}
                    open={isColumnsMenuOpen}
                    onClose={closeColumnsMenu}
                    MenuListProps={{ dense: true }}
                >
                    {columnsForMenu.map((key) => (
                        <Box
                            key={key}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1.5,
                                py: 0.75,
                                cursor: 'pointer',
                                userSelect: 'none',
                                gap: 1,
                            }}
                            onClick={() => toggleColumn(key)}
                        >
                            <Checkbox checked={visibleColumns.includes(key)} size="small" />
                            <ListItemText primary={labelForKey(key)} />
                        </Box>
                    ))}
                </Menu>

                <Dialog open={imagePreview.open} onClose={closeImage} maxWidth="sm" fullWidth>
                    <DialogTitle>Monomer image: {imagePreview.symbol || ''}</DialogTitle>
                    <DialogContent dividers>
                        {imagePreview.imageBase64 ? (
                            <Box
                                component="img"
                                alt={imagePreview.symbol || 'monomer'}
                                src={`data:image/png;base64,${imagePreview.imageBase64}`}
                                sx={{ maxWidth: '100%', height: 'auto' }}
                            />
                        ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                No image available.
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeImage} variant="contained">Close</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={editDialog.open} onClose={closeEdit} maxWidth="md" fullWidth>
                    <DialogTitle>Edit monomer</DialogTitle>
                    <DialogContent dividers>
                        {editError ? (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {editError}
                            </Alert>
                        ) : null}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                label="Symbol"
                                value={editForm.symbol}
                                onChange={(e) => setEditForm((p) => ({ ...p, symbol: e.target.value }))}
                                size="small"
                            />
                            <TextField
                                label="Name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                size="small"
                            />
                            <FormControl size="small">
                                <InputLabel id="nat-analog-label">Natural analog</InputLabel>
                                <Select
                                    labelId="nat-analog-label"
                                    label="Natural analog"
                                    value={normalizeNatAnalogInput(editForm.natAnalog) || 'X'}
                                    onChange={(e) => {
                                        const next = normalizeNatAnalogInput(e.target.value) || 'X';
                                        setEditForm((s) => ({ ...s, natAnalog: next }));
                                    }}
                                >
                                    {NATURAL_ANALOG_OPTIONS.map((aa) => (
                                        <MenuItem key={aa} value={aa}>
                                            {aa}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                    Use X when no natural analog exists.
                                </Typography>
                            </FormControl>
                            <TextField
                                label="PDB name"
                                value={editForm.pdbName}
                                onChange={(e) => setEditForm((p) => ({ ...p, pdbName: normalizePdbNameInput(e.target.value) }))}
                                size="small"
                                inputProps={{ maxLength: 4 }}
                                placeholder="A1B2"
                                helperText="3–4 characters, uppercase letters/numbers (A–Z, 0–9)."
                            />
                            <FormControl size="small">
                                <InputLabel id="m-type-label">Type</InputLabel>
                                <Select
                                    labelId="m-type-label"
                                    label="Type"
                                    value={editForm.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        const fixed = enforceTypeSubtypeRule(nextType, editForm.subtype);
                                        setEditForm((s) => ({
                                            ...s,
                                            type: fixed.type,
                                            subtype: fixed.subtype,
                                            natAnalog: normalizeNatAnalogInput(s.natAnalog) || 'X',
                                        }));
                                    }}
                                >
                                    <MenuItem value="aa" disabled={capRequired}>aa</MenuItem>
                                    <MenuItem value="cap" disabled={capForbidden}>cap</MenuItem>
                                    <MenuItem value="other" disabled={capRequired}>other</MenuItem>
                                </Select>
                            </FormControl>

                            {capForbidden ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Type “cap” is disabled when more than one R group exists.
                                </Typography>
                            ) : null}

                            {capRequired ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    When exactly one R group exists, type is forced to “cap”.
                                </Typography>
                            ) : null}

                            <FormControl size="small" disabled={editForm.type === 'cap' || editForm.type === 'other'}>
                                <InputLabel id="m-subtype-label">Subtype</InputLabel>
                                <Select
                                    labelId="m-subtype-label"
                                    label="Subtype"
                                    value={editForm.subtype}
                                    onChange={(e) => {
                                        const nextSubtype = e.target.value;
                                        const fixed = enforceTypeSubtypeRule(editForm.type, nextSubtype);
                                        setEditForm((s) => ({ ...s, type: fixed.type, subtype: fixed.subtype }));
                                    }}
                                >
                                    {editForm.type === 'cap' ? (
                                        <MenuItem value="cap">cap</MenuItem>
                                    ) : editForm.type === 'other' ? (
                                        <MenuItem value="non-natural">non-natural</MenuItem>
                                    ) : (
                                        [
                                            <MenuItem key="natural" value="natural">natural</MenuItem>,
                                            <MenuItem key="non-natural" value="non-natural">non-natural</MenuItem>,
                                        ]
                                    )}
                                </Select>
                            </FormControl>

                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Note: for type “cap”, subtype is forced to “cap”. For type “other”, subtype is forced to “non-natural”.
                            </Typography>

                            {(editDialog.rGroupSlots || []).map((i) => (
                                <FormControl key={i} size="small">
                                    <InputLabel id={`rgroup-${i}-label`}>{`R${Number(i) + 1}`}</InputLabel>
                                    <Select
                                        labelId={`rgroup-${i}-label`}
                                        label={`R${Number(i) + 1}`}
                                        value={editForm.rGroupsByIndex?.[i] ?? ''}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setEditForm((s) => ({
                                                ...s,
                                                rGroupsByIndex: { ...(s.rGroupsByIndex || {}), [i]: v },
                                            }));
                                        }}
                                    >
                                        <MenuItem value="H">H</MenuItem>
                                        <MenuItem value="OH">OH</MenuItem>
                                    </Select>
                                </FormControl>
                            ))}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeEdit} variant="outlined">Cancel</Button>
                        <Button onClick={submitEdit} variant="contained" disabled={isLoading}>Save</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteDialog.open} onClose={closeDelete} maxWidth="xs" fullWidth>
                    <DialogTitle>Delete monomer</DialogTitle>
                    <DialogContent dividers>
                        <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
                            This action is permanent and cannot be undone.
                        </Alert>
                        <Typography variant="body2">
                            Are you sure you want to permanently delete <strong>{String(deleteDialog?.monomer?.symbol ?? '').trim() || 'this monomer'}</strong> from the public library?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDelete} variant="outlined">Cancel</Button>
                        <Button onClick={confirmDelete} variant="contained" color="error" disabled={isLoading}>Delete</Button>
                    </DialogActions>
                </Dialog>

                {/* Bulk delete confirmation */}
                <Dialog open={bulkDeleteDialog.open} onClose={closeBulkDeleteDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Delete selected monomers</DialogTitle>
                    <DialogContent dividers>
                        <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
                            This action is permanent and cannot be undone. All selected monomers will be removed from the public database.
                        </Alert>
                        {bulkDeleteError ? (
                            <Alert severity="error" sx={{ mb: 1 }}>{bulkDeleteError}</Alert>
                        ) : null}
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Are you sure you want to permanently delete <strong>{bulkDeleteDialog.symbols.length}</strong> monomer{bulkDeleteDialog.symbols.length > 1 ? 's' : ''}?
                        </Typography>
                        <TextField
                            label="Monomers to delete"
                            value={bulkDeleteDialog.symbols.join(', ')}
                            multiline
                            minRows={2}
                            maxRows={6}
                            fullWidth
                            slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.82rem' } } }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeBulkDeleteDialog} variant="outlined" disabled={bulkDeleteIsDeleting}>Cancel</Button>
                        <Button
                            onClick={confirmBulkDelete}
                            variant="contained"
                            color="error"
                            disabled={bulkDeleteIsDeleting || bulkDeleteDialog.symbols.length === 0}
                            startIcon={bulkDeleteIsDeleting ? <CircularProgress size={18} /> : <DeleteIcon />}
                        >
                            Delete {bulkDeleteDialog.symbols.length} monomer{bulkDeleteDialog.symbols.length > 1 ? 's' : ''}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete All confirmation */}
                <Dialog open={deleteAllDialog} onClose={closeDeleteAllDialog} maxWidth="xs" fullWidth>
                    <DialogTitle>Delete ALL public monomers</DialogTitle>
                    <DialogContent dividers>
                        <Alert severity="error" variant="outlined" sx={{ mb: 1.5 }}>
                            <strong>Danger zone</strong> — This will permanently remove every monomer from the public database. This action cannot be undone.
                        </Alert>
                        <Typography variant="body2">
                            Are you sure you want to delete all <strong>{normalized.length}</strong> monomers from the public library?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDeleteAllDialog} variant="outlined">Cancel</Button>
                        <Button
                            onClick={confirmDeleteAll}
                            variant="contained"
                            color="error"
                            disabled={isLoading || normalized.length === 0}
                            startIcon={isLoading ? <CircularProgress size={18} /> : <DeleteSweepIcon />}
                        >
                            Delete All ({normalized.length})
                        </Button>
                    </DialogActions>
                </Dialog>

                <CreatePublicMonomerDialog
                    open={createDialogOpen}
                    onClose={closeCreateDialog}
                    dbName={dbName}
                    apiDbFetch={apiDbFetch}
                    load={load}
                />
            </Paper>
        </Box>
    );
}

