import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Box,
  Paper,
  Typography,
  Divider,
  TextField,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemText,
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

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumnOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';

import { API_DB_URL } from '../../config';
import { apiFetch } from '../../utils/api';

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

const VISIBLE_COLUMNS_STORAGE_KEY = 'pp-personal-monomers-visible-columns';
const COLUMN_WIDTHS_STORAGE_KEY = 'pp-personal-monomers-column-widths';

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
    if (v == null) continue;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') continue;
    parts.push(`R${i + 1}-${s}`);
  }
  return parts.join(', ');
}

function displayValueForCell(rawValue, key) {
  if (key === 'm_Rgroups') return formatRGroups(rawValue);
  return safeToString(rawValue);
}

function sortValueForCell(rawValue, key) {
  if (rawValue == null) return '';
  if (typeof rawValue === 'number') return rawValue;
  return String(displayValueForCell(rawValue, key) || '').toLowerCase();
}

function sxForColumnHeader(key) {
  const minWidth = COLUMN_MIN_WIDTH[key] || 180;
  return { fontWeight: 600, minWidth, whiteSpace: 'nowrap' };
}

function minWidthForColumnKey(key) {
  if (key === '__img') return IMG_COL_MIN_WIDTH;
  return COLUMN_MIN_WIDTH[key] || 140;
}

function labelForKey(k) {
  return COLUMN_LABELS[k] || k;
}

function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSdfRecords(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Capture full records including the '$$$$' delimiter.
  // Important: do NOT trim, as leading newlines/spaces are part of the expected format.
  const matches = normalized.match(/[\s\S]*?\$\$\$\$\s*(?:\n|$)/g);
  if (matches && matches.length > 0) return matches;

  // Fallback: no delimiter found, treat entire content as one record.
  const only = normalized;
  if (!only) return [];
  return [only.replace(/\n*$/g, '') + '\n$$$$\n'];
}

