import { hoveredMonomerStore, useHoveredMonomer } from '../../state/hoveredMonomerStore';
import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';

import BilnEditorInterface from './BilnEditorInterface';
import { Viewer2D } from './Viewer2D/Viewer2D';
import { Viewer3D } from './Viewer3D/Viewer3D';
import { MolstarSchemes } from './Viewer3D/molstar/Schemes';
import { ReplaceOverlay } from './ReplaceOverlay';
import { ScaffoldWarningsDialog } from './ScaffoldWarningsDialog';

import { useFetchDepiction } from '../../../src/hooks/useFetchDepiction';
import { useGenerate3D } from '../../../src/hooks/useGenerate3D';
import { useBilnHandlers } from '../../../src/hooks/useBilnHandlers';
import { useUIHandlers } from '../../../src/hooks/useUIHandlers';
import { useScaffoldTemplate } from '../../../src/hooks/useScaffoldTemplate';
import { useScaffoldMappings } from '../../../src/hooks/useScaffoldMappings';
import { usePersistDesign, useInitialDesignState } from '../../../src/hooks/usePersistDesign';
import { useSplitLayout } from '../../../src/hooks/useSplitLayout';
import { useBilnHistory } from '../../../src/hooks/useBilnHistory';

import {
    buildLinkMapFromBiln,
    setMonomerSequences,
    deriveSeqCount,
    reconcileActiveSeqIdx,
    analyzeBiln,
    getSequences,
} from '../../../src/utils/bilnUtils';

import { Box, Paper, Typography, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Backdrop } from '@mui/material';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Slider from '@mui/material/Slider';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LabelIcon from '@mui/icons-material/Label';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SubjectIcon from '@mui/icons-material/Subject';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import LayersIcon from '@mui/icons-material/Layers';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import { CONFORMER_JOB_RESUME_EVENT } from '../output/ConformerJobsPanel';
import { clearConformerJobIdFromStorage, setConformerJobIdInStorage } from '../../../src/utils/conformerJobStorage';
import { useSessionId } from '../../../src/hooks/useSessionId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const initBiln = 'P-E-P-T-C(1,3)-I-D-E.A-G-V-I-C(1,3)';  //  A-C-K-A-C
const MAX_MONOMERS = 40;
const MOLSTAR_BG_STORAGE_KEY = 'pp-editor:molstar-background:v1';
const MOLSTAR_REP_STORAGE_KEY = 'pp-editor:molstar-representations:v1';
const MOLSTAR_REP_OPACITY_STORAGE_KEY = 'pp-editor:molstar-representation-opacity:v1';
const MOLSTAR_COLOR_BY_STORAGE_KEY = 'pp-editor:molstar-color-by:v1';
const MOLSTAR_LABELS_STORAGE_KEY = 'pp-editor:molstar-labels:v1';

const MOLSTAR_TEMPLATE_OVERLAY_STORAGE_KEY = 'pp-editor:molstar-template-overlay:v1';
const MOLSTAR_TEMPLATE_OPACITY_STORAGE_KEY = 'pp-editor:molstar-template-opacity:v1';
const AUTO_SYNC_3D_STORAGE_KEY = 'pp-editor:auto-sync-3d:v1';
const ACTIVE_3D_PANEL_STORAGE_KEY = 'pp-editor:active-3d-panel:v1';
const CONSTRAINT_MODE_STORAGE_KEY = 'pp-editor:constraints-mode:v1';
const MOLSTAR_RIGHT_PANEL_WIDTH_STORAGE_KEY = 'pp-editor:molstar-right-panel-width:v1';
const PH_VALUE_STORAGE_KEY = 'pp-editor:ph-value:v1';

const DEFAULT_3D_REPRESENTATION = 'line';

const DEFAULT_PH_VALUE = 7.4;
const MIN_PH_VALUE = 0.0;
const MAX_PH_VALUE = 12.0;

function normalizePhValue(value) {
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(n)) return DEFAULT_PH_VALUE;
    const clamped = Math.min(MAX_PH_VALUE, Math.max(MIN_PH_VALUE, n));
    // Keep storage/UI stable with the slider step (0.1)
    return Math.round(clamped * 10) / 10;
}


