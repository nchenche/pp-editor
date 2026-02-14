import { memo, useEffect, useImperativeHandle, forwardRef, useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import usePanZoom from '../../../hooks/usePanZoom';

import { API_URL } from '../../../config';
import { apiFetch } from '../../../utils/api';

const PREVIEW_DEBOUNCE_MS = 400;

/**
 * TabStepStereo – Stereochemistry confirmation step.
 *
 * After the user fills in monomer metadata (TabStep4) and clicks Next,
 * this step:
 *  1. Calls POST /api/molecules/stereo/analyze  → SVG + chiral centers list
 *  2. Shows the SVG with highlighted stereo centers
 *  3. Lets the user confirm/override R/S per center
 *
 * The parent wizard reads the stereo mapping via ref.getStereoMap()
 * before moving to the next (Validate) step.
 */
const TabStepStereo = memo(
  forwardRef(({ smiles, form, savedStereoMap, onStereoMapChange }, ref) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [svg, setSvg] = useState('');
    const [centers, setCenters] = useState([]);
    const [stereoMap, setStereoMap] = useState({});
    const [previewing, setPreviewing] = useState(false);

    const previewTimerRef = useRef(null);
    const abortRef = useRef(null);
    const svgContainerRef = useRef(null);
    const panZoomApiRef = useRef(null);
    const enlargedSvgRef = useRef(null);
    const enlargedPanZoomApiRef = useRef(null);
    const [enlargedOpen, setEnlargedOpen] = useState(false);
    const [enlargedEnteredTick, setEnlargedEnteredTick] = useState(0);

    // Pan-zoom on inline SVG
    usePanZoom(svgContainerRef, [svg], panZoomApiRef);
    // Pan-zoom on enlarged dialog SVG
    // Note: Dialog content is rendered in a portal + transition, so the ref/SVG
    // may not be present on the first effect tick when opening. We bump a tick
    // on transition "entered" to ensure we bind to the final DOM node.
    usePanZoom(enlargedSvgRef, [svg, enlargedOpen, enlargedEnteredTick], enlargedPanZoomApiRef);

    // Notify parent whenever stereoMap changes
    const updateStereoMap = useCallback(
      (next) => {
        setStereoMap(next);
        onStereoMapChange?.(next);
      },
      [onStereoMapChange],
    );

    // ---- Fetch stereo analysis when step mounts or inputs change ----
    const hasSaved = savedStereoMap && Object.keys(savedStereoMap).length > 0;

    const fetchAnalysis = useCallback(async () => {
      if (!smiles) return;
      setLoading(true);
      setError(null);
      setSvg('');
      setCenters([]);

      try {
        // If the user already made selections, use preview to get the
        // SVG that reflects those choices; otherwise do a fresh analyze.
        const endpoint = hasSaved
          ? `${API_URL}/molecules/stereo/preview`
          : `${API_URL}/molecules/stereo/analyze`;

        const body = hasSaved
          ? { smiles, form, stereo: savedStereoMap }
          : { smiles, form };

        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || `Server returned ${res.status}`);
        }

        const data = json?.data || {};
        setSvg(data.svg || '');
        const ctrs = Array.isArray(data.centers) ? data.centers : [];
        setCenters(ctrs);

        if (hasSaved) {
          // Restore user's previous selections
          setStereoMap({ ...savedStereoMap });
        } else {
          // Pre-fill stereo map from server CIP
          const initial = {};
          for (const c of ctrs) {
            initial[String(c.atom_idx)] = c.cip || 'R';
          }
          updateStereoMap(initial);
        }
      } catch (err) {
        setError(err.message || 'Failed to analyze stereochemistry.');
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smiles, form]);

    useEffect(() => {
      fetchAnalysis();
    }, [fetchAnalysis]);

    // ---- Debounced live preview when stereoMap changes ----
    const fetchPreview = useCallback(
      async (nextMap) => {
        if (!smiles || Object.keys(nextMap).length === 0) return;

        // Abort any in-flight preview request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPreviewing(true);
        try {
          const res = await apiFetch(`${API_URL}/molecules/stereo/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles, form, stereo: nextMap }),
            signal: controller.signal,
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) {
            // Silently ignore preview errors — the initial SVG stays
            console.warn('stereo/preview error:', json?.error);
            return;
          }
          const data = json?.data || {};
          if (data.svg) setSvg(data.svg);
          if (Array.isArray(data.centers)) setCenters(data.centers);
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('stereo/preview failed:', err.message);
          }
        } finally {
          setPreviewing(false);
        }
      },
      [smiles, form],
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        clearTimeout(previewTimerRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    }, []);

    // ---- Expose API to parent wizard ----
    useImperativeHandle(
      ref,
      () => ({
        /** Return the user's stereo selections */
        getStereoMap: () => ({ ...stereoMap }),
        /** Whether any centers were detected */
        hasCenters: () => centers.length > 0,
        /** Whether the step is still loading */
        isLoading: () => loading,
      }),
      [stereoMap, centers, loading],
    );

    // ---- Handler for CIP dropdown change ----
    const handleCipChange = useCallback(
      (atomIdx, value) => {
        const next = { ...stereoMap, [String(atomIdx)]: value };
        updateStereoMap(next);

        // Schedule a debounced preview refresh
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = setTimeout(() => fetchPreview(next), PREVIEW_DEBOUNCE_MS);
      },
      [stereoMap, updateStereoMap, fetchPreview],
    );

    // ---- Render ----
    if (loading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 6 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Analyzing stereochemistry on capped molecule…
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    if (centers.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <ScienceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No chiral centers detected — you can proceed to the next step.
          </Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          alignItems: 'flex-start',
          justifyContent: { xs: 'center', md: 'space-between' },
        }}
      >
        {/* Left: SVG preview with pan-zoom */}
        <Box
          sx={{
            flex: '1 1 420px',
            minWidth: 300,
            maxWidth: { xs: '100%', md: '55%' },
            position: 'relative',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
            overflow: 'hidden',
          }}
        >
          {/* Enlarge + preview spinner */}
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'flex', gap: 0.5 }}>
            {previewing && (
              <CircularProgress size={20} sx={{ opacity: 0.6, mt: 0.3 }} />
            )}
            <Tooltip title="Enlarge view">
              <span>
                <IconButton
                  size="small"
                  onClick={() => setEnlargedOpen(true)}
                  disabled={!svg}
                  sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {svg ? (
            <Box
              ref={svgContainerRef}
              sx={{
                width: '100%',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                // Pan/zoom relies on the root <svg> receiving pointer events.
                // Some depictions don't include a full-size background rect,
                // and/or may disable pointer events on child paths.
                '& svg': {
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  pointerEvents: 'all',
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                },
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <Box sx={{ width: '100%', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
              <Typography variant="body2" color="text.disabled">
                No SVG preview available.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Enlarged SVG dialog */}
        {enlargedOpen && (
          <Dialog
            open={enlargedOpen}
            onClose={() => setEnlargedOpen(false)}
            fullWidth
            maxWidth="lg"
            TransitionProps={{
              onEntered: () => setEnlargedEnteredTick((t) => t + 1),
            }}
          >
            <DialogTitle sx={{ pr: 6 }}>
              Enlarged view
              <IconButton
                aria-label="close"
                onClick={() => setEnlargedOpen(false)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
                <Box
                  ref={enlargedSvgRef}
                  sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.default',
                    '& svg': {
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      pointerEvents: 'all',
                      cursor: 'grab',
                      touchAction: 'none',
                      userSelect: 'none',
                    },
                  }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </Box>
            </DialogContent>
          </Dialog>
        )}

        {/* Right: stereo form */}
        <Box
          sx={{
            flex: '1 1 300px',
            minWidth: 260,
            maxWidth: { xs: '100%', md: '42%' },
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Chiral centers
            <Chip
              label={`${centers.length} found`}
              size="small"
              color="warning"
              sx={{ ml: 1, fontWeight: 600 }}
            />
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review the CIP assignment for each chiral atom. The server computed these
            on the <strong>capped</strong> molecule. You may override R / S below.
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Atom index</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CIP (R/S)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {centers.map((c) => (
                  <TableRow key={c.atom_idx}>
                    <TableCell>
                      <Chip
                        label={c.atom_idx}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, minWidth: 36, justifyContent: 'center' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={stereoMap[String(c.atom_idx)] || 'R'}
                        onChange={(e) => handleCipChange(c.atom_idx, e.target.value)}
                        sx={{ minWidth: 80 }}
                      >
                        <MenuItem value="R">R</MenuItem>
                        <MenuItem value="S">S</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    );
  }),
);

TabStepStereo.displayName = 'TabStepStereo';
export default TabStepStereo;