function normalizeSdfRecordForUpload(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const idx = normalized.lastIndexOf('$$$$');
  if (idx === -1) {
    return normalized.replace(/\n*$/g, '') + '\n$$$$\n';
  }
  // Keep content up to and including the last '$$$$' and ensure it ends with a single newline.
  const upTo = normalized.slice(0, idx + 4);
  return upTo.replace(/\s*$/g, '') + '\n';
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

function normalizeMonomer(m) {
  return {
    raw: m,
    symbol: m?.symbol ?? m?.m_abbr ?? m?.id ?? m?._id ?? '',
    name: m?.m_name ?? m?.name ?? '',
    natAnalog: m?.natAnalog ?? m?.nat_analog ?? '',
    pdbName: m?.pdbName ?? m?.pdb_name ?? '',
    type: m?.m_type ?? m?.type ?? '',
    subtype: m?.m_subtype ?? m?.subtype ?? '',
    imageBase64: m?.image_binary ?? m?.image_url ?? m?.image ?? null,
  };
}

function getRGroupSlots(raw) {
  const rGroups = Array.isArray(raw?.m_Rgroups) ? raw.m_Rgroups : [];
  const rGroupIdx = Array.isArray(raw?.m_RgroupIdx) ? raw.m_RgroupIdx : [];

  const slots = [];
  const maxLen = Math.max(rGroups.length, rGroupIdx.length, 0);
  for (let i = 0; i < maxLen; i++) {
    const hasGroup = rGroups[i] != null;
    const hasIdx = rGroupIdx[i] != null;
    if (hasGroup || hasIdx) slots.push(i);
  }
  return slots;
}

function safeToString(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizePdbNameInput(value) {
  const upper = String(value || '').toUpperCase().replace(/\s+/g, '');
  return upper.slice(0, 3);
}

function normalizeNatAnalogInput(value) {
  const v = String(value ?? '').trim().toUpperCase();
  const one = v ? v[0] : '';
  if (!one) return '';
  return NATURAL_ANALOG_SET.has(one) ? one : '';
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
  if (v === 'natural' || v === 'non-natural') return v;
  return v;
}

function enforceTypeSubtypeRule(nextType, nextSubtype) {
  const type = normalizeType(nextType);
  let subtype = normalizeSubtype(nextSubtype);
  if (type === 'cap' || type === 'other') subtype = 'non-natural';
  return { type, subtype };
}

export default function PersonalMonomers() {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [monomers, setMonomers] = useState([]);

  const [imagePreview, setImagePreview] = useState({ open: false, symbol: '', imageBase64: null });

  const [editDialog, setEditDialog] = useState({ open: false, monomer: null, originalSymbol: '', rGroupSlots: [], baseRGroups: [] });
  const [editForm, setEditForm] = useState({ symbol: '', name: '', natAnalog: '', pdbName: '', type: '', subtype: '', rGroupsByIndex: {} });

  const capForbidden = (editDialog?.rGroupSlots?.length ?? 0) > 1;
  const capInvalid = capForbidden && editForm.type === 'cap';

  const [deleteDialog, setDeleteDialog] = useState({ open: false, monomer: null });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState(null); // null | 'upload-sdf' | 'scratch'
  const [createError, setCreateError] = useState('');
  const [createIsUploading, setCreateIsUploading] = useState(false);
  const [createFileName, setCreateFileName] = useState('');
  const [createRecords, setCreateRecords] = useState([]); // [{ id, text }]
  const [createSelectedRecordId, setCreateSelectedRecordId] = useState('');

  const [columnsAnchorEl, setColumnsAnchorEl] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [sortState, setSortState] = useState({ key: 'symbol', direction: 'asc' });

  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const stored = window?.localStorage?.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  const resizingRef = useRef(null);

  const getColWidth = useCallback(
    (key) => {
      const v = columnWidths?.[key];
      const n = typeof v === 'number' ? v : Number(v);
      const minW = minWidthForColumnKey(key);
      if (!Number.isFinite(n) || n <= 0) return minW;
      return Math.max(minW, n);
    },
    [columnWidths]
  );

  const beginResize = useCallback(
    (key, e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = getColWidth(key);
      resizingRef.current = { key, startX, startWidth };

      const onMove = (ev) => {
        const curr = resizingRef.current;
        if (!curr || curr.key !== key) return;
        const dx = ev.clientX - curr.startX;
        const next = Math.max(minWidthForColumnKey(key), curr.startWidth + dx);
        setColumnWidths((prev) => ({ ...(prev || {}), [key]: Math.round(next) }));
      };

      const onUp = () => {
        resizingRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getColWidth]
  );

  const resetCreateDialog = useCallback(() => {
    setCreateMode(null);
    setCreateError('');
    setCreateIsUploading(false);
    setCreateFileName('');
    setCreateRecords([]);
    setCreateSelectedRecordId('');
  }, []);

  const load = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await apiFetch(`${API_DB_URL}/monomers/personal?db_name=pepedit`, { method: 'GET' });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to load personal monomers (status ${res.status})`;
        setError(String(msg));
        setMonomers([]);
        return;
      }

      const list = json?.data || [];
      console.log('Loaded personal monomers:', list);
      setMonomers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || 'Failed to load personal monomers.');
      setMonomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    // Initialize visible columns once we know which columns exist.
    // Default: hide created/updated; never show sensitive keys.
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

  const openEdit = useCallback((m) => {
    const nm = normalizeMonomer(m);
    const fixed = enforceTypeSubtypeRule(nm.type, nm.subtype);
    const natAnalog = fixed.type === 'cap' ? 'X' : (normalizeNatAnalogInput(nm.natAnalog) || 'X');
    const slots = getRGroupSlots(m);
    const baseRGroups = Array.isArray(m?.m_Rgroups) ? m.m_Rgroups.slice() : [];
    const rGroupsByIndex = {};
    for (const i of slots) {
      rGroupsByIndex[i] = baseRGroups[i] == null ? '' : String(baseRGroups[i]);
    }
    setEditForm({
      symbol: nm.symbol,
      name: nm.name,
      natAnalog,
      pdbName: nm.pdbName,
      type: fixed.type,
      subtype: fixed.subtype,
      rGroupsByIndex,
    });
    setEditDialog({ open: true, monomer: m, originalSymbol: nm.symbol, rGroupSlots: slots, baseRGroups });
  }, []);

  const closeEdit = useCallback(() => {
    setEditDialog({ open: false, monomer: null, originalSymbol: '', rGroupSlots: [], baseRGroups: [] });
  }, []);

  const submitEdit = useCallback(async () => {
    const symbol = String(editForm.symbol || '').trim();
    if (!symbol) return;

    if ((editDialog?.rGroupSlots?.length ?? 0) > 1 && editForm.type === 'cap') {
      setError('Type “cap” is not allowed when more than one R group is defined.');
      return;
    }

    const originalSymbol = String(editDialog.originalSymbol || symbol).trim();
    const pdbName = normalizePdbNameInput(editForm.pdbName);
    if (pdbName && !/^[A-Z0-9]{1,3}$/.test(pdbName)) {
      setError('PDB name must be 1–3 characters (A–Z / 0–9), uppercase.');
      return;
    }

    const fixed = enforceTypeSubtypeRule(editForm.type, editForm.subtype);

    const natAnalog = fixed.type === 'cap' ? 'X' : normalizeNatAnalogInput(editForm.natAnalog);
    if (!natAnalog) {
      setError('Natural analog must be one of the 20 amino acids (one-letter code) or X.');
      return;
    }

    const nextRGroups = Array.isArray(editDialog.baseRGroups) ? editDialog.baseRGroups.slice() : [];
    for (const i of editDialog.rGroupSlots || []) {
      const v = String(editForm.rGroupsByIndex?.[i] ?? '').trim();
      // Only allow values for existing slots; keep it simple for now.
      if (v !== 'H' && v !== 'OH') {
        setError(`Invalid R${Number(i) + 1} group. Allowed values: H, OH.`);
        return;
      }
      nextRGroups[i] = v;
    }

    setError('');
    setIsLoading(true);
    try {
      const payload = {
        db_name: 'pepedit',
        targets: originalSymbol,
        set_fields: {
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

      const res = await apiFetch(`${API_DB_URL}/monomers/personal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to edit monomer (status ${res.status})`;
        setError(String(msg));
        return;
      }

      closeEdit();
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to edit monomer.');
    } finally {
      setIsLoading(false);
    }
  }, [closeEdit, editForm, load]);

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
      const url = `${API_DB_URL}/monomers/personal?db_name=pepedit&symbols=${encodeURIComponent(symbol)}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to delete monomer (status ${res.status})`;
        setError(String(msg));
        return;
      }

      closeDelete();
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete monomer.');
    } finally {
      setIsLoading(false);
    }
  }, [closeDelete, deleteDialog.monomer, load]);

  const openImage = useCallback((m) => {
    const nm = normalizeMonomer(m);
    setImagePreview({ open: true, symbol: nm.symbol, imageBase64: nm.imageBase64 });
  }, []);

  const closeImage = useCallback(() => {
    setImagePreview({ open: false, symbol: '', imageBase64: null });
  }, []);

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
      // Keep at least one column visible.
      return next.length > 0 ? next : prev;
    });
  }, []);

  const requestSort = useCallback((key) => {
    setSortState((s) => {
      if (s.key !== key) return { key, direction: 'asc' };
      return { key, direction: s.direction === 'asc' ? 'desc' : 'asc' };
    });
  }, []);

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
    downloadTextFile(`personal_monomers_${stamp}.sdf`, content);
  }, [normalized]);

  const closeCreateDialog = useCallback(() => {
    setCreateDialogOpen(false);
    resetCreateDialog();
  }, [resetCreateDialog]);

  const handleCreateFilePicked = useCallback(async (file) => {
    if (!file) return;
    setCreateError('');
    setCreateFileName(String(file.name || ''));

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
      const res = await apiFetch(`${API_DB_URL}/monomers/personal?db_name=pepedit`, {
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

      closeCreateDialog();
      await load();
    } catch (e) {
      setCreateError(e?.message || 'Failed to upload monomers.');
    } finally {
      setCreateIsUploading(false);
    }
  }, [closeCreateDialog, createRecords, load]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', letterSpacing: '0.5px' }}>
            MY MONOMERS
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => {
                resetCreateDialog();
                setCreateDialogOpen(true);
              }}
            >
              Create
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', pl: 1 }}>
            {sortedFiltered.length} / {normalized.length} monomers
          </Typography>
        </Box>

        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}

        <Box
          sx={{
            mt: 1,
            flex: 1,
            minHeight: 0,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
            {isLoading ? (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={26} />
              </Box>
            ) : null}

            <Table
              size="small"
              stickyHeader
              sx={{
                tableLayout: 'fixed',
                minWidth: Math.max(900, ACTIONS_COL_WIDTH + IMG_COL_WIDTH + (visibleColumns.length * 180)),
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
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
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      width: getColWidth('__img'),
                      minWidth: IMG_COL_MIN_WIDTH,
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      pr: 1.5,
                    }}
                  >
                    Image
                    <Box
                      onMouseDown={(e) => beginResize('__img', e)}
                      sx={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 8, cursor: 'col-resize', zIndex: 4 }}
                      aria-label="Resize Image column"
                    />
                  </TableCell>
                  {visibleColumns.map((k) => (
                    <TableCell
                      key={k}
                      sx={{
                        ...sxForColumnHeader(k),
                        width: getColWidth(k),
                        position: 'relative',
                        pr: 1.5,
                      }}
                      sortDirection={sortState.key === k ? sortState.direction : false}
                    >
                      <TableSortLabel
                        active={sortState.key === k}
                        direction={sortState.key === k ? sortState.direction : 'asc'}
                        onClick={() => requestSort(k)}
                      >
                        {labelForKey(k)}
                      </TableSortLabel>
                      <Box
                        onMouseDown={(e) => beginResize(k, e)}
                        sx={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 8, cursor: 'col-resize', zIndex: 4 }}
                        aria-label={`Resize ${labelForKey(k)} column`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 2}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                        No personal monomers found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map((m, idx) => (
                    <TableRow key={m?.raw?._id ?? m?.raw?.id ?? m?.symbol ?? `row-${idx}`} hover>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          backgroundColor: 'background.paper',
                          whiteSpace: 'nowrap',
                          width: ACTIONS_COL_WIDTH,
                        }}
                      >
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(m.raw)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Export SDF">
                          <IconButton size="small" onClick={() => exportMonomerSdf(m.raw)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => requestDelete(m.raw)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ width: getColWidth('__img') }}>
                        {m.imageBase64 ? (
                          <Tooltip title="View image">
                            <Box
                              component="button"
                              type="button"
                              onClick={() => openImage(m.raw)}
                              sx={{
                                p: 0,
                                m: 0,
                                border: 0,
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'inline-flex',
                              }}
                              aria-label={`View image for ${m.symbol}`}
                            >
                              <Box
                                component="img"
                                src={`data:image/png;base64,${m.imageBase64}`}
                                alt={`Structure of ${m.symbol}`}
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
                      {visibleColumns.map((k) => {
                        const rawValue = m?.raw?.[k];
                        const formatted = displayValueForCell(rawValue, k);
                        const display = formatted || '—';
                        return (
                          <TableCell key={k} sx={{ p: 1, width: getColWidth(k) }}>
                            <Tooltip title={formatted || ''} disableHoverListener={!formatted} placement="top" arrow>
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >
                                {display}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Paper>

      <Menu
        anchorEl={columnsAnchorEl}
        open={Boolean(columnsAnchorEl)}
        onClose={closeColumnsMenu}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        {tableKeys.map((k) => (
          <MenuItem key={k} onClick={() => toggleColumn(k)}>
            <Checkbox checked={visibleColumns.includes(k)} />
            <ListItemText primary={labelForKey(k)} />
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={imagePreview.open} onClose={closeImage} maxWidth="md" fullWidth>
        <DialogTitle>Structure: {imagePreview.symbol}</DialogTitle>
        <DialogContent dividers>
          {imagePreview.imageBase64 ? (
            <Box
              component="img"
              src={`data:image/png;base64,${imagePreview.imageBase64}`}
              alt={`Structure of ${imagePreview.symbol}`}
              sx={{ display: 'block', maxWidth: '100%', mx: 'auto' }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No image available.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImage}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialog.open} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit monomer</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Symbol"
              size="small"
              value={editForm.symbol}
              onChange={(e) => {
                const next = e.target.value;
                setEditForm((s) => ({ ...s, symbol: next }));
              }}
              helperText="Symbol is also used as abbreviation (m_abbr)."
            />
            <TextField
              label="Name"
              size="small"
              value={editForm.name}
              onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
            />
            <FormControl size="small" disabled={editForm.type === 'cap'}>
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
                {editForm.type === 'cap' ? 'For type “cap”, natural analog is forced to X.' : 'Use X when no natural analog exists.'}
              </Typography>
            </FormControl>
            <TextField
              label="PDB name"
              size="small"
              value={editForm.pdbName}
              onChange={(e) => setEditForm((s) => ({ ...s, pdbName: normalizePdbNameInput(e.target.value) }))}
              inputProps={{ maxLength: 3 }}
              helperText="Up to 3 characters, uppercase (e.g., ALT)."
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
                    natAnalog: fixed.type === 'cap' ? 'X' : (normalizeNatAnalogInput(s.natAnalog) || 'X'),
                  }));
                }}
              >
                <MenuItem value="aa">aa</MenuItem>
                <MenuItem value="cap" disabled={capForbidden}>cap</MenuItem>
                <MenuItem value="other">other</MenuItem>
              </Select>
            </FormControl>

            {capForbidden ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Type “cap” is disabled when more than one R group exists.
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
                <MenuItem value="natural">natural</MenuItem>
                <MenuItem value="non-natural">non-natural</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Note: for type “cap” or “other”, subtype is forced to “non-natural”.
            </Typography>

            {Array.isArray(editDialog.rGroupSlots) && editDialog.rGroupSlots.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  R groups
                </Typography>
                {editDialog.rGroupSlots.map((i) => (
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
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Only R groups that exist for this monomer are shown.
                </Typography>
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={isLoading}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained" disabled={isLoading || capInvalid}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete monomer</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Delete personal monomer “{deleteDialog.monomer?.symbol}”? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={isLoading}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isLoading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
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
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                The “create from scratch” multi-step workflow (SMILES → R groups → params) will be implemented next.
              </Typography>
              <Button variant="outlined" onClick={() => setCreateMode(null)}>
                Back
              </Button>
            </Box>
          ) : null}

          {createMode === 'upload-sdf' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Upload a pepedit-compatible SDF. After loading, you can edit each monomer record before uploading.
              </Typography>

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
                      // allow re-picking same file
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
          <Button onClick={closeCreateDialog} disabled={createIsUploading}>Close</Button>
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
    </Box>
  );
}