const PeptideEditorMainInner = ({ isActive, onOutputChange, uiState, setUiState, onBeginReplaceSelection, onCancelReplaceSelection }, ref) => {

    const { data: depictionData, error: depictionError, loading: depictionLoading, fetchDepiction, setData: setDepictionData } = useFetchDepiction();
    const {
        result: structureOutput,
        error: generate3DError,
        loading: structureLoading,
        generate3D,
        setResult: setStructureOutput,
        jobState: conformerJobState,
        progressMessage: conformerProgressMessage,
        mappingMessage: conformerMappingMessage,
        progressLog: conformerProgressLog,
        errorType: conformerErrorType,
        cancelJob: cancelConformerJob,
        isCanceling: isCancelingConformerJob,
    } = useGenerate3D(API_BASE_URL);

    const sessionId = useSessionId();

    const [active3DPanel, setActive3DPanel] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(ACTIVE_3D_PANEL_STORAGE_KEY);
            const v = raw == null ? '' : String(raw).trim();
            return v ? v : null;
        } catch {
            return null;
        }
    });

    const [constraintMode, setConstraintMode] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(CONSTRAINT_MODE_STORAGE_KEY);
            const v = raw == null ? '' : String(raw).trim().toLowerCase();
            if (v === 'template') return 'template';
            if (v === 'ss') return 'ss';
            if (v === 'none') return 'none';
            return 'ss';
        } catch {
            return 'ss';
        }
    });

    const theme = useTheme();

    // Resizable right-side panel width inside the 3D viewer (shown when active3DPanel is open)
    const [molstarRightPanelWidth, setMolstarRightPanelWidth] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_RIGHT_PANEL_WIDTH_STORAGE_KEY);
            const v = raw == null ? NaN : Number(raw);
            return Number.isFinite(v) ? v : 220;
        } catch {
            return 220;
        }
    });
    const molstarRightPanelWidthRef = useRef(molstarRightPanelWidth);
    useEffect(() => {
        molstarRightPanelWidthRef.current = molstarRightPanelWidth;
    }, [molstarRightPanelWidth]);
    const molstarRightPanelDraggingRef = useRef(false);
    const molstarRightPanelRowRef = useRef(null);
    const molstarRightPanelRafRef = useRef(null);

    const startDragMolstarRightPanel = useCallback((e) => {
        if (!active3DPanel) return;
        e.preventDefault();
        e.stopPropagation();
        molstarRightPanelDraggingRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const onMove = (ev) => {
            if (!molstarRightPanelDraggingRef.current) return;
            const host = molstarRightPanelRowRef.current;
            if (!host) return;
            const rect = host.getBoundingClientRect();
            const totalW = rect?.width;
            if (!Number.isFinite(totalW) || totalW <= 0) return;

            // Panel is on the right; width is distance from mouse to right edge.
            const desired = rect.right - ev.clientX;
            const minW = 180;
            // Keep some space for the Mol* canvas so it can't collapse.
            const maxW = Math.max(minW, totalW - 240);
            const clamped = Math.min(Math.max(desired, minW), maxW);
            setMolstarRightPanelWidth(clamped);

            if (molstarRightPanelRafRef.current == null) {
                molstarRightPanelRafRef.current = requestAnimationFrame(() => {
                    molstarRightPanelRafRef.current = null;
                    try { viewer3DRef.current?.resize?.(); } catch { }
                });
            }
        };

        const stop = () => {
            if (!molstarRightPanelDraggingRef.current) return;
            molstarRightPanelDraggingRef.current = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', stop);
            window.removeEventListener('blur', stop);
            if (molstarRightPanelRafRef.current != null) {
                cancelAnimationFrame(molstarRightPanelRafRef.current);
                molstarRightPanelRafRef.current = null;
            }
            try {
                window?.localStorage?.setItem(MOLSTAR_RIGHT_PANEL_WIDTH_STORAGE_KEY, String(molstarRightPanelWidthRef.current));
            } catch {
                // ignore
            }
            try { viewer3DRef.current?.resize?.(); } catch { }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', stop);
        window.addEventListener('blur', stop);
    }, [active3DPanel]);

    // Keep Mol* canvas in sync when the panel width changes.
    useEffect(() => {
        if (!active3DPanel) return;
        const raf = requestAnimationFrame(() => {
            try { viewer3DRef.current?.resize?.(); } catch { }
        });
        return () => cancelAnimationFrame(raf);
    }, [active3DPanel, molstarRightPanelWidth]);

    const conformerProgressLines = useMemo(() => {
        if (!structureLoading) return [];

        // Hide noisy terminal message like "Done".
        const pm = conformerProgressMessage ? String(conformerProgressMessage) : '';
        const mm = conformerMappingMessage ? String(conformerMappingMessage) : '';
        const isDone = pm.trim().toLowerCase() === 'done';

        // Show only the "current" line to avoid stale cached embedding messages
        // appearing out-of-order next to other stages (e.g., protonation).
        if (pm && !isDone) return [pm];
        if (mm) return [mm];
        return [];
    }, [structureLoading, conformerProgressMessage, conformerMappingMessage]);

    const [enabled3DRepresentations, setEnabled3DRepresentations] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_REP_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const arr = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : null;
            return (arr && arr.length > 0) ? arr : [DEFAULT_3D_REPRESENTATION];
        } catch {
            return [DEFAULT_3D_REPRESENTATION];
        }
    });
    const [molstarColorBy, setMolstarColorBy] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_COLOR_BY_STORAGE_KEY);
            const v = raw == null ? '' : String(raw).trim();
            return v || 'element-symbol';
        } catch {
            return 'element-symbol';
        }
    });
    const [labelsEnabled, setLabelsEnabled] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_LABELS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const obj = (parsed && typeof parsed === 'object') ? parsed : {};
            return {
                element: !!obj.element,
                residue: !!obj.residue,
                chain: !!obj.chain,
            };
        } catch {
            return { element: false, residue: false, chain: false };
        }
    });
    const [repOpacityPctById, setRepOpacityPctById] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_REP_OPACITY_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch {
            return {};
        }
    });

    const [molstarBackground, setMolstarBackground] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_BG_STORAGE_KEY);
            const v = String(raw || '').trim().toLowerCase();
            return v === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    });

    // null => auto (follow anyScaffoldEnabled). boolean => user override.
    const [templateOverlayEnabledRaw, setTemplateOverlayEnabledRaw] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_TEMPLATE_OVERLAY_STORAGE_KEY);
            if (raw == null) return null;
            const v = String(raw).trim().toLowerCase();
            if (v === 'true') return true;
            if (v === 'false') return false;
            return null;
        } catch {
            return null;
        }
    });

    const [templateOverlayOpacityPct, setTemplateOverlayOpacityPct] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(MOLSTAR_TEMPLATE_OPACITY_STORAGE_KEY);
            const n = Number(raw);
            if (!Number.isFinite(n)) return 25;
            return Math.min(60, Math.max(5, Math.round(n)));
        } catch {
            return 25;
        }
    });

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_BG_STORAGE_KEY, String(molstarBackground));
        } catch {
            // ignore
        }
    }, [molstarBackground]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_REP_STORAGE_KEY, JSON.stringify(enabled3DRepresentations || []));
        } catch {
            // ignore
        }
    }, [enabled3DRepresentations]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_REP_OPACITY_STORAGE_KEY, JSON.stringify(repOpacityPctById || {}));
        } catch {
            // ignore
        }
    }, [repOpacityPctById]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_COLOR_BY_STORAGE_KEY, String(molstarColorBy || ''));
        } catch {
            // ignore
        }
    }, [molstarColorBy]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_LABELS_STORAGE_KEY, JSON.stringify(labelsEnabled || {}));
        } catch {
            // ignore
        }
    }, [labelsEnabled]);

    useEffect(() => {
        try {
            if (templateOverlayEnabledRaw == null) {
                window?.localStorage?.removeItem?.(MOLSTAR_TEMPLATE_OVERLAY_STORAGE_KEY);
            } else {
                window?.localStorage?.setItem(MOLSTAR_TEMPLATE_OVERLAY_STORAGE_KEY, String(!!templateOverlayEnabledRaw));
            }
        } catch {
            // ignore
        }
    }, [templateOverlayEnabledRaw]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(MOLSTAR_TEMPLATE_OPACITY_STORAGE_KEY, String(templateOverlayOpacityPct));
        } catch {
            // ignore
        }
    }, [templateOverlayOpacityPct]);

    useEffect(() => {
        try {
            if (active3DPanel) window?.localStorage?.setItem(ACTIVE_3D_PANEL_STORAGE_KEY, String(active3DPanel));
            else window?.localStorage?.removeItem?.(ACTIVE_3D_PANEL_STORAGE_KEY);
        } catch {
            // ignore
        }
    }, [active3DPanel]);

    useEffect(() => {
        try {
            window?.localStorage?.setItem(CONSTRAINT_MODE_STORAGE_KEY, String(constraintMode));
        } catch {
            // ignore
        }
    }, [constraintMode]);

    const { initialBiln, initialConstraints } = useInitialDesignState({ fallbackBiln: initBiln });
    const {
        value: bilnValue,
        setValue: setBilnValue,
        canUndo,
        canRedo,
        undo: handleUndoBiln,
        redo: handleRedoBiln,
    } = useBilnHistory(initialBiln, 20);
    const [committedBiln, setCommittedBiln] = useState(initialBiln);

    // UI-only placeholder chains appended after BILN-derived chains.
    // These do not affect BILN until a monomer is dropped into them.
    const [extraEmptyChains, setExtraEmptyChains] = useState(0);

    const [phValue, setPhValue] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(PH_VALUE_STORAGE_KEY);
            return normalizePhValue(raw);
        } catch {
            return DEFAULT_PH_VALUE;
        }
    });
    useEffect(() => {
        try {
            window?.localStorage?.setItem(PH_VALUE_STORAGE_KEY, String(normalizePhValue(phValue)));
        } catch {
            // ignore
        }
    }, [phValue]);
    const [constraintsBySeq, setConstraintsBySeq] = useState(() => initialConstraints);

    const EMPTY_ARRAY = Object.freeze([]);
    const { svg: svgDepiction = '', smiles = '', helm = '', sdf = '', monomers = EMPTY_ARRAY } = depictionData ?? {};
    const structurePDB = structureOutput?.pdb || structureOutput?.PDB || '';

    const hasEverHadStructureRef = useRef(false);
    useEffect(() => {
        if (String(structurePDB || '').trim()) {
            hasEverHadStructureRef.current = true;
        }
    }, [structurePDB]);

    const isConformerQueuedOrRunning = conformerJobState === 'queued' || conformerJobState === 'running';
    const isConformerTerminalFailedOrCanceled = conformerJobState === 'failed' || conformerJobState === 'canceled';

    const suppressNextAutoConformerGenRef = useRef(false);
    const suppressAutoConformerForBilnRef = useRef(null);
    const suppressAutoConformerAfterResumeRef = useRef(false);

    const normalizeBilnForGen = useCallback((value) => {
        return (value || '')
            .toString()
            .trim()
            .replace(/^[.\-]+|[.\-]+$/g, '')
            .replace(/\.+/g, '.')
            .replace(/\-+/g, '-');
    }, []);

    useEffect(() => {
        const onResume = (e) => {
            const jobId = String(e?.detail?.jobId || '').trim();
            const biln = String(e?.detail?.biln || '').trim();
            const pdb = String(e?.detail?.pdb || '').trim();
            if (!biln) return;
            suppressNextAutoConformerGenRef.current = true;
            suppressAutoConformerForBilnRef.current = normalizeBilnForGen(biln);
            suppressAutoConformerAfterResumeRef.current = true;
            setBilnValue(biln);

            // If the job list already has the result, load it immediately (no compute, no polling needed).
            if (pdb) {
                // Include jobId so `useGenerate3D` can treat this as the same job and
                // avoid clobbering the PDB if the subsequent status payload omits large fields.
                setStructureOutput({ pdb, PDB: pdb, jobId: jobId || null });
            } else {
                // Avoid showing stale structure while we refresh/poll the job.
                setStructureOutput({ pdb: '' });
            }

            // Ensure the conformer-job hook re-polls even when the resumed job id
            // matches the current persisted one (storage no-op updates are ignored).
            if (jobId) {
                clearConformerJobIdFromStorage({ dbName: 'pepedit', sessionId: sessionId ?? null, baseUrlOverride: API_BASE_URL });
                setConformerJobIdInStorage(jobId, { dbName: 'pepedit', sessionId: sessionId ?? null, baseUrlOverride: API_BASE_URL });
            }
        };
        window.addEventListener(CONFORMER_JOB_RESUME_EVENT, onResume);
        return () => window.removeEventListener(CONFORMER_JOB_RESUME_EVENT, onResume);
    }, [setBilnValue, normalizeBilnForGen, sessionId, setStructureOutput]);

    // Viewer refs and states
    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false, linkSelectionCount: 0 });
    const viewer3DRef = useRef(null);

    // Allow escaping the “focus 2D only” mode when linking/unlinking.
    useEffect(() => {
        const focus2DActive = !!viewer2DModes.linkMode || !!viewer2DModes.bondsMode;
        if (!focus2DActive) return;
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            viewer2DRef.current?.setLinkMode?.(false);
            viewer2DRef.current?.setBondsMode?.(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewer2DModes.linkMode, viewer2DModes.bondsMode]);

    // Ensure the representation menu initial state matches the viewer.
    // (Useful after changing DEFAULT_3D_REPRESENTATION, and avoids HMR stale state.)
    useEffect(() => {
        if (!Array.isArray(enabled3DRepresentations) || enabled3DRepresentations.length === 0) {
            setEnabled3DRepresentations([DEFAULT_3D_REPRESENTATION]);
            viewer3DRef.current?.setRepresentation?.(DEFAULT_3D_REPRESENTATION);
        }
    }, []);

    useEffect(() => {
        const v = viewer3DRef.current;
        if (!v) return;
        const enabled = new Set((enabled3DRepresentations || []).map(String));
        for (const rep of MolstarSchemes.representationSchemes) {
            try { v.setRepresentationEnabled?.(rep.id, enabled.has(rep.id)); } catch { }
        }
        for (const rep of MolstarSchemes.representationSchemes) {
            const pct = Number(repOpacityPctById?.[rep.id]);
            if (!Number.isFinite(pct)) continue;
            try { v.setRepresentationAlphaFor?.(rep.id, Math.min(1, Math.max(0, pct / 100))); } catch { }
        }
    }, [enabled3DRepresentations, repOpacityPctById]);

    useEffect(() => {
        const v = viewer3DRef.current;
        if (!v) return;
        try { v.setColorScheme?.(molstarColorBy); } catch { }
    }, [molstarColorBy]);

    useEffect(() => {
        const v = viewer3DRef.current;
        if (!v) return;
        for (const key of ['element', 'residue', 'chain']) {
            try { v.setLabelEnabled?.(key, !!labelsEnabled?.[key]); } catch { }
        }
    }, [labelsEnabled]);

    const viewer2DColRef = useRef(null);

    const was3DPanelOpenRef = useRef(false);
    const splitRatioBefore3DPanelRef = useRef(null);

    const canLink = !!svgDepiction && !viewer2DModes.bondsMode;
    const canCut = !!svgDepiction && !viewer2DModes.linkMode && viewer2DModes?.canCut !== false;

    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const linkMap = useMemo(() => buildLinkMapFromBiln(bilnValue), [bilnValue]);
    const rowMonomerLists = useMemo(() => setMonomerSequences(committedBiln, monomers), [monomers]);

    const activeSeqIdx = uiState?.activeSeqIdx ?? 0;

    const seqLabel = useCallback((idx) => {
        const n = Number(idx);
        if (!Number.isFinite(n) || n < 0) return '';
        // Excel-like: 0->A, 25->Z, 26->AA, ...
        let x = Math.floor(n);
        let out = '';
        while (x >= 0) {
            out = String.fromCharCode(65 + (x % 26)) + out;
            x = Math.floor(x / 26) - 1;
        }
        return out;
    }, []);

    // (Template panel no longer selects a single chain; mappings are edited for all chains.)

    const [limitDialog, setLimitDialog] = useState({ open: false, message: '' });
    const { tokenCount: currentTokenCount } = useMemo(
        () => analyzeBiln(bilnValue || ''),
        [bilnValue],
    );
    const isAtMonomerLimit = currentTokenCount >= MAX_MONOMERS;

    const openLimitDialog = useCallback((tokenCount) => {
        setLimitDialog({
            open: true,
            message:
                `Maximum sequence length reached (${Math.min(tokenCount, MAX_MONOMERS)}/${MAX_MONOMERS}). ` +
                `Remove one or more monomers before adding new ones.`,
        });
    }, []);

    const trySetBilnValue = useCallback(
        (nextBilnOrUpdater) => {
            // Support both:
            //  - setBilnValue("A-G")
            //  - setBilnValue(prev => prev + "-A")  (used by drag/drop handlers)
            const nextBiln =
                typeof nextBilnOrUpdater === 'function'
                    ? nextBilnOrUpdater(bilnValue)
                    : nextBilnOrUpdater;

            if (typeof nextBiln !== 'string') {
                console.warn('trySetBilnValue: expected string BILN but got:', nextBiln);
                return false;
            }

            // Any user-driven change (typing, drag/drop, add/remove monomer, etc.) re-enables auto-sync generation.
            suppressAutoConformerAfterResumeRef.current = false;

            const { tokenCount } = analyzeBiln(nextBiln);
            if (tokenCount > MAX_MONOMERS) {
                openLimitDialog(tokenCount);
                return false;
            }

            setBilnValue(nextBiln);
            return true;
        },
        [bilnValue, setBilnValue, openLimitDialog],
    );

    const {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
        handleDragStart,
        handleDeleteSequence,
        replaceMonomerInBiln,
        handleCircularizeSequence,
        handleUncircularizeSequence,
        handleMirrorSequence,
    } = useBilnHandlers({
        bilnValue,
        setBilnValue: trySetBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        setIsDragging,
        setHoveredMonomer: hoveredMonomerStore.set,
    });
    const { handleMonomerEnter, handleMonomerLeave, handleMonomerHover } = useUIHandlers({ monomers, setHoveredMonomer: hoveredMonomerStore.set, isDragging });


    // Flatten constraints to secstruct (keep '-' for "no constraint")
    const ALLOWED_SS = useMemo(() => new Set(['H', 'E', 'C', 'T', '-']), []);
    const flattenSecstruct = useCallback((cbs) => (
        (cbs || [])
            .flat()
            .map(c => {
                const ch = (c || '-').toString().toUpperCase();
                return ALLOWED_SS.has(ch) ? ch : '-';
            })
            .join('')
    ), [ALLOWED_SS]);

    const secstructString = useMemo(() => flattenSecstruct(constraintsBySeq), [constraintsBySeq, flattenSecstruct]);

    // Scaffold /template handling
    const {
        scaffoldTemplate,
        uploadScaffoldFile,
        fetchScaffoldById,
        handleClearScaffold,
        loading: scaffoldLoading,
        error: scaffoldError,
        warnings: scaffoldWarnings,
        messages: scaffoldMessages,
        standardization: scaffoldStandardization,
    } = useScaffoldTemplate();

    const scaffoldTemplateId = scaffoldTemplate?.id ?? null;
    const prevScaffoldTemplateIdRef = useRef(null);
    const hadTemplateRef = useRef(false);

    // One-time nudge: when a template is newly loaded, open the Template panel
    // so the user immediately sees where to remove/manage it.
    useEffect(() => {
        const prev = prevScaffoldTemplateIdRef.current;
        prevScaffoldTemplateIdRef.current = scaffoldTemplateId;

        if (!prev && scaffoldTemplateId) {
            setActive3DPanel('template');
            setConstraintMode('template');
        }
    }, [scaffoldTemplateId]);

    // Note: template guidance is a valid mode even without a scaffold.
    // When scaffold is removed, keep the current constraintMode and let the UI
    // offer an upload action in the Template row.
    useEffect(() => {
        if (scaffoldTemplateId) {
            hadTemplateRef.current = true;
        }
    }, [scaffoldTemplateId]);

    const [scaffoldErrorOpen, setScaffoldErrorOpen] = useState(false);

    useEffect(() => {
        setScaffoldErrorOpen(!!scaffoldError);
    }, [scaffoldError]);

    const [scaffoldWarningsOpen, setScaffoldWarningsOpen] = useState(false);

    useEffect(() => {
        if (Array.isArray(scaffoldMessages) && scaffoldMessages.length > 0) {
            setScaffoldWarningsOpen(true);
        } else {
            setScaffoldWarningsOpen(false);
        }
    }, [scaffoldMessages]);

    const { scaffoldMappings, anyScaffoldEnabled, scaffoldMappingPayload, handleEditScaffoldMapping, hasTemplateOverlap } = useScaffoldMappings(rowMonomerLists, scaffoldTemplate);

    const isTemplateMode = constraintMode === 'template';
    const effectiveAnyScaffoldEnabled = isTemplateMode && anyScaffoldEnabled;
    const [templateOverlapOpen, setTemplateOverlapOpen] = useState(false);
    const [autoSync3DRaw, setAutoSync3DRaw] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem(AUTO_SYNC_3D_STORAGE_KEY);
            if (raw == null) return true;
            const v = String(raw).trim().toLowerCase();
            return v === 'false' ? false : true;
        } catch {
            return true;
        }
    });
    const autoSync3D = !effectiveAnyScaffoldEnabled && autoSync3DRaw;

    useEffect(() => {
        try {
            window?.localStorage?.setItem(AUTO_SYNC_3D_STORAGE_KEY, String(!!autoSync3DRaw));
        } catch {
            // ignore
        }
    }, [autoSync3DRaw]);

    const [replaceSelect, setReplaceSelect] = useState({ open: false, mode: null, sourceMonomer: null });
    const beginReplaceSelection = useCallback((mode, sourceMonomer) => {
        setReplaceSelect({ open: true, mode, sourceMonomer });
        onBeginReplaceSelection?.(mode, sourceMonomer);
    }, [onBeginReplaceSelection]);

    const cancelReplaceSelection = useCallback(() => {
        setReplaceSelect({ open: false, mode: null, sourceMonomer: null });
        onCancelReplaceSelection?.();
        // notify items to clear selection highlight
        window.dispatchEvent(new CustomEvent('pp-replace-selection-cancel'));
    }, [onCancelReplaceSelection]);

    // Listen to fallback custom event from MonomerItem if prop isn't threaded
    useEffect(() => {
        const handler = (e) => beginReplaceSelection(e.detail?.mode, e.detail?.monomer);
        window.addEventListener('pp-begin-replace-selection', handler);
        return () => window.removeEventListener('pp-begin-replace-selection', handler);
    }, [beginReplaceSelection]);

    // Focus/zoom a residue in 3D from UI right-clicks (template or designed)
    useEffect(() => {
        const handler = (e) => {
            const detail = e?.detail;
            viewer3DRef.current?.focusResidue?.(detail);
        };
        window.addEventListener('pp-focus-residue', handler);
        return () => window.removeEventListener('pp-focus-residue', handler);
    }, []);

    // Close on Escape when overlay is open
    useEffect(() => {
        if (!replaceSelect.open) return;
        const onKey = (e) => { if (e.key === 'Escape') cancelReplaceSelection(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [replaceSelect.open, cancelReplaceSelection]);

    // Lift state up: output data
    useEffect(() => {
        if (onOutputChange) {
            onOutputChange({
                biln: bilnValue,
                helm: helm,
                smiles: smiles,
                sdf2d: sdf,
                structure3D: structurePDB || '',
                xyz: structureOutput?.XYZ || structureOutput?.xyz || '',
                // sdf3d: structureOutput?.SDF || structureOutput?.sdf || '',
                mol2: structureOutput?.MOL2 || structureOutput?.mol2 || '',
                inchi: structureOutput?.InChI || structureOutput?.inchi || '',
                inchiKey: structureOutput?.InChIKey || structureOutput?.inchiKey || '',
            });
        }
    }, [bilnValue, helm, sdf, smiles, structurePDB, structureOutput, onOutputChange]);

    const ssSignatureForGen = useMemo(() => {
        return constraintMode === 'ss' ? secstructString : '';
    }, [constraintMode, secstructString]);

    const canGenerate3D = useMemo(() => {
        if (!committedBiln) return false;
        const { tokenCount } = analyzeBiln(committedBiln);
        if (tokenCount <= 0) return false;
        if (constraintMode !== 'ss') return true;
        return secstructString.length === tokenCount;
    }, [committedBiln, secstructString, constraintMode]);

    // Debounced generate3D trigger and last sent guard
    const lastGenRef = useRef({
        biln: null,
        ss: null,
        useTemplate: null,
        mappingSig: null,
        ph: null,
    });

    const triggerGenerate = useCallback(
        (biln, ss) => {
            const useTemplate = effectiveAnyScaffoldEnabled && !!scaffoldMappingPayload;
            const mappingSig =
                useTemplate && scaffoldMappingPayload
                    ? JSON.stringify(scaffoldMappingPayload)
                    : null;

            const requestParams = {
                no_hydrogens: false,
                is_protonated: true,
                ph_value: phValue,
            };

            // Normalize BILN: if it's effectively empty, do not generate
            const normalizedBiln = normalizeBilnForGen(biln);

            if (!normalizedBiln) {
                lastGenRef.current = { biln, ss, useTemplate, mappingSig, ph: phValue };
                return;
            }

            const prev = lastGenRef.current;

            if (
                prev.biln === biln &&
                prev.ss === ss &&
                prev.useTemplate === useTemplate &&
                prev.mappingSig === mappingSig &&
                prev.ph === phValue
            ) {
                return;
            }

            if (useTemplate && hasTemplateOverlap()) {
                setTemplateOverlapOpen(true);
                return;
            }

            lastGenRef.current = { biln, ss, useTemplate, mappingSig, ph: phValue };

            if (useTemplate) {
                generate3D(biln, null, {
                    endpoint: '/api/core/molecules/generate_3d_from_template',
                    extraBody: {
                        biln,
                        template_id: scaffoldMappingPayload.template_id,
                        scaffold_mappings: scaffoldMappingPayload.mappings,
                    },
                    requestParams,
                });
            } else {
                const constraintsForGen = constraintMode === 'ss' ? constraintsBySeq : null;
                generate3D(biln, constraintsForGen, { requestParams });
            }
        },
        // FIX deps: structureOutput wasn’t used; constraintsBySeq + structurePDB are the relevant ones
        [generate3D, effectiveAnyScaffoldEnabled, scaffoldMappingPayload, hasTemplateOverlap, constraintsBySeq, phValue, normalizeBilnForGen, constraintMode],
    );

    const handleAutoSyncChange = useCallback(
        (_, checked) => {
            // If any scaffold mapping is enabled, force manual mode
            if (effectiveAnyScaffoldEnabled && checked) return;
            setAutoSync3DRaw(!!checked);
        },
        [effectiveAnyScaffoldEnabled],
    );

    const handleManualGenerate3D = useCallback(() => {
        if (!isActive || !canGenerate3D || !committedBiln) return;

        // Manual runs should allow a re-run even if inputs didn't change.
        // Auto-sync keeps the lastGenRef guard to avoid unnecessary recomputation.
        lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null, ph: null };

        // User explicitly asked to compute: do not keep "resume suppression" active.
        suppressAutoConformerForBilnRef.current = null;
        suppressNextAutoConformerGenRef.current = false;
        suppressAutoConformerAfterResumeRef.current = false;

        triggerGenerate(committedBiln, ssSignatureForGen);
    }, [isActive, canGenerate3D, committedBiln, ssSignatureForGen, triggerGenerate]);

    // Toggling mapping enabled/disabled changes auto-sync conditions.
    // We never want that toggle itself to trigger an immediate auto conformer generation.
    const handleEditScaffoldMappingNoAutoGen = useCallback(
        (seqIdx, patch) => {
            // Editing template mappings implies template-mode for the whole peptide.
            if (!isTemplateMode) setConstraintMode('template');
            if (patch && Object.prototype.hasOwnProperty.call(patch, 'enabled')) {
                suppressNextAutoConformerGenRef.current = true;
            }
            handleEditScaffoldMapping(seqIdx, patch);
        },
        [handleEditScaffoldMapping, isTemplateMode],
    );


    // keep constraints arrays shaped to sequences
    useEffect(() => {
        setConstraintsBySeq(prev => {
            const next = rowMonomerLists.map((seq, i) => {
                const existing = Array.isArray(prev[i]) ? prev[i] : [];
                const len = seq.length;
                const out = new Array(len);
                for (let j = 0; j < len; j++) {
                    const v = (existing[j] || '-').toString().toUpperCase();
                    out[j] = ALLOWED_SS.has(v) ? v : '-';
                }
                return out;
            });

            // Deep equality check to avoid no-op state updates
            let same = next.length === prev.length;
            if (same) {
                for (let i = 0; i < next.length && same; i++) {
                    const a = next[i] || [];
                    const b = prev[i] || [];
                    if (a.length !== b.length) { same = false; break; }
                    for (let j = 0; j < a.length; j++) {
                        if (a[j] !== b[j]) { same = false; break; }
                    }
                }
            }
            return same ? prev : next;
        });
    }, [rowMonomerLists]);

    // shape-safe edit
    const handleEditConstraint = useCallback((seqIdx, resIdx, ch) => {
        setConstraintsBySeq(prev => {
            const lists = rowMonomerLists; // capture current lengths
            const targetLen = lists[seqIdx]?.length ?? 0;

            // Sanitize incoming value
            const val = (() => {
                const up = (ch || '-').toString().toUpperCase();
                return ALLOWED_SS.has(up) ? up : '-';
            })();

            // If current equals new, do nothing (prevents redundant renders)
            const current = (Array.isArray(prev?.[seqIdx]) && prev[seqIdx][resIdx]) || '-';
            if (current === val) return prev;

            // Clone and apply change
            const next = prev.map(a => (Array.isArray(a) ? a.slice() : []));
            while (next.length < lists.length) next.push([]);
            const arr = Array.isArray(next[seqIdx]) ? next[seqIdx].slice() : new Array(targetLen).fill('-');
            if (arr.length < targetLen) {
                next[seqIdx] = arr.concat(new Array(targetLen - arr.length).fill('-'));
            } else {
                next[seqIdx] = arr;
            }
            next[seqIdx][resIdx] = val;
            return next;
        });
    }, [rowMonomerLists, ALLOWED_SS]);

    // Stable setter to avoid MonomerTrack re-render due to inline function identity changes
    const onSetActiveSeqIdx = useCallback(
        (seqIdx) => setUiState(prev => (prev.activeSeqIdx === seqIdx ? prev : { ...prev, activeSeqIdx: seqIdx })),
        [setUiState]
    );

    // Expose a minimal API to parent
    useImperativeHandle(ref, () => ({
        addMonomer: (monomer, options) => {
            // Hard block additions when already at the limit
            if (isAtMonomerLimit) {
                openLimitDialog(currentTokenCount);
                return false;
            }
            return addMonomerToBiln(monomer, {
                mode: options?.mode,
                link: options?.link,
                activeSequenceIdx: options?.activeSequenceIdx ?? uiState.activeSeqIdx,
                insert: options?.insert,
            });
        },
        replaceMonomer: (m, opts) => replaceMonomerInBiln(m, opts),
        endReplaceSelection: () => { cancelReplaceSelection(); },
        setBiln: (biln) => trySetBilnValue(biln),
        getBiln: () => bilnValue,
    }), [addMonomerToBiln, replaceMonomerInBiln, uiState, bilnValue, isAtMonomerLimit, currentTokenCount, openLimitDialog, cancelReplaceSelection, trySetBilnValue]);


    function loadData(newBiln) {
        // Assign width and height based on BILN sequence length (from chain with max residues)
        const maxLen = Math.max(
            0,
            ...(getSequences(newBiln) || []).map((seq) => {
                const s = String(seq || '').trim();
                if (!s) return 0;
                return s.split('-').filter(Boolean).length;
            }),
        );
        const size = Math.min(Math.max(400 + maxLen * 80, 600), 2800);
        const params = {
            sequence: newBiln,
            mode: 'rdkit',
            'show-atom-indices': isShowingAtomIndices,
            'is_protonated': true,
            'ph_value': phValue,
            'width': size,
            'height': size,
            // 'owner_id': 'user_test',
        }

        // const query = `?sequence=${newBiln}&mode=rdkit&show-atom-indices=${isShowingAtomIndices}`;
        fetchDepiction(params);
    }

    // Update committedBiln only when BILN is committable (prevents “separator-only” and open '(' churn)
    useEffect(() => {
        // IMPORTANT: keep committedBiln in sync when user clears
        if (!bilnValue || !bilnValue.trim()) {
            if (committedBiln !== '') setCommittedBiln('');

            // Key fix: allow re-generating if user pastes the same sequence again
            lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null, ph: null };

            return;
        }

        const { committable, bondsComplete } = analyzeBiln(bilnValue);
        if (!committable || !bondsComplete) return;
        if (bilnValue !== committedBiln) setCommittedBiln(bilnValue);
    }, [bilnValue, committedBiln]);

    // Drive depiction only from committedBiln
    useEffect(() => {
        if (!isActive) return; // skip when not active
        if (!committedBiln) {
            setMonomerSequences('', []); // clear sequences
            setDepictionData({ svg: '', monomers: [], smiles: '', helm: '', sdf2d: '' });
            setStructureOutput({ pdb: '' });
            // Also clear any stale 3D error/job state from a previous generation.
            // This prevents showing template-failure messages when the input is empty.
            try {
                generate3D('', null);
            } catch {
                // ignore
            }
            return;
        }
        loadData(committedBiln);
    }, [committedBiln, isActive, isShowingAtomIndices, phValue, generate3D]);

    useEffect(() => {
        if (!isActive) return;
        if (!committedBiln) {
            setStructureOutput({ pdb: '' });
            return;
        }
        if (!autoSync3D) return;

        // Resume is a special case: we programmatically set BILN and want to ONLY load the existing PDB.
        // Block ALL auto-sync conformer generation until the user makes a normal edit.
        if (suppressAutoConformerAfterResumeRef.current) {
            return;
        }

        if (!canGenerate3D) return;

        // If the user resumed an existing job, suppress auto-generation for that specific BILN
        // until the user changes the sequence.
        if (suppressAutoConformerForBilnRef.current) {
            const committedNorm = normalizeBilnForGen(committedBiln);
            if (committedNorm === suppressAutoConformerForBilnRef.current) {
                return;
            }
            // Sequence changed: re-enable auto generation.
            suppressAutoConformerForBilnRef.current = null;
        }

        // If the user resumed an existing conformer job, don't auto-trigger a new generation.
        if (suppressNextAutoConformerGenRef.current) {
            suppressNextAutoConformerGenRef.current = false;
            return;
        }

        triggerGenerate(committedBiln, ssSignatureForGen);
    }, [isActive, committedBiln, autoSync3D, canGenerate3D, triggerGenerate, ssSignatureForGen, normalizeBilnForGen]);

    const manualGenerateDisabled = autoSync3D || !canGenerate3D || structureLoading;
    const generateBtnTooltip = effectiveAnyScaffoldEnabled
        ? 'Scaffold mapping is enabled: use "Generate 3D" to update the conformer.'
        : autoSync3D
            ? '3D view updates automatically while Sync is on.'
            : !canGenerate3D
                ? 'Ensure constraints cover every residue before generating.'
                : structureLoading
                    ? 'Generation already in progress.'
                    : 'Generate updated 3D structure.';

    // Keep UI seq count in sync with committed BILN
    useEffect(() => {
        const count = deriveSeqCount(committedBiln) + (Number(extraEmptyChains) || 0);
        setUiState(prev => {
            const nextIdx = reconcileActiveSeqIdx(prev.activeSeqIdx, count);
            if (prev.seqNumber === count && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: count, activeSeqIdx: nextIdx };
        });
    }, [committedBiln, extraEmptyChains, setUiState]);

    function handleBilnChange(newBiln) {
        trySetBilnValue(newBiln);
    }

    const clearData = useCallback(() => {
        // Reset UI state expectations
        setAutoSync3DRaw(true);          // requested behavior: reset auto-sync to true
        setTemplateOverlapOpen(false);

        // Reset global parameters
        setPhValue(DEFAULT_PH_VALUE);

        // Clear editor + derived committed state
        setBilnValue('');
        setCommittedBiln('');

        suppressAutoConformerAfterResumeRef.current = false;

        // Clear outputs
        setDepictionData({ svg: '', monomers: [], smiles: '', helm: '' });
        setStructureOutput({ pdb: '' });

        // Reset “last generated” guard so next paste triggers generation normally
        lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null, ph: null };

        // Clear scaffold (also makes autoSync3D = true again because effectiveAnyScaffoldEnabled becomes false)
        handleClearScaffold();
    }, [
        setAutoSync3DRaw,
        setTemplateOverlapOpen,
        setPhValue,
        setBilnValue,
        setCommittedBiln,
        setDepictionData,
        setStructureOutput,
        handleClearScaffold,
    ]);

    // Persist design state
    usePersistDesign({ biln: bilnValue, constraints: constraintsBySeq });


    // Compact, subtle button style for the 2D toolbar
    // Compact, subtle button style for the 2D/3D toolbars (icon-only)
    const TOOLBAR_BTN_SX = Object.freeze({
        textTransform: 'none',
        lineHeight: 1.1,
        minHeight: 24,
        minWidth: 32,
        px: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
        '& .MuiSvgIcon-root': { color: 'currentColor' },
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
        '&.Mui-disabled': { color: 'text.disabled', borderColor: 'divider' },
        '&.Mui-disabled .MuiSvgIcon-root': { color: 'text.disabled' },
    });
    const BUTTON_GROUP_SX = Object.freeze({ '& .MuiButton-root': TOOLBAR_BTN_SX });

    // Split layout for editor/viewers ; draggable divider
    const {
        editorAreaHeight,
        viewerSplitRatio,
        setViewerSplitRatio,
        mainAreaRef,
        viewerRowRef,
        startDrag,
    } = useSplitLayout({
        initialEditorHeight: 320,
        minEditorHeight: 240,
        minViewerPanelWidth: 200,
        initialViewerSplitRatio: 0.5,
    });

    // When entering link/unlink modes, temporarily maximize the 2D panel width
    // so the guidance + canvas are always usable. Restore the previous split when exiting.
    const splitRatioBeforeLinkModeRef = useRef(null);
    const wasLinkModeActiveRef = useRef(false);
    useEffect(() => {
        const active = !!viewer2DModes.linkMode || !!viewer2DModes.bondsMode;
        const wasActive = wasLinkModeActiveRef.current;

        if (active && !wasActive) {
            wasLinkModeActiveRef.current = true;
            splitRatioBeforeLinkModeRef.current = viewerSplitRatio;

            // Compute the maximum feasible ratio while keeping the 3D panel at least ~200px wide.
            const host = viewerRowRef?.current;
            const totalW = host?.getBoundingClientRect?.().width;
            const minOtherPx = 200;
            const maxRatio = (Number.isFinite(totalW) && totalW > 0)
                ? Math.max(0, Math.min(1, (totalW - minOtherPx) / totalW))
                : 1;

            // Nudge slightly below 1 to avoid precision/rounding issues with flexBasis.
            const target = Math.min(maxRatio, 0.98);
            setViewerSplitRatio(target);
            return;
        }

        if (!active && wasActive) {
            wasLinkModeActiveRef.current = false;
            const prev = splitRatioBeforeLinkModeRef.current;
            splitRatioBeforeLinkModeRef.current = null;
            if (typeof prev === 'number' && Number.isFinite(prev)) {
                setViewerSplitRatio(prev);
            }
        }
    }, [viewer2DModes.linkMode, viewer2DModes.bondsMode, viewerSplitRatio, setViewerSplitRatio, viewerRowRef]);

    useLayoutEffect(() => {
        // Keep the user-controlled 2D/3D split stable; only force Mol* to resize
        // when the side panel changes.
        const raf = requestAnimationFrame(() => {
            try { viewer3DRef.current?.resize?.(); } catch { }
        });
        return () => cancelAnimationFrame(raf);
    }, [active3DPanel]);


    return (
        <Box
            ref={mainAreaRef}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative', // anchor the local overlay
                    gap: 1,
                }}
            >
                <Box sx={{ height: editorAreaHeight, minHeight: 160, overflow: 'hidden', position: 'relative' }}>
                    {/* Top: Biln editor (no collapse) */}
                    <BilnEditorInterface
                        biln={bilnValue}
                        maxMonomers={MAX_MONOMERS}
                        isAtMonomerLimit={isAtMonomerLimit}
                        onChangeBiln={handleBilnChange}
                        hoveredResidueIdx={null}
                        isDragging={isDragging}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={handleUndoBiln}
                        onRedo={handleRedoBiln}
                        onClear={clearData}
                        extraEmptyChains={extraEmptyChains}
                        setExtraEmptyChains={setExtraEmptyChains}
                        // Chains section props
                        rowMonomerLists={rowMonomerLists}
                        activeSeqIdx={uiState.activeSeqIdx}
                        onSetActiveSeqIdx={onSetActiveSeqIdx}
                        linkMap={linkMap}
                        handleDeleteMonomerItem={handleDeleteMonomerItem}
                        onDragStart={handleDragStart}
                        onDragEnd={handleOnDragEnd}
                        handleMonomerEnter={handleMonomerEnter}
                        handleMonomerLeave={handleMonomerLeave}
                        handleDeleteSequence={handleDeleteSequence}
                        constraintsBySeq={constraintsBySeq}
                        onEditConstraint={handleEditConstraint}
                        constraintMode={constraintMode}
                        onConstraintModeChange={(next) => {
                            setConstraintMode(next);
                        }}
                        canUseTemplateMode={true}
                        // Toolbar (link/cut) wiring
                        linkMode={viewer2DModes.linkMode}
                        bondsMode={viewer2DModes.bondsMode}
                        onToggleLinkMode={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                        onToggleCutMode={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                        canLink={canLink}
                        canUnlink={canCut}
                        ph={phValue}
                        onChangePh={(next) => setPhValue(next)}
                        // Global scaffold props
                        scaffoldTemplate={scaffoldTemplate}
                        onUploadScaffoldFile={uploadScaffoldFile}
                        onFetchScaffoldById={fetchScaffoldById}
                        onClearScaffold={handleClearScaffold}
                        scaffoldMappings={scaffoldMappings}
                        onEditScaffoldMapping={handleEditScaffoldMappingNoAutoGen}
                        onOpenTemplatePanel={() => setActive3DPanel('template')}
                        onCircularizeSequence={handleCircularizeSequence}
                        onUncircularizeSequence={handleUncircularizeSequence}
                        onMirrorSequence={handleMirrorSequence}
                    />

                    {/* Link/Unlink guidance is shown above the 2D sketch viewer */}
                </Box>

                <Box
                    role="separator"
                    aria-orientation="horizontal"
                    onMouseDown={startDrag('horizontal')}
                    sx={{
                        height: 4,
                        cursor: 'row-resize',
                        bgcolor: 'divider',
                        '&:hover': { bgcolor: 'text.secondary' },
                    }}
                />


                {/* Overlapping scaffold mappings warning */}
                <Dialog
                    open={templateOverlapOpen}
                    onClose={() => setTemplateOverlapOpen(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>Scaffold mappings overlap</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2">
                            At least two designed chains map to overlapping residue ranges on the same
                            scaffold chain. Please adjust the start/end residues so that each chain
                            uses a non-overlapping region before generating a 3D conformer.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button size="small" onClick={() => setTemplateOverlapOpen(false)}>
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>

                <ScaffoldWarningsDialog
                    open={scaffoldWarningsOpen}
                    warnings={scaffoldWarnings}
                    messages={scaffoldMessages}
                    standardization={scaffoldStandardization}
                    scaffoldName={scaffoldTemplate?.name}
                    onAcknowledge={() => setScaffoldWarningsOpen(false)}
                />

                <Dialog
                    open={scaffoldErrorOpen}
                    onClose={() => setScaffoldErrorOpen(false)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>Scaffold upload failed</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2" color="text.secondary">
                            {String(scaffoldError || 'Failed to parse scaffold.')}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button size="small" onClick={() => setScaffoldErrorOpen(false)}>
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Local overlay for “replace monomer” selection */}
                <ReplaceOverlay replaceSelect={replaceSelect} onCancel={cancelReplaceSelection} />

                {/* Link/Unlink guidance is rendered inside the BILN panel above */}

                {/* Focus attention on the 2D viewer while linking */}
                <Backdrop
                    open={!!viewer2DModes.linkMode || !!viewer2DModes.bondsMode}
                    onClick={() => {
                        viewer2DRef.current?.setLinkMode?.(false);
                        viewer2DRef.current?.setBondsMode?.(false);
                    }}
                    sx={{
                        zIndex: (t) => t.zIndex.modal - 2,
                        bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                    }}
                />

                {/* Middle: 2D and 3D viewers side-by-side */}
                <Box ref={viewerRowRef} sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 1 }}>

                    <Box
                        ref={viewer2DColRef}
                        sx={{
                            flexBasis: `${viewerSplitRatio * 100}%`,
                            minWidth: 200,
                            maxWidth: `calc(100% - 200px)`,
                            display: 'flex',
                            flexDirection: 'column',
                            pr: 0.5,
                            position: 'relative',
                            zIndex: (t) => ((viewer2DModes.linkMode || viewer2DModes.bondsMode) ? t.zIndex.modal - 1 : 'auto'),
                        }}
                    >
                        {(!!viewer2DModes.linkMode || !!viewer2DModes.bondsMode) && (
                            <Paper
                                variant="outlined"
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                    mb: 1,
                                    p: 1,
                                    borderRadius: 2,
                                    bgcolor: (t) => alpha(t.palette.background.paper, 0.98),
                                    backdropFilter: 'blur(2px)',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                                            {viewer2DModes.linkMode ? 'Link monomers' : 'Remove a bond'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {viewer2DModes.linkMode
                                                ? ((viewer2DModes.linkSelectionCount || 0) > 0
                                                    ? 'Select a second available R‑group to create the link.'
                                                    : 'Select an available R‑group in the 2D sketch.')
                                                : 'Double‑click a bond in the 2D sketch to remove it.'}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                        <Button
                                            size="small"
                                            color="inherit"
                                            variant="text"
                                            disabled={
                                                !viewer2DModes.linkMode ||
                                                (viewer2DModes.linkSelectionCount || 0) <= 0
                                            }
                                            onClick={() => viewer2DRef.current?.clearLinkSelection?.()}
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            size="small"
                                            color="inherit"
                                            variant="outlined"
                                            onClick={() => {
                                                viewer2DRef.current?.setLinkMode?.(false);
                                                viewer2DRef.current?.setBondsMode?.(false);
                                            }}
                                        >
                                            Exit
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        )}

                        {/* 2D viewer paper */}
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header row for 2D Viewer & Controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                                    2D Sketch
                                </Typography>
                                <ButtonGroup
                                    size="small"
                                    variant="text"
                                    sx={BUTTON_GROUP_SX}
                                >
                                    <Tooltip title="Link" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                                                color="inherit"
                                                disabled={!svgDepiction || viewer2DModes.bondsMode}
                                                aria-label="link-monomers"
                                            >
                                                <DeviceHubIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Unlink" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                                                color="inherit"
                                                disabled={!svgDepiction || viewer2DModes.linkMode || viewer2DModes?.canCut === false}
                                                aria-label="toggle-bonds"
                                            >
                                                <LinkOffIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Reset View" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.resetView()}
                                                color="inherit"
                                                disabled={!svgDepiction}
                                                aria-label="reset-view"
                                            >
                                                <RestartAltIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title="Download SVG" arrow placement='top'>
                                        <span>
                                            <Button
                                                onClick={() => viewer2DRef.current?.downloadSvg?.('pep-edit_2d.svg')}
                                                color="inherit"
                                                disabled={!svgDepiction}
                                                aria-label="download-svg"
                                            >
                                                <DownloadIcon fontSize="inherit" />
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </ButtonGroup>
                            </Box>
                            {/* Canvas area */}
                            <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
                                <HoverAwareViewer2D
                                    ref={viewer2DRef}
                                    svgData={svgDepiction}
                                    linkMap={linkMap}
                                    isShowingAtomIndices={isShowingAtomIndices}
                                    handleShowingAtomIndices={setIsShowingAtomIndices}
                                    handleMonomerEnter={handleMonomerEnter}
                                    handleMonomerLeave={handleMonomerLeave}
                                    onLinkMonomers={handleMonomerLinking}
                                    onBreakBond={handleBondBreaking}
                                    error={depictionError}
                                    loading={depictionLoading}
                                    onModesChange={setViewer2DModes}
                                />
                            </Box>
                        </Paper>
                    </Box>

                    <Box
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={startDrag('vertical')}
                        sx={{
                            width: 4,
                            cursor: 'col-resize',
                            alignSelf: 'stretch',
                            bgcolor: 'divider',
                            '&:hover': { bgcolor: 'text.secondary' },
                        }}
                    />

                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 200,
                            pl: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >

                        {/* 3D viewer paper */}
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header row for 3D Viewer & Controls */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {/* Left: primary actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                                    <Tooltip title={autoSync3D ? 'Updates automatically' : generateBtnTooltip} arrow placement="top">
                                        <span>
                                            <Button
                                                variant={autoSync3D ? "outlined" : "contained"}
                                                size="small"
                                                color={autoSync3D ? "primary" : "primary"}
                                                onClick={(() => {
                                                    // Allow cancel even in auto-sync mode.
                                                    if (isConformerQueuedOrRunning) return () => cancelConformerJob?.();
                                                    if (autoSync3D) return undefined;
                                                    if (isConformerQueuedOrRunning) return () => cancelConformerJob?.();
                                                    if (!canGenerate3D || !committedBiln) return undefined;
                                                    if (isConformerTerminalFailedOrCanceled) return handleManualGenerate3D;
                                                    return handleManualGenerate3D;
                                                })()}
                                                disabled={(() => {
                                                    // In auto-sync, keep this button non-actionable unless it cancels.
                                                    if (autoSync3D) return !isConformerQueuedOrRunning;
                                                    if (isConformerQueuedOrRunning) return !!isCancelingConformerJob;
                                                    // If the input is empty/invalid, keep it disabled even after a terminal job.
                                                    if (!canGenerate3D || !committedBiln) return true;
                                                    if (isConformerTerminalFailedOrCanceled) return false;
                                                    return manualGenerateDisabled;
                                                })()}
                                                startIcon={autoSync3D ? <BoltIcon sx={{ animation: 'pulse 2s infinite' }} /> : <PlayArrowIcon />}
                                                className={!autoSync3D ? "!bg-slate-800/90 hover:!bg-slate-800/80 !text-slate-50" : '!bg-slate-800/90 !cursor-default !text-slate-50 !btn-disabled'}
                                                sx={{
                                                    textTransform: 'none',
                                                    paddingX: 1,
                                                    fontWeight: 500,
                                                    minWidth: 120,
                                                    maxHeight: 26,
                                                    '@keyframes pulse': {
                                                        '0%': { color: 'inherit' },
                                                        '50%': { color: 'yellow' },
                                                        '100%': { color: 'inherit' },
                                                    }
                                                }}
                                            >
                                                {isConformerQueuedOrRunning
                                                    ? "Cancel"
                                                    : autoSync3D
                                                        ? "Live Preview"
                                                        : isConformerTerminalFailedOrCanceled
                                                            ? "Generate 3D"// "Retry"
                                                            : "Generate 3D"}
                                            </Button>
                                        </span>
                                    </Tooltip>

                                    <Tooltip
                                        title={
                                            effectiveAnyScaffoldEnabled
                                                ? 'Auto sync is disabled while template mode is active.'
                                                : autoSync3D
                                                    ? 'Disable automatic updates'
                                                    : 'Enable automatic updates'
                                        }
                                        arrow
                                        placement="top"
                                    >
                                        <FormControlLabel
                                            control={
                                                <span>
                                                    <Switch
                                                        size="small"
                                                        checked={autoSync3D}
                                                        onChange={handleAutoSyncChange}
                                                        inputProps={{ 'aria-label': 'toggle automatic 3D sync' }}
                                                        disabled={effectiveAnyScaffoldEnabled}
                                                    />
                                                </span>
                                            }
                                            label="Auto sync"
                                            sx={{
                                                m: 0,
                                                ml: 0.5,
                                                color: autoSync3D ? 'primary.main' : 'text.secondary',
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: 13,
                                                    fontWeight: autoSync3D ? 500 : 400,
                                                    transition: 'all 0.3s ease'
                                                },
                                            }}
                                        />
                                    </Tooltip>
                                </Box>

                                {/* <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} /> */}

                                {/* Right: canvas controls */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                                    {/* Canvas container */}
                                    <ButtonGroup
                                        size="small"
                                        variant="text"
                                        sx={BUTTON_GROUP_SX}
                                    >
                                        <Tooltip title="Representation" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'representation' ? null : 'representation'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'representation'}
                                                sx={active3DPanel === 'representation' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <CategoryIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Color by" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'color' ? null : 'color'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'color'}
                                                sx={active3DPanel === 'color' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <PaletteIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Labels" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'labels' ? null : 'labels'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'labels'}
                                                aria-label="labels-menu"
                                                sx={active3DPanel === 'labels' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <LabelIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Background" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'background' ? null : 'background'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'background'}
                                                aria-label="background"
                                                sx={active3DPanel === 'background' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <FormatColorFillIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="View" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'view' ? null : 'view'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'view'}
                                                aria-label="reset-view"
                                                sx={active3DPanel === 'view' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <RestartAltIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip
                                            title={
                                                scaffoldTemplate?.name
                                                    ? `Template loaded: ${scaffoldTemplate.name}. Click to manage/remove.`
                                                    : 'Template'
                                            }
                                            arrow
                                            placement='top'
                                        >
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'template' ? null : 'template'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'template'}
                                                aria-label="template"
                                                sx={(() => {
                                                    const isActive = active3DPanel === 'template';
                                                    const hasTemplate = !!scaffoldTemplate;
                                                    if (isActive) return { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } };
                                                    if (hasTemplate) return { color: 'primary.main' };
                                                    return undefined;
                                                })()}
                                            >
                                                <LayersIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Snapshot" arrow placement='top'>
                                            <span>
                                                <Button
                                                    onClick={() => viewer3DRef.current?.takeScreenshot?.()}
                                                    color="inherit"
                                                    aria-label="snapshot"
                                                    disabled={!structurePDB}
                                                >
                                                    <PhotoCameraIcon fontSize="inherit" />
                                                </Button>
                                            </span>
                                        </Tooltip>

                                        <Tooltip title="Log" arrow placement='top'>
                                            <Button
                                                onClick={() => setActive3DPanel((p) => (p === 'log' ? null : 'log'))}
                                                color="inherit"
                                                aria-pressed={active3DPanel === 'log'}
                                                aria-label="log"
                                                sx={active3DPanel === 'log' ? { bgcolor: 'action.selected', color: 'primary.main', '&:hover': { bgcolor: 'action.selected' } } : undefined}
                                            >
                                                <SubjectIcon fontSize="inherit" />
                                            </Button>
                                        </Tooltip>

                                    </ButtonGroup>
                                </Box>
                            </Box>

                            {/* Canvas area */}
                            <Box ref={molstarRightPanelRowRef} sx={{ flex: 1, minHeight: 220, width: '100%', minWidth: 0, overflow: 'hidden', display: 'flex', gap: 1 }}>
                                {/* 3D canvas area */}
                                <Box sx={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    {structureLoading && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: molstarBackground === 'dark'
                                                    ? alpha(theme.palette.common.black, 0.35)
                                                    : alpha(theme.palette.common.white, 0.6),
                                                zIndex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexDirection: 'column',
                                                gap: 1,
                                                px: 2,
                                            }}
                                        >
                                            <CircularProgress size={48} />
                                        </Box>
                                    )}

                                    {structureLoading && conformerProgressLines.length > 0 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 10,
                                                right: 10,
                                                bottom: 10,
                                                zIndex: 2,
                                                px: 1.25,
                                                py: 0.75,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: molstarBackground === 'dark'
                                                    ? alpha(theme.palette.common.white, 0.22)
                                                    : alpha(theme.palette.common.black, 0.12),
                                                bgcolor: molstarBackground === 'dark'
                                                    ? alpha(theme.palette.common.black, 0.72)
                                                    : alpha(theme.palette.background.paper, 0.92),
                                                backdropFilter: 'blur(2px)',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: molstarBackground === 'dark'
                                                        ? theme.palette.common.white
                                                        : theme.palette.text.primary,
                                                    fontSize: '0.92rem',
                                                    fontWeight: 500,
                                                    lineHeight: 1.35,
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {conformerProgressLines.join('\n')}
                                            </Typography>
                                        </Box>
                                    )}
                                    {!structureLoading && !structurePDB && (
                                        conformerJobState !== 'canceled' || !hasEverHadStructureRef.current
                                    ) && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: (() => {
                                                    // Error: transparent/low-opacity overlay so Mol* remains visible.
                                                    const err = committedBiln ? String(generate3DError || '').trim() : '';
                                                    if (err) {
                                                        return molstarBackground === 'dark'
                                                            ? alpha(theme.palette.common.black, 0.75)
                                                            : alpha(theme.palette.common.white, 0.87);
                                                    }

                                                    // Default (no structure yet): keep a clean neutral backdrop.
                                                    return theme.palette.background.paper;
                                                })(),
                                                zIndex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 2,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {(() => {
                                                const err = committedBiln ? generate3DError : null;
                                                const hasErr = !!String(err || '').trim();
                                                const translucentOverlay = hasErr;

                                                const overlayTextPrimary = translucentOverlay
                                                    ? (molstarBackground === 'dark' ? theme.palette.common.white : theme.palette.text.primary)
                                                    : theme.palette.text.primary;
                                                const overlayTextSecondary = translucentOverlay
                                                    ? (molstarBackground === 'dark' ? alpha(theme.palette.common.white, 0.78) : theme.palette.text.secondary)
                                                    : theme.palette.text.secondary;
                                                const overlayTitleWarning = translucentOverlay
                                                    ? (molstarBackground === 'dark' ? theme.palette.warning.light : theme.palette.warning.main)
                                                    : theme.palette.warning.main;
                                                const overlayTitleError = translucentOverlay
                                                    ? (molstarBackground === 'dark' ? theme.palette.error.light : theme.palette.error.main)
                                                    : theme.palette.error.main;
                                                const hasTemplateMapping = !!effectiveAnyScaffoldEnabled;
                                                const hasAnyConstraints = Array.isArray(constraintsBySeq) && constraintsBySeq.some(
                                                    (row) => Array.isArray(row) && row.some((ch) => {
                                                        const v = String(ch ?? '').trim();
                                                        return v && v !== '-';
                                                    }),
                                                );

                                                // const showRetry = !autoSync3D && (isConformerTerminalFailedOrCanceled || !!err);
                                                const showRetry = false;

                                                if (!err) {
                                                    return (
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: overlayTextSecondary,
                                                                fontSize: '1.1rem',
                                                                lineHeight: 1.75,
                                                                fontWeight: 400,
                                                            }}
                                                        >
                                                            No data to display
                                                        </Typography>
                                                    );
                                                }

                                                if (!hasTemplateMapping && hasAnyConstraints && typeof err === 'string' && err.trim()) {
                                                    return (
                                                        <Box>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    color: overlayTitleWarning,
                                                                    fontSize: '1.1rem',
                                                                    lineHeight: 1.75,
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {err}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    mt: 0.75,
                                                                    color: overlayTextSecondary,
                                                                    fontSize: '0.9rem',
                                                                }}
                                                            >
                                                                This can happen when the requested secondary-structure constraints are too strict. Try relaxing them (set more residues to "-"), then run 3D generation again.
                                                            </Typography>

                                                            {!autoSync3D && showRetry && (
                                                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                                                    <Button variant="contained" size="small" onClick={handleManualGenerate3D}>
                                                                        Retry
                                                                    </Button>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                }

                                                if (hasTemplateMapping && typeof err === 'string' && err.trim()) {
                                                    return (
                                                        <Box>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    color: overlayTitleWarning,
                                                                    fontSize: '1.1rem',
                                                                    lineHeight: 1.75,
                                                                    fontWeight: 600,
                                                                    whiteSpace: 'pre-wrap',
                                                                }}
                                                            >
                                                                {err}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    mt: 0.75,
                                                                    color: overlayTextSecondary,
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: 1.5,
                                                                }}
                                                            >
                                                                The current template mapping appears incompatible with the designed peptide under the applied constraints.
                                                            </Typography>

                                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                                                <Box sx={{ textAlign: 'left', maxWidth: 520, width: '100%' }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            color: overlayTextPrimary,
                                                                            fontSize: '0.9rem',
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        Suggested actions
                                                                    </Typography>

                                                                    <Box
                                                                        component="ul"
                                                                        sx={{
                                                                            mt: 0.75,
                                                                            mb: 0,
                                                                            pl: 0,
                                                                            listStyle: 'none',
                                                                        }}
                                                                    >
                                                                        {[
                                                                            '- Relax topologic constraints in your designed peptide',
                                                                            '- Mask out certain residues of the template',
                                                                            '- Modify the template residue mapping (start/end, offset)',
                                                                            '- Retry with reduced template guidance if needed',
                                                                        ].map((txt) => (
                                                                            <Box
                                                                                key={txt}
                                                                                component="li"
                                                                                sx={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'flex-start',
                                                                                    gap: 1,
                                                                                    mt: 0.85,
                                                                                }}
                                                                            >
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{
                                                                                        color: overlayTextSecondary,
                                                                                        fontSize: '0.9rem',
                                                                                        lineHeight: 1.5,
                                                                                    }}
                                                                                >
                                                                                    {txt}
                                                                                </Typography>
                                                                            </Box>
                                                                        ))}
                                                                    </Box>
                                                                </Box>
                                                            </Box>

                                                            {!autoSync3D && showRetry && (
                                                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                }

                                                return (
                                                    <Box>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: conformerErrorType === 'network' ? overlayTitleWarning : overlayTitleError,
                                                                fontSize: '1.1rem',
                                                                lineHeight: 1.6,
                                                                fontWeight: 500,
                                                                whiteSpace: 'pre-wrap',
                                                            }}
                                                        >
                                                            {String(err ?? '')}
                                                        </Typography>

                                                        {conformerErrorType !== 'network' && hasAnyConstraints && (
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    mt: 0.75,
                                                                    color: overlayTextSecondary,
                                                                    fontSize: '0.9rem',
                                                                    lineHeight: 1.5,
                                                                }}
                                                            >
                                                                This usually means the current secondary-structure constraints are too strict to satisfy. Try relaxing them (set more residues to "-"), then run 3D generation again.
                                                            </Typography>
                                                        )}

                                                        {!autoSync3D && showRetry && (
                                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                                                <Button variant="contained" size="small" onClick={handleManualGenerate3D}>
                                                                    Retry
                                                                </Button>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            })()}
                                        </Box>
                                    )}
                                    <HoverAwareViewer3D
                                        ref={viewer3DRef}
                                        pdbRawData={structurePDB}
                                        depictionData={depictionData}
                                        rowMonomerLists={rowMonomerLists}
                                        templateKey={scaffoldTemplate?.id ?? null}
                                        templatePdbRawData={(() => {
                                            const effective = isTemplateMode && (templateOverlayEnabledRaw == null ? !!scaffoldTemplate : !!templateOverlayEnabledRaw);
                                            if (!effective) return null;
                                            return scaffoldTemplate?.text || null;
                                        })()}
                                        templateVisible={(() => {
                                            const effective = isTemplateMode && (templateOverlayEnabledRaw == null ? !!scaffoldTemplate : !!templateOverlayEnabledRaw);
                                            return effective && !!scaffoldTemplate;
                                        })()}
                                        templateOpacity={Math.min(1, Math.max(0, (Number(templateOverlayOpacityPct) || 0) / 100))}
                                        templateMappings={isTemplateMode ? scaffoldMappings : []}
                                        handleMonomerHover={handleMonomerHover}
                                        defaultRepresentation={DEFAULT_3D_REPRESENTATION}
                                        defaultColorScheme={molstarColorBy}
                                        background={molstarBackground}
                                        height="100%"
                                        width="100%"
                                        error={generate3DError}
                                        isGenerating3D={structureLoading}
                                    />
                                </Box>

                                {/* Right: in-container panel (no page overlay) */}
                                {active3DPanel && (
                                    <>
                                        <Box
                                            role="separator"
                                            aria-orientation="vertical"
                                            aria-label="Resize 3D panel"
                                            onMouseDown={startDragMolstarRightPanel}
                                            sx={{
                                                width: 4,
                                                cursor: 'col-resize',
                                                alignSelf: 'stretch',
                                                bgcolor: 'divider',
                                                '&:hover': { bgcolor: 'text.secondary' },
                                            }}
                                        />

                                        <Box
                                            sx={{
                                                width: molstarRightPanelWidth,
                                                flex: '0 0 auto',
                                                pl: 0.75,
                                                pr: 0.25,
                                                py: 0.5,
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: 12, mb: 0.75 }}>
                                                {active3DPanel === 'representation'
                                                    ? 'Representation'
                                                    : active3DPanel === 'color'
                                                        ? 'Color by'
                                                        : active3DPanel === 'labels'
                                                            ? 'Labels'
                                                            : active3DPanel === 'background'
                                                                ? 'Background'
                                                                : active3DPanel === 'template'
                                                                    ? 'Template'
                                                                    : active3DPanel === 'log'
                                                                        ? 'Log'
                                                                        : 'View'}
                                            </Typography>
                                            <Divider sx={{ mb: 0.75 }} />

                                            {active3DPanel === 'representation' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {MolstarSchemes.representationSchemes.map((rep) => {
                                                        const checked = enabled3DRepresentations.includes(rep.id);
                                                        const opacityPct = typeof repOpacityPctById?.[rep.id] === 'number'
                                                            ? repOpacityPctById[rep.id]
                                                            : 100;

                                                        return (
                                                            <Box key={rep.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        gap: 1,
                                                                        minHeight: 20,
                                                                    }}
                                                                >
                                                                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.primary' }}>
                                                                        {rep.label}
                                                                    </Typography>

                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        <Switch
                                                                            size="small"
                                                                            checked={checked}
                                                                            onChange={(e) => {
                                                                                const nextChecked = e.target.checked;
                                                                                viewer3DRef.current?.setRepresentationEnabled?.(rep.id, nextChecked);
                                                                                setEnabled3DRepresentations((prev) => {
                                                                                    const arr = Array.isArray(prev) ? prev : [];
                                                                                    const has = arr.includes(rep.id);
                                                                                    if (nextChecked && has) return arr;
                                                                                    if (!nextChecked && !has) return arr;
                                                                                    if (nextChecked) return [...arr, rep.id];
                                                                                    return arr.filter((x) => x !== rep.id);
                                                                                });

                                                                                // Apply current opacity immediately when enabling.
                                                                                if (nextChecked) {
                                                                                    viewer3DRef.current?.setRepresentationAlphaFor?.(rep.id, opacityPct / 100);
                                                                                }
                                                                            }}
                                                                            inputProps={{ 'aria-label': `toggle representation ${rep.label}` }}
                                                                        />
                                                                    </Box>
                                                                </Box>

                                                                {checked && (
                                                                    <Box sx={{ px: 0.5, pr: 1.5 }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                                                            <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                                                Opacity
                                                                            </Typography>
                                                                            <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                                                {opacityPct}%
                                                                            </Typography>
                                                                        </Box>
                                                                        <Slider
                                                                            size="small"
                                                                            value={opacityPct}
                                                                            min={5}
                                                                            max={100}
                                                                            step={5}
                                                                            sx={{ width: 'calc(100% - 12px)', mx: 0.75 }}
                                                                            onChange={(_, v) => {
                                                                                const next = Array.isArray(v) ? v[0] : v;
                                                                                const pct = Math.min(100, Math.max(0, Number(next) || 0));
                                                                                setRepOpacityPctById((prev) => ({ ...prev, [rep.id]: pct }));
                                                                                viewer3DRef.current?.setRepresentationAlphaFor?.(rep.id, pct / 100);
                                                                            }}
                                                                            aria-label={`opacity ${rep.label}`}
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            )}

                                            {active3DPanel === 'labels' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {[
                                                        { key: 'element', label: 'Atom labels' },
                                                        { key: 'residue', label: 'Residue labels' },
                                                        { key: 'chain', label: 'Chain labels' },
                                                    ].map((row) => (
                                                        <Box
                                                            key={row.key}
                                                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 28 }}
                                                        >
                                                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                                                                {row.label}
                                                            </Typography>
                                                            <Switch
                                                                size="small"
                                                                checked={!!labelsEnabled[row.key]}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked;
                                                                    viewer3DRef.current?.setLabelEnabled?.(row.key, next);
                                                                    setLabelsEnabled((prev) => ({ ...prev, [row.key]: next }));
                                                                }}
                                                                inputProps={{ 'aria-label': `toggle ${row.key} labels` }}
                                                            />
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}

                                            {active3DPanel === 'color' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {MolstarSchemes.colorBySchemes.map((color) => (
                                                        <Button
                                                            key={color.id}
                                                            size="small"
                                                            variant="text"
                                                            color="inherit"
                                                            onClick={() => {
                                                                setMolstarColorBy(color.id);
                                                                viewer3DRef.current?.setColorScheme?.(color.id);
                                                            }}
                                                            sx={{
                                                                justifyContent: 'flex-start',
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                minHeight: 26,
                                                                px: 0.5,
                                                                color: 'text.primary',
                                                            }}
                                                            fullWidth
                                                        >
                                                            {color.label}
                                                        </Button>
                                                    ))}
                                                </Box>
                                            )}

                                            {active3DPanel === 'background' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        <Button
                                                            size="small"
                                                            variant={molstarBackground === 'light' ? 'contained' : 'text'}
                                                            color="inherit"
                                                            onClick={() => setMolstarBackground('light')}
                                                            sx={{
                                                                justifyContent: 'flex-start',
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                minHeight: 26,
                                                                px: 0.75,
                                                                color: 'text.primary',
                                                            }}
                                                        >
                                                            Light
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant={molstarBackground === 'dark' ? 'contained' : 'text'}
                                                            color="inherit"
                                                            onClick={() => setMolstarBackground('dark')}
                                                            sx={{
                                                                justifyContent: 'flex-start',
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                minHeight: 26,
                                                                px: 0.75,
                                                                color: 'text.primary',
                                                            }}
                                                        >
                                                            Dark
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            )}

                                            {active3DPanel === 'template' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontSize: 12, color: 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={scaffoldTemplate?.name || ''}
                                                        >
                                                            {scaffoldTemplate?.name ? scaffoldTemplate.name : 'No template'}
                                                        </Typography>

                                                        <span>
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                color="inherit"
                                                                onClick={() => handleClearScaffold()}
                                                                disabled={!scaffoldTemplate}
                                                                sx={{ textTransform: 'none', fontSize: 12, minHeight: 26, px: 0.75 }}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </span>
                                                    </Box>

                                                    <Box>
                                                        {/* Keep overlay controls on top */}
                                                        <Box
                                                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 28 }}
                                                        >
                                                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                                                                Template overlay
                                                            </Typography>
                                                            <Switch
                                                                size="small"
                                                                checked={(templateOverlayEnabledRaw == null ? !!scaffoldTemplate : !!templateOverlayEnabledRaw)}
                                                                onChange={(e) => {
                                                                    setTemplateOverlayEnabledRaw(!!e.target.checked);
                                                                }}
                                                                disabled={!scaffoldTemplate}
                                                                inputProps={{ 'aria-label': 'toggle template overlay' }}
                                                            />
                                                        </Box>

                                                        <Box sx={{ px: 0.5, pr: 1.5, mt: 0.25, mb: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                                                <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                                    Opacity
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                                                    {templateOverlayOpacityPct}%
                                                                </Typography>
                                                            </Box>
                                                            <Slider
                                                                size="small"
                                                                value={templateOverlayOpacityPct}
                                                                min={5}
                                                                max={60}
                                                                step={5}
                                                                sx={{ width: 'calc(100% - 12px)', mx: 0.75 }}
                                                                onChange={(_, v) => {
                                                                    const next = Array.isArray(v) ? v[0] : v;
                                                                    const pct = Math.min(60, Math.max(5, Number(next) || 25));
                                                                    setTemplateOverlayOpacityPct(pct);
                                                                }}
                                                                disabled={!scaffoldTemplate}
                                                                aria-label="template opacity"
                                                            />
                                                        </Box>

                                                        <Divider sx={{ my: 0.75 }} />

                                                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: 12, mb: 2.0 }}>
                                                            Mapping
                                                        </Typography>

                                                        {/* Mapping editor (all designed chains) */}
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {(() => {
                                                                const chains = scaffoldTemplate?.chainData ?? [];
                                                                const chainOptions = (chains.length ? chains : (scaffoldTemplate?.chains || [])).map((c) =>
                                                                    typeof c === 'string' ? c : c?.id
                                                                ).filter(Boolean);

                                                                const commonFieldSx = {
                                                                    '& .MuiInputLabel-root': { fontSize: 12 },
                                                                    '& .MuiInputBase-input': { fontSize: 12 },
                                                                    '& .MuiSelect-select': { fontSize: 12 },
                                                                    '& .MuiInputBase-root': { height: 26 },
                                                                    '& .MuiInputBase-input, & .MuiSelect-select': { py: '6px' },
                                                                };

                                                                const designedChainCount = Array.isArray(rowMonomerLists) ? rowMonomerLists.length : 0;
                                                                const indices = Array.from({ length: designedChainCount }, (_, i) => i);

                                                                if (!indices.length) {
                                                                    return (
                                                                        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                                            No designed chains.
                                                                        </Typography>
                                                                    );
                                                                }

                                                                return indices.map((idx) => {
                                                                    const mapping = scaffoldMappings?.[idx] || {};
                                                                    const enabled = mapping?.enabled === true;
                                                                    const templateToggleDisabled = false;

                                                                    return (
                                                                        <Box
                                                                            key={idx}
                                                                            sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}
                                                                        >
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minHeight: 24 }}>
                                                                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: 12 }}>
                                                                                    Chain {seqLabel(idx)}
                                                                                </Typography>
                                                                                <Switch
                                                                                    size="small"
                                                                                    checked={enabled}
                                                                                    onChange={(e) => {
                                                                                        const nextEnabled = !!e.target.checked;
                                                                                        handleEditScaffoldMappingNoAutoGen(idx, { enabled: nextEnabled });
                                                                                    }}
                                                                                    disabled={!scaffoldTemplate || templateToggleDisabled}
                                                                                    inputProps={{ 'aria-label': `toggle template mapping for chain ${seqLabel(idx)}` }}
                                                                                />
                                                                            </Box>

                                                                            <TextField
                                                                                select
                                                                                size="small"
                                                                                label="PDB chain"
                                                                                value={mapping.chainId ?? ''}
                                                                                onChange={(e) => handleEditScaffoldMappingNoAutoGen(idx, { chainId: e.target.value || null })}
                                                                                disabled={!scaffoldTemplate}
                                                                                sx={commonFieldSx}
                                                                            >
                                                                                {chainOptions.length ? (
                                                                                    chainOptions.map((id) => (
                                                                                        <MenuItem key={id} value={id} sx={{ fontSize: 12 }}>
                                                                                            {id}
                                                                                        </MenuItem>
                                                                                    ))
                                                                                ) : (
                                                                                    <MenuItem value="" disabled sx={{ fontSize: 12 }}>
                                                                                        No chains
                                                                                    </MenuItem>
                                                                                )}
                                                                            </TextField>

                                                                            <TextField
                                                                                size="small"
                                                                                label="Start residue"
                                                                                type="number"
                                                                                value={mapping.start ?? ''}
                                                                                slotProps={{ htmlInput: { min: 1 } }}
                                                                                onChange={(e) => handleEditScaffoldMappingNoAutoGen(idx, { start: e.target.value ? Number(e.target.value) : null })}
                                                                                disabled={!scaffoldTemplate}
                                                                                sx={commonFieldSx}
                                                                            />

                                                                            <TextField
                                                                                size="small"
                                                                                label="End residue"
                                                                                type="number"
                                                                                value={mapping.end ?? ''}
                                                                                onChange={(e) => handleEditScaffoldMappingNoAutoGen(idx, { end: e.target.value ? Number(e.target.value) : null })}
                                                                                disabled={!scaffoldTemplate}
                                                                                sx={commonFieldSx}
                                                                            />

                                                                            <TextField
                                                                                size="small"
                                                                                label="Offset"
                                                                                type="number"
                                                                                value={mapping.offset ?? 0}
                                                                                slotProps={{ htmlInput: { min: 0 } }}
                                                                                onChange={(e) => handleEditScaffoldMappingNoAutoGen(idx, { offset: Number(e.target.value) || 0 })}
                                                                                disabled={!scaffoldTemplate}
                                                                                sx={commonFieldSx}
                                                                            />
                                                                        </Box>
                                                                    );
                                                                });
                                                            })()}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}

                                            {active3DPanel === 'view' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {MolstarSchemes.resetViewScheme.map((reset) => (
                                                        <Button
                                                            key={reset.id}
                                                            size="small"
                                                            variant="text"
                                                            color="inherit"
                                                            onClick={() => {
                                                                if (reset.id === 'reset-zoom') viewer3DRef.current?.resetZoom?.();
                                                                else if (reset.id === 'orient-axes') viewer3DRef.current?.orientAxes?.();
                                                                else if (reset.id === 'reset-axes') viewer3DRef.current?.resetAxes?.();
                                                            }}
                                                            sx={{
                                                                justifyContent: 'flex-start',
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                minHeight: 26,
                                                                px: 0.5,
                                                                color: 'text.primary',
                                                            }}
                                                            fullWidth
                                                        >
                                                            {reset.label}
                                                        </Button>
                                                    ))}
                                                </Box>
                                            )}

                                            {active3DPanel === 'log' && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                    {Array.isArray(conformerProgressLog) && conformerProgressLog.length > 0 ? (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                                            {conformerProgressLog.map((row, idx) => {
                                                                const ts = typeof row?.ts === 'number' ? row.ts : null;
                                                                const time = ts
                                                                    ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                                    : '';
                                                                const msg = row?.message ? String(row.message) : '';
                                                                return (
                                                                    <Typography
                                                                        key={`${ts || 't'}:${idx}`}
                                                                        variant="caption"
                                                                        sx={{
                                                                            color: 'text.secondary',
                                                                            fontFamily: 'monospace',
                                                                            fontSize: 11,
                                                                            lineHeight: 1.25,
                                                                            whiteSpace: 'pre-wrap',
                                                                            wordBreak: 'break-word',
                                                                        }}
                                                                    >
                                                                        {time ? `[${time}] ` : ''}{msg}
                                                                    </Typography>
                                                                );
                                                            })}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                            No progress yet.
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Paper>
                    </Box>

                </Box>
            </Box>

            {/* Snackbar alert when BILN exceeds the maximum allowed length */}
            {/* NEW: modal alert */}
            <Dialog
                open={limitDialog.open}
                onClose={() => setLimitDialog({ open: false, message: '' })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Monomer limit reached</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary">
                        {limitDialog.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setLimitDialog({ open: false, message: '' })}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>



    );
};

const HoverAwareViewer2D = forwardRef(function HoverAwareViewer2D(props, ref) {
    const hoveredMonomer = useHoveredMonomer();
    return (
        <Viewer2D
            {...props}
            ref={ref}
            hoveredMonomer={hoveredMonomer}
        />
    );
});

const HoverAwareViewer3D = forwardRef(function HoverAwareViewer3D(props, ref) {
    const { depictionData, rowMonomerLists, ...rest } = props;
    const hoveredMonomer = useHoveredMonomer();

    const monomerNameByResIdx = useMemo(() => {
        const map = new Map();
        const arr = Array.isArray(depictionData?.monomers) ? depictionData.monomers : [];
        for (const m of arr) {
            const key = m?.['res-idx'];
            if (!key) continue;
            map.set(String(key), m?.pdbName);
        }
        return map;
    }, [depictionData?.monomers]);

    const hoveredMonomerLabel = useMemo(() => {
        if (!hoveredMonomer) return '';
        const raw = String(hoveredMonomer);
        const parts = raw.split('-');
        const idx = parts?.[1] != null ? parseInt(parts[1], 10) : NaN;
        const seq = Number.isFinite(idx) ? (idx + 1) : NaN;

        // `res-idx` is shaped like "<symbol>-<globalIdx>" (e.g. A-0, C-1),
        // so parts[0] is NOT the chain id. Derive the chain label from the
        // sequence index in rowMonomerLists.
        let chain = '';
        if (Number.isFinite(idx)) {
            const rows = Array.isArray(rowMonomerLists) ? rowMonomerLists : [];
            let acc = 0;
            for (let si = 0; si < rows.length; si++) {
                const len = Array.isArray(rows[si]) ? rows[si].length : 0;
                if (idx >= acc && idx < acc + len) {
                    let x = si;
                    let out = '';
                    while (x >= 0) {
                        out = String.fromCharCode(65 + (x % 26)) + out;
                        x = Math.floor(x / 26) - 1;
                    }
                    chain = out;
                    break;
                }
                acc += len;
            }
        }

        if (!chain) chain = parts?.[0] ? String(parts[0]) : '';
        const name = monomerNameByResIdx.get(raw);
        if (!chain || !Number.isFinite(seq)) return '';
        if (name) return `${chain} ${String(name).toUpperCase()} ${seq}`;
        return `${chain} ${seq}`;
    }, [hoveredMonomer, monomerNameByResIdx, rowMonomerLists]);

    return (
        <Viewer3D
            {...rest}
            ref={ref}
            hoveredMonomer={hoveredMonomer}
            hoveredMonomerLabel={hoveredMonomerLabel}
        />
    );
});

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);
