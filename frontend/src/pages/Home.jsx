import { useCallback, useRef, useState, forwardRef, startTransition } from 'react';

import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { ConfirmProvider, useConfirm } from '../components/common/ConfirmDialogProvider';

import { DesignPageLayoutMUI, useSidebarCollapse } from '../layouts/DesignPageLayout';
import { PeptideEditorMain } from '../components/peptide-editor/PeptideEditorMain';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';
import { OutputContainer } from '../components/output/OutputContainer';
import { ConformerJobsPanel } from '../components/output/ConformerJobsPanel';

function SidebarTabbedPanel({
  tabIndex,
  onTabChange,
  handleAddingMonomer,
  uiState,
  setUiState,
  replaceSelection,
  outputData,
}) {
  const { setSidebarCollapsed } = useSidebarCollapse();

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
    >
      {/* Content area (left) */}
      <Box sx={{ flex: 1, width: 0, minWidth: 0, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Box
          role="tabpanel"
          sx={{
            display: tabIndex === 0 ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
          aria-hidden={tabIndex !== 0}
        >
          <MonomerLibraryContainer
            filterValue=""
            handleAddingMonomer={handleAddingMonomer}
            uiState={uiState}
            setUiState={setUiState}
            replaceSelection={replaceSelection}
          />
        </Box>

        <Box
          role="tabpanel"
          sx={{
            display: tabIndex === 1 ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
          aria-hidden={tabIndex !== 1}
        >
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <OutputContainer outputData={outputData} />
          </Box>
        </Box>

        <Box
          role="tabpanel"
          sx={{
            display: tabIndex === 2 ? 'flex' : 'none',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
          aria-hidden={tabIndex !== 2}
        >
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <ConformerJobsPanel />
          </Box>
        </Box>
      </Box>

      {/* Tab rail (right) */}
      <Box
        sx={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          borderLeft: 1,
          borderColor: 'divider',
          width: 48,
          minWidth: 48,
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 0.5,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tooltip title="Hide panels" placement="left" arrow>
            <IconButton
              size="small"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="hide right panels"
              sx={{ color: 'text.secondary' }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Tabs
          orientation="vertical"
          value={tabIndex}
          onChange={onTabChange}
          variant="fullWidth"
          sx={{
            flex: 1,
            minHeight: 0,
            '& .MuiTabs-flexContainer': {
              height: '100%',
            },
            '& .MuiTab-root': {
              flex: 1,
              minHeight: 0,
              alignItems: 'center',
              justifyContent: 'center',
              px: 0,
              py: 0,
              minWidth: '100%',
              width: '100%',
              position: 'relative',
              overflow: 'visible',
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: 0.6,
              lineHeight: 1.1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              borderRadius: 0,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'text.primary',
                bgcolor: 'action.selected',
                fontWeight: 600,
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            },
            '& .MuiTabs-indicator': {
              left: 0,
              right: 'auto',
              width: 3,
            },
          }}
        >
          <Tab
            label={
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                Monomer Library
              </Box>
            }
          />
          <Tab
            label={
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                Output
              </Box>
            }
          />
          <Tab
            label={
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                Jobs
              </Box>
            }
          />
        </Tabs>
      </Box>
    </Box>
  );
}

function getMonomerCode(m) {
  return m?.symbol || m?.m_abbr || m?.pdbName || '';
}

function normalizeBiln(biln) {
  return (biln || '')
    .trim()
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .replace(/\.+/g, '.')
    .replace(/\-+/g, '-');
}

function splitBilnTokens(biln) {
  const normalized = normalizeBiln(biln);
  const rawSegments = normalized ? normalized.split('.') : [];
  return rawSegments.map((seg) => (seg ? seg.split('-') : []).filter(Boolean));
}

function parseGlobalResIdx(sourceMonomer) {
  const raw = String(sourceMonomer?.['res-idx'] ?? '');
  const parts = raw.split('-');
  const idx = parseInt(parts?.[1], 10);
  return Number.isFinite(idx) ? idx : null;
}

function locateTokenByGlobalIdx(segments, globalIdx) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  let acc = 0;
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx] || [];
    const len = seg.length;
    if (globalIdx < acc + len) {
      const idxInSeg = globalIdx - acc;
      return { segIdx, idxInSeg, segLen: len, token: seg[idxInSeg] || '' };
    }
    acc += len;
  }
  return null;
}

function deriveRequiredRgroupsForReplacement({ biln, sourceMonomer }) {
  const globalIdx = parseGlobalResIdx(sourceMonomer);
  if (globalIdx == null) return [];

  const segments = splitBilnTokens(biln);
  const loc = locateTokenByGlobalIdx(segments, globalIdx);
  if (!loc) return [];

  const required = new Set();

  // Implicit peptide connectivity within the segment:
  // - if there is a previous residue, we need rgroup 1
  // - if there is a next residue, we need rgroup 2
  if (loc.segLen > 1) {
    if (loc.idxInSeg > 0) required.add(1);
    if (loc.idxInSeg < loc.segLen - 1) required.add(2);
  }

  // Explicit bond annotations in the token: (bondId,rgroup)
  const tok = String(loc.token || '');
  const matches = Array.from(tok.matchAll(/\((\d+),(\d+)\)/g));
  for (const m of matches) {
    const rg = Number(m?.[2]);
    if (Number.isFinite(rg) && rg > 0) required.add(rg);
  }

  return Array.from(required).sort((a, b) => a - b);
}

function availableRgroupsForMonomer(m) {
  const out = new Set();
  const arrays = [m?.m_Rgroups, m?.m_RgroupIdx, m?.m_attachmentPointIdx];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] != null) out.add(i + 1);
    }
  }
  return out;
}

function isReplacementCompatible({ candidate, requiredRgroups }) {
  const req = Array.isArray(requiredRgroups) ? requiredRgroups : [];
  if (req.length === 0) return true;
  const avail = availableRgroupsForMonomer(candidate);
  for (const r of req) {
    if (!avail.has(r)) return false;
  }
  return true;
}

const HomeInner = forwardRef((props, ref) => {
  const isHomeActive = props.isActive || false;
  const editorRef = useRef(null);
  const [outputData, setOutputData] = useState({});
  const confirm = useConfirm();

  const [uiState, setUiState] = useState({
    activeSeqIdx: null, // none focused until one exists
    seqNumber: 0, // 0 while BILN is empty
    selectedMonomer: null,
    hoveredMonomer: '',
  });

  // Replace-selection state lives here so the library can filter
  const [replaceSelection, setReplaceSelection] = useState({
    active: false,
    mode: null, // 'analog' | 'other' | null
    sourceMonomer: null, // monomer object (from track)
    requiredRgroups: [],
  });

  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_event, newValue) => {
    setTabIndex(newValue);
  };

  const handleBeginReplaceSelection = useCallback((mode, sourceMonomer) => {
    const biln = editorRef.current?.getBiln?.() || '';
    const requiredRgroups = deriveRequiredRgroupsForReplacement({ biln, sourceMonomer });
    startTransition(() => {
      setReplaceSelection({ active: true, mode, sourceMonomer, requiredRgroups });
    });
    setTabIndex(0);
  }, []);

  const handleCancelReplaceSelection = useCallback(() => {
    // Closing replace mode can cause the library list to expand back to the full dataset.
    // Defer that heavy rerender so the cancel interaction feels instant.
    const next = { active: false, mode: null, sourceMonomer: null, requiredRgroups: [] };
    requestAnimationFrame(() => {
      startTransition(() => {
        setReplaceSelection(next);
      });
    });
  }, []);

  // Handlers for MonomerLibrary interactions
  const handleAddingMonomer = useCallback(
    (monomer, options) => {
      if (replaceSelection.active && replaceSelection.sourceMonomer) {
        // Guard: ensure the chosen replacement supports all required R-groups for the selected residue
        const ok = isReplacementCompatible({ candidate: monomer, requiredRgroups: replaceSelection.requiredRgroups });
        if (!ok) {
          const srcCode = getMonomerCode(replaceSelection.sourceMonomer);
          const candCode = getMonomerCode(monomer);
          const req = (replaceSelection.requiredRgroups || []).map((r) => `R${r}`).join(', ');
          confirm({
            title: 'Incompatible replacement',
            message: `“${candCode}” cannot replace “${srcCode}” here because it does not support the required linking groups for this residue (${req}).\n\nPick a different monomer from the library.`,
            confirmText: 'Close',
            hideCancel: true,
          });
          return;
        }

        // Replace instead of add
        editorRef.current?.replaceMonomer?.(monomer, { sourceMonomer: replaceSelection.sourceMonomer });
        // End replace mode (overlay + highlight)
        editorRef.current?.endReplaceSelection?.();
        const next = { active: false, mode: null, sourceMonomer: null, requiredRgroups: [] };
        requestAnimationFrame(() => {
          startTransition(() => {
            setReplaceSelection(next);
          });
        });
        // Also broadcast cancel for any item highlights
        window.dispatchEvent(new CustomEvent('pp-replace-selection-cancel'));
        return;
      }

      editorRef.current?.addMonomer(monomer, options);
    },
    [confirm, replaceSelection],
  );

  return (
    <div className="h-full min-h-0">
      <DesignPageLayoutMUI
        sidebar={
          <SidebarTabbedPanel
            tabIndex={tabIndex}
            onTabChange={handleTabChange}
            handleAddingMonomer={handleAddingMonomer}
            uiState={uiState}
            setUiState={setUiState}
            replaceSelection={replaceSelection}
            outputData={outputData}
          />
        }
        viewerContainer={
          <PeptideEditorMain
            ref={editorRef}
            isActive={isHomeActive}
            uiState={uiState}
            setUiState={setUiState}
            onOutputChange={setOutputData}
            onBeginReplaceSelection={handleBeginReplaceSelection}
            onCancelReplaceSelection={handleCancelReplaceSelection}
          />
        }
      />
    </div>
  );
});

const Home = forwardRef((props, ref) => (
  <ConfirmProvider>
    <HomeInner {...props} ref={ref} />
  </ConfirmProvider>
));

Home.displayName = 'Home';
HomeInner.displayName = 'HomeInner';

export default Home;

