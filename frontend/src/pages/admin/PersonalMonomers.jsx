import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Box,
  Paper,
  Collapse,
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

import FormWizard from 'react-form-wizard-component';
import 'react-form-wizard-component/dist/style.css';
import './styles.css'

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumnOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';

import { API_DB_URL, API_MAIL_URL, API_URL } from '../../config';
import { apiFetch } from '../../utils/api';
import { invalidateLibraryFetching } from '../../hooks/useLibraryFetching';

import { useFragments, useFormSubmission, classifyMolecule, validateSdf } from './hooks/CustomHooks';
import SdfValidationDialog from './components/SdfValidationDialog';
import SdfFormatHelp from './components/SdfFormatHelp';
import { TabStep1, TabStep2, TabStep3, TabStep4, TabStepBondsAndFragment, isFragmentAllowed } from './components/Steps';
import TabStepStereo from './components/StereoStep';

const MAX_SDF_BYTES = 2 * 1024 * 1024; // aligns with backend default MAIL_MAX_SDF_BYTES

function isValidEmail(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function parseCollisionSymbolsFromMessage(message) {
  const msg = String(message || '');
  if (!msg) return null;
  if (!msg.toLowerCase().includes('collide with public symbols')) return null;

  const symbols = [];

  // Most backends return a Python-like repr: ['A', 'B', ...]
  const singleQuoteMatches = msg.match(/'([^']+)'/g) || [];
  for (const m of singleQuoteMatches) {
    const v = m.slice(1, -1).trim();
    if (v) symbols.push(v);
  }

  // Fallback: JSON-ish list: ["A", "B"]
  if (symbols.length === 0) {
    const doubleQuoteMatches = msg.match(/"([^"]+)"/g) || [];
    for (const m of doubleQuoteMatches) {
      const v = m.slice(1, -1).trim();
      if (v) symbols.push(v);
    }
  }

  // De-dup while preserving order
  const seen = new Set();
  const uniq = [];
  for (const s of symbols) {
    if (seen.has(s)) continue;
    seen.add(s);
    uniq.push(s);
  }

  return uniq;
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
  let body;
  if (idx === -1) {
    body = normalized.replace(/\n*$/g, '') + '\n$$$$\n';
  } else {
    // Keep content up to and including the last '$$$$' and ensure it ends with a single newline.
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
  return upper.replace(/[^A-Z]/g, '').slice(0, 3);
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
  if (v === 'natural' || v === 'non-natural' || v === 'cap') return v;
  return v;
}

