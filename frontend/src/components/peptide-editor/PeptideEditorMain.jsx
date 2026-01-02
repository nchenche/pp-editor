import { useCallback, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPortal } from '../../components/common/OverlayPortalContext';

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

import { Box, Paper, Typography, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Slider from '@mui/material/Slider';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import LabelIcon from '@mui/icons-material/Label';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DownloadIcon from '@mui/icons-material/Download';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const initBiln = 'P-E-P-T-C(1,3)-I-D-E.A-G-V-I-C(1,3)';  //  A-C-K-A-C
const MAX_MONOMERS = 40;
const MOLSTAR_BG_STORAGE_KEY = 'pp-editor:molstar-background:v1';

const MOLSTAR_TEMPLATE_OVERLAY_STORAGE_KEY = 'pp-editor:molstar-template-overlay:v1';
const MOLSTAR_TEMPLATE_OPACITY_STORAGE_KEY = 'pp-editor:molstar-template-opacity:v1';
const AUTO_SYNC_3D_STORAGE_KEY = 'pp-editor:auto-sync-3d:v1';
const ACTIVE_3D_PANEL_STORAGE_KEY = 'pp-editor:active-3d-panel:v1';
const CONSTRAINT_MODE_STORAGE_KEY = 'pp-editor:constraints-mode:v1';

const DEFAULT_3D_REPRESENTATION = 'line';


const PeptideEditorMainInner = ({ isActive, onOutputChange, uiState, setUiState, onBeginReplaceSelection, onCancelReplaceSelection }, ref) => {

    // console.log('PeptideEditorMain rendered');

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
            return 'ss';
        } catch {
            return 'ss';
        }
    });

    const theme = useTheme();

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

    const [enabled3DRepresentations, setEnabled3DRepresentations] = useState(() => [DEFAULT_3D_REPRESENTATION]);
    const [labelsEnabled, setLabelsEnabled] = useState({ element: false, residue: false, chain: false });
    const [repOpacityPctById, setRepOpacityPctById] = useState({});

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

    const [phValue, setPhValue] = useState(7.4);
    const [constraintsBySeq, setConstraintsBySeq] = useState(() => initialConstraints);

    const EMPTY_ARRAY = Object.freeze([]);
    const { svg: svgDepiction = '', smiles = '', helm = '', sdf = '', monomers = EMPTY_ARRAY } = depictionData ?? {};
    const structurePDB = structureOutput?.pdb || structureOutput?.PDB || '';

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
            const biln = String(e?.detail?.biln || '').trim();
            const pdb = String(e?.detail?.pdb || '').trim();
            if (!biln) return;
            suppressNextAutoConformerGenRef.current = true;
            suppressAutoConformerForBilnRef.current = normalizeBilnForGen(biln);
            suppressAutoConformerAfterResumeRef.current = true;
            setBilnValue(biln);

            // If the job list already has the result, load it immediately (no compute, no polling needed).
            if (pdb) {
                setStructureOutput({ pdb });
            }
        };
        window.addEventListener(CONFORMER_JOB_RESUME_EVENT, onResume);
        return () => window.removeEventListener(CONFORMER_JOB_RESUME_EVENT, onResume);
    }, [setBilnValue, normalizeBilnForGen]);

    // Viewer refs and states
    const viewer2DRef = useRef(null);
    const [viewer2DModes, setViewer2DModes] = useState({ linkMode: false, bondsMode: false });
    const viewer3DRef = useRef(null);

    // Ensure the representation menu initial state matches the viewer.
    // (Useful after changing DEFAULT_3D_REPRESENTATION, and avoids HMR stale state.)
    useEffect(() => {
        setEnabled3DRepresentations([DEFAULT_3D_REPRESENTATION]);
        viewer3DRef.current?.setRepresentation?.(DEFAULT_3D_REPRESENTATION);
    }, []);

    const viewer2DColRef = useRef(null);

    const was3DPanelOpenRef = useRef(false);
    const splitRatioBefore3DPanelRef = useRef(null);

    const canLink = !!svgDepiction && !viewer2DModes.bondsMode;
    const canCut = !!svgDepiction && !viewer2DModes.linkMode && viewer2DModes?.canCut !== false;

    const [isShowingAtomIndices, setIsShowingAtomIndices] = useState(false);
    const [hoveredMonomer, setHoveredMonomer] = useState('');
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
    } = useBilnHandlers({
        bilnValue,
        setBilnValue: trySetBilnValue,
        monomers,
        rowMonomerLists,
        linkMap,
        uiState,
        setUiState,
        setIsDragging,
        setHoveredMonomer
    });
    const { handleMonomerEnter, handleMonomerLeave, handleMonomerHover } = useUIHandlers({ monomers, setHoveredMonomer, isDragging });


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
        }
    }, [scaffoldTemplateId]);

    // If the user removes a template during this session, automatically fall back
    // to Secondary Structure mode to avoid being "stuck" in template mode.
    useEffect(() => {
        if (scaffoldTemplateId) {
            hadTemplateRef.current = true;
            return;
        }
        if (!scaffoldTemplateId && hadTemplateRef.current && constraintMode === 'template') {
            setConstraintMode('ss');
        }
    }, [scaffoldTemplateId, constraintMode]);

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

    const canGenerate3D = useMemo(() => {
        if (!committedBiln) return false;
        const { tokenCount } = analyzeBiln(committedBiln);
        return tokenCount > 0 && secstructString.length === tokenCount;
    }, [committedBiln, secstructString]);

    // Debounced generate3D trigger and last sent guard
    const lastGenRef = useRef({
        biln: null,
        ss: null,
        useTemplate: null,
        mappingSig: null,
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
                lastGenRef.current = { biln, ss, useTemplate, mappingSig };
                return;
            }

            const prev = lastGenRef.current;

            if (
                prev.biln === biln &&
                prev.ss === ss &&
                prev.useTemplate === useTemplate &&
                prev.mappingSig === mappingSig
            ) {
                return;
            }

            if (useTemplate && hasTemplateOverlap()) {
                setTemplateOverlapOpen(true);
                return;
            }

            lastGenRef.current = { biln, ss, useTemplate, mappingSig };

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
                generate3D(biln, constraintsBySeq, { requestParams });
            }
        },
        // FIX deps: structureOutput wasn’t used; constraintsBySeq + structurePDB are the relevant ones
        [generate3D, effectiveAnyScaffoldEnabled, scaffoldMappingPayload, hasTemplateOverlap, constraintsBySeq, phValue, normalizeBilnForGen],
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
        lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null };

        // User explicitly asked to compute: do not keep "resume suppression" active.
        suppressAutoConformerForBilnRef.current = null;
        suppressNextAutoConformerGenRef.current = false;
        suppressAutoConformerAfterResumeRef.current = false;

        triggerGenerate(committedBiln, secstructString);
    }, [isActive, canGenerate3D, committedBiln, secstructString, triggerGenerate]);

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
            lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null };

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
            return;
        }
        loadData(committedBiln);
    }, [committedBiln, isActive, isShowingAtomIndices, phValue]);

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

        triggerGenerate(committedBiln, secstructString);
    }, [isActive, committedBiln, autoSync3D, canGenerate3D, triggerGenerate, secstructString, normalizeBilnForGen]);

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
        const count = deriveSeqCount(committedBiln);
        setUiState(prev => {
            const nextIdx = reconcileActiveSeqIdx(prev.activeSeqIdx, count);
            if (prev.seqNumber === count && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: count, activeSeqIdx: nextIdx };
        });
    }, [committedBiln, setUiState]);

    function handleBilnChange(newBiln) {
        trySetBilnValue(newBiln);
    }

    const clearData = useCallback(() => {
        // Reset UI state expectations
        setAutoSync3DRaw(true);          // requested behavior: reset auto-sync to true
        setTemplateOverlapOpen(false);

        // Clear editor + derived committed state
        setBilnValue('');
        setCommittedBiln('');

        suppressAutoConformerAfterResumeRef.current = false;

        // Clear outputs
        setDepictionData({ svg: '', monomers: [], smiles: '', helm: '' });
        setStructureOutput({ pdb: '' });

        // Reset “last generated” guard so next paste triggers generation normally
        lastGenRef.current = { biln: null, ss: null, useTemplate: null, mappingSig: null };

        // Clear scaffold (also makes autoSync3D = true again because effectiveAnyScaffoldEnabled becomes false)
        handleClearScaffold();
    }, [
        setAutoSync3DRaw,
        setTemplateOverlapOpen,
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

    // Keep the *3D canvas* width stable when the 3D side panel opens.
    // We do this by shifting space from the 2D pane (adjusting viewerSplitRatio).
    useLayoutEffect(() => {
        const isOpen = !!active3DPanel;

        // Only act on open/close transitions (not when switching between panel sections)
        const wasOpen = was3DPanelOpenRef.current;
        if (isOpen === wasOpen) {
            // Still ensure Mol* resizes correctly when switching panel content
            const raf = requestAnimationFrame(() => {
                try { viewer3DRef.current?.resize?.(); } catch { }
            });
            return () => cancelAnimationFrame(raf);
        }

        const panelWidthPx = 260;
        const panelGapPx = Number.parseFloat(theme.spacing(1)) || 8;
        const deltaPx = panelWidthPx + panelGapPx;
        const minViewerPanelWidth = 200;

        if (isOpen) {
            splitRatioBefore3DPanelRef.current = viewerSplitRatio;

            const rowRect = viewerRowRef.current?.getBoundingClientRect?.();
            const leftRect = viewer2DColRef.current?.getBoundingClientRect?.();

            if (rowRect?.width && leftRect?.width) {
                const nextLeftPx = Math.min(
                    Math.max(leftRect.width - deltaPx, minViewerPanelWidth),
                    rowRect.width - minViewerPanelWidth,
                );
                setViewerSplitRatio(nextLeftPx / rowRect.width);
            }
        } else {
            const prev = splitRatioBefore3DPanelRef.current;
            if (typeof prev === 'number' && Number.isFinite(prev)) {
                setViewerSplitRatio(prev);
            }
            splitRatioBefore3DPanelRef.current = null;
        }

        was3DPanelOpenRef.current = isOpen;

        const raf = requestAnimationFrame(() => {
            try { viewer3DRef.current?.resize?.(); } catch { }
        });
        return () => cancelAnimationFrame(raf);
    }, [active3DPanel, setViewerSplitRatio, theme, viewerSplitRatio, viewerRowRef]);


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
                <Box sx={{ height: editorAreaHeight, minHeight: 160, overflow: 'hidden' }}>
                    {/* Top: Biln editor (no collapse) */}
                    <BilnEditorInterface
                        biln={bilnValue}
                        maxMonomers={MAX_MONOMERS}
                        isAtMonomerLimit={isAtMonomerLimit}
                        onChangeBiln={handleBilnChange}
                        hoveredResidueIdx={hoveredMonomer ? hoveredMonomer['res-idx'] : null}
                        isDragging={isDragging}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={handleUndoBiln}
                        onRedo={handleRedoBiln}
                        onClear={clearData}
                        // Chains section props
                        rowMonomerLists={rowMonomerLists}
                        activeSeqIdx={uiState.activeSeqIdx}
                        onSetActiveSeqIdx={onSetActiveSeqIdx}
                        linkMap={linkMap}
                        hoveredMonomer={hoveredMonomer}
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
                            if (next === 'template' && !scaffoldTemplate) return;
                            setConstraintMode(next);
                        }}
                        canUseTemplateMode={!!scaffoldTemplate}
                        // Toolbar (link/cut) wiring
                        linkMode={viewer2DModes.linkMode}
                        bondsMode={viewer2DModes.bondsMode}
                        onToggleLinkMode={() => viewer2DRef.current?.setLinkMode(!viewer2DModes.linkMode)}
                        onToggleCutMode={() => viewer2DRef.current?.setBondsMode(!viewer2DModes.bondsMode)}
                        canLink={canLink}
                        canUnlink={canCut}
                        // Global scaffold props
                        scaffoldTemplate={scaffoldTemplate}
                        onUploadScaffoldFile={uploadScaffoldFile}
                        onFetchScaffoldById={fetchScaffoldById}
                        onClearScaffold={handleClearScaffold}
                        scaffoldMappings={scaffoldMappings}
                        onEditScaffoldMapping={handleEditScaffoldMappingNoAutoGen}
                    />
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
                        }}
                    >
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
                                <Viewer2D
                                    ref={viewer2DRef}
                                    svgData={svgDepiction}
                                    isShowingAtomIndices={isShowingAtomIndices}
                                    handleShowingAtomIndices={setIsShowingAtomIndices}
                                    hoveredMonomer={hoveredMonomer}
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
                            bgcolor: 'divider',
                            alignSelf: 'stretch',
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
                                                    if (isConformerTerminalFailedOrCanceled) return handleManualGenerate3D;
                                                    return handleManualGenerate3D;
                                                })()}
                                                disabled={(() => {
                                                    // In auto-sync, keep this button non-actionable unless it cancels.
                                                    if (autoSync3D) return !isConformerQueuedOrRunning;
                                                    if (isConformerQueuedOrRunning) return !!isCancelingConformerJob;
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
                                                            ? "Retry"
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
                            <Box sx={{ flex: 1, minHeight: 220, width: '100%', minWidth: 0, overflow: 'hidden', display: 'flex', gap: 1 }}>
                                {/* Left: 3D canvas area */}
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
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: 'background.paper',
                                                zIndex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 2,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {(() => {
                                                const err = generate3DError;
                                                const hasTemplateMapping = !!effectiveAnyScaffoldEnabled;
                                                const hasAnyConstraints = Array.isArray(constraintsBySeq) && constraintsBySeq.some(
                                                    (row) => Array.isArray(row) && row.some((ch) => {
                                                        const v = String(ch ?? '').trim();
                                                        return v && v !== '-';
                                                    }),
                                                );

                                                const showRetry = !autoSync3D && (isConformerTerminalFailedOrCanceled || !!err);

                                                if (!err) {
                                                    if (conformerJobState === 'canceled') {
                                                        return (
                                                            <Box>
                                                                <Typography
                                                                    variant="body1"
                                                                    sx={{
                                                                        color: 'warning.main',
                                                                        fontSize: '1.1rem',
                                                                        lineHeight: 1.75,
                                                                        fontWeight: 500,
                                                                    }}
                                                                >
                                                                    Canceled.
                                                                </Typography>
                                                                {!autoSync3D && (
                                                                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                                                        <Button variant="contained" size="small" onClick={handleManualGenerate3D}>
                                                                            Retry
                                                                        </Button>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        );
                                                    }

                                                    return (
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                color: 'text.secondary',
                                                                fontSize: '1.1rem',
                                                                lineHeight: 1.75,
                                                                fontWeight: 400,
                                                            }}
                                                        >
                                                            No data to display.
                                                        </Typography>
                                                    );
                                                }

                                                if (!hasTemplateMapping && hasAnyConstraints && typeof err === 'string' && err.trim()) {
                                                    return (
                                                        <Box>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{
                                                                    color: 'warning.main',
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
                                                                    color: 'text.secondary',
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
                                                                    color: 'warning.main',
                                                                    fontSize: '1.1rem',
                                                                    lineHeight: 1.75,
                                                                    fontWeight: 500,
                                                                    whiteSpace: 'pre-wrap',
                                                                }}
                                                            >
                                                                {err}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    mt: 0.75,
                                                                    color: 'text.secondary',
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
                                                                            color: 'text.primary',
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
                                                                            'Relax topologic constraints in your designed peptide',
                                                                            'Mask out certain residues of the template',
                                                                            'Modify the template residue mapping (start/end, offset)',
                                                                            'Retry with reduced template guidance if needed',
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
                                                                                <Box
                                                                                    sx={{
                                                                                        mt: '0.55em',
                                                                                        width: 8,
                                                                                        height: 2,
                                                                                        borderRadius: 1,
                                                                                        bgcolor: 'text.secondary',
                                                                                        flex: '0 0 auto',
                                                                                    }}
                                                                                />
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{
                                                                                        color: 'text.secondary',
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
                                                                    <Button variant="contained" size="small" onClick={handleManualGenerate3D}>
                                                                        Retry
                                                                    </Button>
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
                                                                color: conformerErrorType === 'network' ? 'warning.main' : 'error.main',
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
                                                                    color: 'text.secondary',
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
                                    <Viewer3D
                                        ref={viewer3DRef}
                                        pdbRawData={structurePDB}
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
                                        hoveredMonomer={hoveredMonomer}
                                        handleMonomerHover={handleMonomerHover}
                                        defaultRepresentation={DEFAULT_3D_REPRESENTATION}
                                        defaultColorScheme="element-symbol"
                                        background={molstarBackground}
                                        height="100%"
                                        width="100%"
                                        error={generate3DError}
                                        isGenerating3D={structureLoading}
                                    />
                                </Box>

                                {/* Right: in-container panel (no page overlay) */}
                                {active3DPanel && (
                                    <Box
                                        sx={{
                                            width: 220,
                                            flex: '0 0 auto',
                                            borderLeft: 1,
                                            borderColor: 'divider',
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
                                                        onClick={() => viewer3DRef.current?.setColorScheme?.(color.id)}
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

export const PeptideEditorMain = forwardRef(PeptideEditorMainInner);