function enforceTypeSubtypeRule(nextType, nextSubtype) {
  const type = normalizeType(nextType);
  let subtype = normalizeSubtype(nextSubtype);
  if (type === 'cap') subtype = 'cap';
  if (type === 'other') subtype = 'non-natural';
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

  const editRGroupCount = editDialog?.rGroupSlots?.length ?? 0;
  const capRequired = editRGroupCount === 1;
  const capForbidden = editRGroupCount > 1;
  const capInvalid = (capForbidden && editForm.type === 'cap') || (capRequired && editForm.type !== 'cap');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, monomer: null });

  // Bulk delete dialog state
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({ open: false, symbols: [] });
  const [bulkDeleteIsDeleting, setBulkDeleteIsDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Selection state for bulk actions
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());

  // Submit for review dialog state
  const [submitDialog, setSubmitDialog] = useState({ open: false, symbols: [] }); // symbols to submit
  const [submitEmail, setSubmitEmail] = useState('');
  const [submitIsSubmitting, setSubmitIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Row kebab menu state
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [rowMenuMonomer, setRowMenuMonomer] = useState(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState(null); // null | 'upload-sdf' | 'scratch'
  const [createError, setCreateError] = useState('');
  const [createErrorDetailsOpen, setCreateErrorDetailsOpen] = useState(false);
  const [createIsUploading, setCreateIsUploading] = useState(false);
  const [createFileName, setCreateFileName] = useState('');
  const [createRecords, setCreateRecords] = useState([]); // [{ id, text }]
  const [createSelectedRecordId, setCreateSelectedRecordId] = useState('');

  // Scratch wizard state (mirrors UIAddMonomers strategy)
  const [scratchSmiles, setScratchSmiles] = useState('CCO');
  const [scratchSelectedBonds, setScratchSelectedBonds] = useState([]);
  const [scratchSelectedFragmentIndex, setScratchSelectedFragmentIndex] = useState(-1);
  const [scratchCurrentIndex, setScratchCurrentIndex] = useState(0);
  const [scratchFormData, setScratchFormData] = useState({});
  const [scratchStepError, setScratchStepError] = useState('');

  const wizardRef = useRef(null);
  const formRef = useRef(null);
  const stereoRef = useRef(null);
  const [stereoMolBlock, setStereoMolBlock] = useState('');
  const [scratchStereoMap, setScratchStereoMap] = useState({});
  const lastClassifiedRef = useRef({ smiles: '', data: null });

  const [validationDialog, setValidationDialog] = useState({ open: false, errors: [], warnings: [], functionalCheck: null });
  const createDialogContentRef = useRef(null);

  const [scratchFragments] = useFragments(scratchSmiles, scratchSelectedBonds);
  const [handleScratchFormSubmit, scratchMolBlock] = useFormSubmission(
    scratchFormData,
    scratchFragments,
    scratchSelectedFragmentIndex
  );

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
    setCreateErrorDetailsOpen(false);
    setCreateIsUploading(false);
    setCreateFileName('');
    setCreateRecords([]);
    setCreateSelectedRecordId('');

    // reset scratch wizard state
    setScratchSmiles('CCO');
    setScratchSelectedBonds([]);
    setScratchSelectedFragmentIndex(-1);
    setScratchCurrentIndex(0);
    setScratchFormData({});
    setStereoMolBlock('');
    setScratchStereoMap({});
    lastClassifiedRef.current = { smiles: '', data: null };
    setValidationDialog({ open: false, errors: [], warnings: [], functionalCheck: null });
  }, []);

  const closeCreateDialog = useCallback(() => {
    setCreateDialogOpen(false);
    resetCreateDialog();
  }, [resetCreateDialog]);

  const createErrorCollisions = useMemo(() => parseCollisionSymbolsFromMessage(createError), [createError]);

  useEffect(() => {
    if (!createError) {
      setCreateErrorDetailsOpen(false);
      return;
    }
    // Make sure the user sees the error even if the dialog content is scrolled.
    if (createDialogOpen && createDialogContentRef.current) {
      try {
        createDialogContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // ignore
      }
    }
  }, [createError, createDialogOpen]);

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

  const StepGuidelineWithError = useCallback(({ title, children, error }) => {
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
        {error ? (
          <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </Paper>
    );
  }, []);

  const checkSymbolExists = useCallback(async (values) => {
    const symbol = String(values?.symbol || '').trim();
    if (!symbol) return { exists: false };

    const params = new URLSearchParams();
    params.set('db_name', 'pepedit');
    params.set('symbol', symbol);

    const res = await apiFetch(`${API_DB_URL}/monomers/exists?${params.toString()}`, { method: 'GET' });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { exists: false, error: json?.message || json?.error || `Failed to validate symbol (status ${res.status})` };
    }

    // Expected shape:
    // { data: { symbol: { exists: boolean, value: string, where: [] } }, ... }
    if (typeof json?.data?.symbol?.exists === 'boolean') {
      return { exists: json.data.symbol.exists };
    }

    // Fallbacks (in case backend shape changes)
    if (typeof json?.exists === 'boolean') return { exists: json.exists };
    if (typeof json?.data?.exists === 'boolean') return { exists: json.data.exists };

    return { exists: false };
  }, []);

  // Scratch wizard side effects (same pattern as UIAddMonomers)
  useEffect(() => {
    if (createMode !== 'scratch') return;
    setScratchSelectedBonds([]);
  }, [scratchSmiles, createMode]);

  useEffect(() => {
    if (createMode !== 'scratch') return;
    setScratchFormData({});
    setScratchStepError('');
  }, [scratchSelectedFragmentIndex, createMode]);

  useEffect(() => {
    if (createMode !== 'scratch') return;
    if (Array.isArray(scratchFragments) && scratchFragments.length > 0) {
      const firstAllowed = scratchFragments.findIndex((f) => isFragmentAllowed(f, 4));
      setScratchSelectedFragmentIndex(firstAllowed >= 0 ? firstAllowed : -1);
    } else {
      setScratchSelectedFragmentIndex(-1);
    }
  }, [scratchFragments, createMode]);

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
        if (!formRef.current) return false;
        const isValid = await formRef.current.isValid();
        if (!isValid) return false;

        const values = formRef.current.getFormData ? formRef.current.getFormData() : scratchFormData;
        const existsRes = await checkSymbolExists(values);
        if (existsRes?.error) {
          setScratchStepError(String(existsRes.error));
          return false;
        }
        if (existsRes?.exists) {
          setScratchStepError('This symbol already exists. Please choose a different Symbol.');
          return false;
        }

        setScratchStepError('');
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
  }, [scratchCurrentIndex, scratchSmiles, scratchSelectedBonds, scratchSelectedFragmentIndex, scratchFragments, handleScratchFormSubmit, checkSymbolExists, scratchFormData]);

  const handleScratchNext = useCallback(async () => {
    const ok = await scratchCheckTab();
    if (wizardRef.current && ok) wizardRef.current.nextTab();
  }, [scratchCheckTab]);

  const handleScratchPrev = useCallback(() => {
    if (wizardRef.current) wizardRef.current.prevTab();
  }, []);

  const scratchTabChanged = useCallback(({ prevIndex }) => {
    // Keep local index in sync (same approach as UIAddMonomers)
    setTimeout(() => setScratchCurrentIndex(() => prevIndex), 0);
  }, []);

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

  const handleScratchComplete = useCallback(async () => {
    const mol = String(stereoMolBlock || scratchMolBlock || '');
    if (!mol.trim()) {
      setCreateError('No molblock generated. Please complete the previous steps first.');
      return;
    }

    setCreateError('');
    setCreateIsUploading(true);
    try {
      // Ensure pepedit-compatible record delimiter
      const sdfText = normalizeSdfRecordForUpload(mol);

      // --- Validate SDF before ingestion ---
      try {
        const result = await validateSdf(
          { sdf: sdfText, strict: true, functional_check: true, owner_id: null },
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

      const res = await apiFetch(`${API_DB_URL}/monomers/personal?db_name=pepedit`, {
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

      invalidateLibraryFetching('personal-monomer-added');
      closeCreateDialog();
      await load();
    } catch (e) {
      setCreateError(e?.message || 'Failed to upload monomer.');
    } finally {
      setCreateIsUploading(false);
    }
  }, [stereoMolBlock, scratchMolBlock, closeCreateDialog, load]);

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

    const rGroupCount = editDialog?.rGroupSlots?.length ?? 0;
    if (rGroupCount > 1 && editForm.type === 'cap') {
      setError('Type “cap” is not allowed when more than one R group is defined.');
      return;
    }

    if (rGroupCount === 1 && editForm.type !== 'cap') {
      setError('When exactly one R group is defined, type must be “cap”.');
      return;
    }

    const originalSymbol = String(editDialog.originalSymbol || symbol).trim();
    const pdbName = normalizePdbNameInput(editForm.pdbName);
    if (pdbName && !/^[A-Z]{1,3}$/.test(pdbName)) {
      setError('PDB name must be 1–3 uppercase letters (A–Z).');
      return;
    }

    const fixed = enforceTypeSubtypeRule(editForm.type, editForm.subtype);

    const natAnalog = normalizeNatAnalogInput(editForm.natAnalog);
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

      invalidateLibraryFetching('personal-monomer-edited');
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
      const res = await apiFetch(`${API_DB_URL}/monomers/personal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_name: 'pepedit', symbols: [symbol] }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to delete monomer (status ${res.status})`;
        setError(String(msg));
        return;
      }

      invalidateLibraryFetching('personal-monomer-deleted');
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

  // Selection handlers
  const toggleSelectMonomer = useCallback((symbol) => {
    setSelectedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allSymbols = sortedFiltered.map((m) => m.symbol).filter(Boolean);
    setSelectedSymbols((prev) => {
      const allSelected = allSymbols.length > 0 && allSymbols.every((s) => prev.has(s));
      if (allSelected) {
        // Deselect all visible
        const next = new Set(prev);
        for (const s of allSymbols) next.delete(s);
        return next;
      } else {
        // Select all visible
        const next = new Set(prev);
        for (const s of allSymbols) next.add(s);
        return next;
      }
    });
  }, [sortedFiltered]);

  const selectionCount = selectedSymbols.size;
  const allVisibleSelected = useMemo(() => {
    const visibleSymbols = sortedFiltered.map((m) => m.symbol).filter(Boolean);
    return visibleSymbols.length > 0 && visibleSymbols.every((s) => selectedSymbols.has(s));
  }, [sortedFiltered, selectedSymbols]);

  const openBulkDeleteDialog = useCallback(() => {
    const symbols = Array.from(selectedSymbols || []).filter(Boolean);
    if (symbols.length === 0) return;
    setBulkDeleteError('');
    setBulkDeleteDialog({ open: true, symbols });
  }, [selectedSymbols]);

  const closeBulkDeleteDialog = useCallback(() => {
    setBulkDeleteDialog({ open: false, symbols: [] });
    setBulkDeleteError('');
    setBulkDeleteIsDeleting(false);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    const symbols = (bulkDeleteDialog.symbols || []).map((s) => String(s || '').trim()).filter(Boolean);
    if (symbols.length === 0) return;

    setBulkDeleteError('');
    setBulkDeleteIsDeleting(true);
    setError('');

    const deleteOne = async (symbol) => {
      const res = await apiFetch(`${API_DB_URL}/monomers/personal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_name: 'pepedit', symbols: [symbol] }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Failed to delete ${symbol} (status ${res.status})`;
        throw new Error(String(msg));
      }
      return true;
    };

    try {
      // Prefer one request for all symbols if backend supports it.
      const res = await apiFetch(`${API_DB_URL}/monomers/personal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_name: 'pepedit', symbols }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        // Fallback: delete individually (covers backends that don't accept comma-separated lists)
        if (symbols.length > 1) {
          const failed = [];
          for (const s of symbols) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await deleteOne(s);
            } catch {
              failed.push(s);
            }
          }

          if (failed.length > 0) {
            throw new Error(`Failed to delete: ${failed.join(', ')}`);
          }
        } else {
          const msg = json?.message || json?.error || `Failed to delete monomer (status ${res.status})`;
          throw new Error(String(msg));
        }
      }

      invalidateLibraryFetching('personal-monomers-deleted');
      setSelectedSymbols(new Set());
      closeBulkDeleteDialog();
      await load();
    } catch (e) {
      setBulkDeleteError(e?.message || 'Failed to delete selected monomers.');
    } finally {
      setBulkDeleteIsDeleting(false);
    }
  }, [bulkDeleteDialog.symbols, closeBulkDeleteDialog, load]);

  // Row menu handlers
  const openRowMenu = useCallback((event, m) => {
    event.stopPropagation();
    setRowMenuAnchor(event.currentTarget);
    setRowMenuMonomer(m);
  }, []);

  const closeRowMenu = useCallback(() => {
    setRowMenuAnchor(null);
    setRowMenuMonomer(null);
  }, []);

  // Submit for review dialog handlers
  const openSubmitDialog = useCallback((symbols) => {
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    setSubmitDialog({ open: true, symbols: symbolList });
    setSubmitEmail('');
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const closeSubmitDialog = useCallback(() => {
    setSubmitDialog({ open: false, symbols: [] });
    setSubmitEmail('');
    setSubmitError('');
    setSubmitSuccess('');
  }, []);

  const handleSubmitForReview = useCallback(async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (!isValidEmail(submitEmail)) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    const symbols = submitDialog.symbols || [];
    if (symbols.length === 0) {
      setSubmitError('No monomers selected.');
      return;
    }

    // Gather SDF data for selected monomers
    const selectedMonomers = (normalized || [])
      .filter((m) => symbols.includes(m.symbol))
      .map((m) => m.raw)
      .filter(Boolean);

    const sdfs = selectedMonomers
      .map((m) => (m?.sdf && String(m.sdf).trim() ? String(m.sdf) : ''))
      .filter(Boolean);

    if (sdfs.length === 0) {
      setSubmitError('No SDF data available for the selected monomers.');
      return;
    }

    const sdfContent = sdfs.join('');
    if (sdfContent.length > MAX_SDF_BYTES) {
      setSubmitError(`Combined SDF is too large. Please keep submissions under ${Math.round(MAX_SDF_BYTES / (1024 * 1024))} MB.`);
      return;
    }

    setSubmitIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('from_email', String(submitEmail).trim());
      form.append('attach_sdf', 'true');
      const blob = new Blob([sdfContent], { type: 'chemical/x-mdl-sdfile' });
      const filename = symbols.length === 1 ? `${symbols[0]}.sdf` : `monomers_${symbols.length}.sdf`;
      form.append('sdf_file', blob, filename);

      const res = await apiFetch(`${API_MAIL_URL}/monomers/submit`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Submission failed (status ${res.status})`;
        throw new Error(String(msg));
      }

      setSubmitSuccess('Thanks! Your request has been sent to the maintainers for review.');
      // Clear selection after successful submission
      setSelectedSymbols(new Set());
    } catch (e) {
      setSubmitError(e?.message || 'Failed to submit request.');
    } finally {
      setSubmitIsSubmitting(false);
    }
  }, [submitEmail, submitDialog.symbols, normalized]);

  const handleRowMenuSubmit = useCallback(() => {
    if (rowMenuMonomer) {
      const symbol = rowMenuMonomer.symbol || rowMenuMonomer.raw?.symbol;
      if (symbol) {
        openSubmitDialog([symbol]);
      }
    }
    closeRowMenu();
  }, [rowMenuMonomer, openSubmitDialog, closeRowMenu]);

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

      invalidateLibraryFetching('personal-monomers-uploaded');
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
          {/* Selection indicator + submit action */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

            <Tooltip title={selectionCount === 0 ? 'Select monomers first' : `Submit ${selectionCount} monomer${selectionCount > 1 ? 's' : ''} for review`}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SendIcon fontSize="small" />}
                  onClick={() => openSubmitDialog(Array.from(selectedSymbols))}
                  disabled={selectionCount === 0}
                >
                  Submit for Review
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
                  disabled={selectionCount === 0}
                >
                  Delete
                </Button>
              </span>
            </Tooltip>

            {selectionCount > 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {selectionCount} selected
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                {/* Select monomers to submit */}
              </Typography>
            )}
          </Box>

          {/* Right-side actions */}
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

            <Tooltip title="Import monomers from an SDF file">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileIcon fontSize="small" />}
                  onClick={() => {
                    resetCreateDialog();
                    setCreateMode('upload-sdf');
                    setCreateDialogOpen(true);
                  }}
                  disabled={isLoading}
                >
                  Import SDF
                </Button>
              </span>
            </Tooltip>

            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              onClick={() => {
                resetCreateDialog();
                setCreateMode('scratch');
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
                minWidth: Math.max(900, 48 + ACTIONS_COL_WIDTH + IMG_COL_WIDTH + (visibleColumns.length * 180)),
              }}
            >
              <TableHead>
                <TableRow>
                  {/* Checkbox column */}
                  <TableCell
                    padding="checkbox"
                    sx={{
                      width: 48,
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected && sortedFiltered.length > 0}
                      indeterminate={selectionCount > 0 && !allVisibleSelected}
                      onChange={toggleSelectAll}
                      disabled={sortedFiltered.length === 0}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      width: ACTIONS_COL_WIDTH,
                      position: 'sticky',
                      left: 48,
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
                    <TableCell colSpan={visibleColumns.length + 3}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                        No personal monomers found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map((m, idx) => (
                    <TableRow
                      key={m?.raw?._id ?? m?.raw?.id ?? m?.symbol ?? `row-${idx}`}
                      hover
                      selected={selectedSymbols.has(m.symbol)}
                    >
                      {/* Checkbox cell */}
                      <TableCell
                        padding="checkbox"
                        sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          backgroundColor: 'background.paper',
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={selectedSymbols.has(m.symbol)}
                          onChange={() => toggleSelectMonomer(m.symbol)}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 48,
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
                        <Tooltip title="More actions">
                          <IconButton size="small" onClick={(e) => openRowMenu(e, m)}>
                            <MoreVertIcon fontSize="small" />
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

      {/* Row kebab menu */}
      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={closeRowMenu}
      >
        <MenuItem onClick={handleRowMenuSubmit}>
          <ListItemText primary="Submit for Review…" />
        </MenuItem>
      </Menu>

      {/* Submit for review dialog */}
      <Dialog open={submitDialog.open} onClose={closeSubmitDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Submit monomers for review</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {submitSuccess ? <Alert severity="success">{submitSuccess}</Alert> : null}

            {!submitSuccess && (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Submit {submitDialog.symbols?.length || 0} monomer{(submitDialog.symbols?.length || 0) !== 1 ? 's' : ''} to the public library for review.
                  The maintainers will review your submission before publishing.
                </Typography>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Monomers to submit
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {(submitDialog.symbols || []).join(', ') || '—'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Your email address
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    We use your email only to reply to your submission. It is not stored.
                  </Typography>
                  <TextField
                    value={submitEmail}
                    onChange={(e) => {
                      setSubmitError('');
                      setSubmitEmail(e.target.value);
                    }}
                    placeholder="name@domain.org"
                    size="small"
                    fullWidth
                    disabled={submitIsSubmitting}
                    error={Boolean(submitEmail) && !isValidEmail(submitEmail)}
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSubmitDialog} disabled={submitIsSubmitting}>
            {submitSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!submitSuccess && (
            <Button
              variant="contained"
              onClick={handleSubmitForReview}
              disabled={!isValidEmail(submitEmail) || submitIsSubmitting || (submitDialog.symbols?.length || 0) === 0}
              startIcon={submitIsSubmitting ? <CircularProgress size={18} /> : <SendIcon />}
            >
              Submit request
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
              size="small"
              value={editForm.pdbName}
              onChange={(e) => setEditForm((s) => ({ ...s, pdbName: normalizePdbNameInput(e.target.value) }))}
              inputProps={{ maxLength: 3 }}
              placeholder="ALA"
              helperText="Up to 3 letters, uppercase (e.g., ALA)."
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

      <Dialog open={bulkDeleteDialog.open} onClose={closeBulkDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Delete selected monomers</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {bulkDeleteError ? <Alert severity="error">{bulkDeleteError}</Alert> : null}

            <Typography variant="body2">
              Delete {bulkDeleteDialog.symbols?.length || 0} personal monomer{(bulkDeleteDialog.symbols?.length || 0) !== 1 ? 's' : ''}? This cannot be undone.
            </Typography>

            {bulkDeleteDialog.symbols?.length ? (
              <TextField
                label="Monomers to delete"
                value={(bulkDeleteDialog.symbols || []).join(', ')}
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                size="small"
                slotProps={{ input: { readOnly: true } }}
              />
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkDeleteDialog} disabled={bulkDeleteIsDeleting}>
            Cancel
          </Button>
          <Button
            onClick={confirmBulkDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleteIsDeleting || (bulkDeleteDialog.symbols?.length || 0) === 0}
            startIcon={bulkDeleteIsDeleting ? <CircularProgress size={18} /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={closeCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {createMode === 'upload-sdf' ? 'Import monomers (SDF)' : 'Create monomer'}
        </DialogTitle>
        <DialogContent dividers ref={createDialogContentRef}>
          {createError ? (
            <Box sx={{ mb: 1 }}>
              <Alert
                severity="error"
                variant="outlined"
                action={
                  createErrorCollisions && createErrorCollisions.length > 0 ? (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => setCreateErrorDetailsOpen((v) => !v)}
                    >
                      {createErrorDetailsOpen ? 'Hide details' : 'Show details'}
                    </Button>
                  ) : null
                }
              >
                {createErrorCollisions && createErrorCollisions.length > 0 ? (
                  <Typography variant="body2">
                    Some monomer symbols already exist in the public library. Please rename the conflicting symbols and try again.
                  </Typography>
                ) : (
                  <Typography variant="body2">{createError}</Typography>
                )}

                {createErrorCollisions && createErrorCollisions.length > 0 ? (
                  <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
                    Conflicts: {createErrorCollisions.slice(0, 12).join(', ')}
                    {createErrorCollisions.length > 12 ? ` … (+${createErrorCollisions.length - 12} more)` : ''}
                  </Typography>
                ) : null}
              </Alert>

              {createErrorCollisions && createErrorCollisions.length > 0 ? (
                <Collapse in={createErrorDetailsOpen}>
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      label="Conflicting symbols"
                      value={createErrorCollisions.join('\n')}
                      multiline
                      minRows={6}
                      maxRows={12}
                      fullWidth
                      size="small"
                      slotProps={{ input: { readOnly: true } }}
                    />
                  </Box>
                </Collapse>
              ) : null}
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
                      ref={formRef}
                      fragmentSmiles={scratchFragments?.[scratchSelectedFragmentIndex]}
                      initialData={scratchFormData}
                      onFormDataChange={handleScratchFormDataChange}
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
                      directly below before clicking “Complete” to upload this monomer into your personal library.
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
                      // allow re-picking same file
                      e.target.value = '';
                    }}
                  />
                </Button>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {createFileName ? createFileName : 'No file selected'}
                </Typography>
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

      <SdfValidationDialog
        open={validationDialog.open}
        onClose={() => setValidationDialog((prev) => ({ ...prev, open: false }))}
        errors={validationDialog.errors}
        warnings={validationDialog.warnings}
        functionalCheck={validationDialog.functionalCheck}
      />
    </Box>
  );
}
