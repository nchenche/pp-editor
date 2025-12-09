import { useCallback, useEffect, useState, useRef, useMemo, forwardRef } from 'react';

import { ConfirmProvider } from '../components/common/ConfirmDialogProvider';

import { DesignPageLayoutMUI } from '../layouts/DesignPageLayout';
import { PeptideEditorMain } from '../components/peptide-editor/PeptideEditorMain';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';
import { OutputContainer } from '../components/output/OutputContainer';

import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const Home = forwardRef((props, ref) => {
  const isHomeActive = props.isActive || false;
  const editorRef = useRef(null);
  const [outputData, setOutputData] = useState({});

  const [uiState, setUiState] = useState({
    activeSeqIdx: null,  // none focused until one exists
    seqNumber: 0,        // 0 while BILN is empty
    selectedMonomer: null,
    hoveredMonomer: '',
  });

  // Replace-selection state lives here so the library can filter
  const [replaceSelection, setReplaceSelection] = useState({
    active: false,
    mode: null,             // 'analog' | 'other' | null
    sourceMonomer: null,    // monomer object (from track)
  });

  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleBeginReplaceSelection = useCallback((mode, sourceMonomer) => {
    setReplaceSelection({ active: true, mode, sourceMonomer });
  }, []);

  const handleCancelReplaceSelection = useCallback(() => {
    setReplaceSelection({ active: false, mode: null, sourceMonomer: null });
  }, []);

  // Handlers for MonomerLibrary interactions
  const handleAddingMonomer = useCallback((monomer, options) => {
    if (replaceSelection.active && replaceSelection.sourceMonomer) {
      // Replace instead of add
      editorRef.current?.replaceMonomer?.(monomer, { sourceMonomer: replaceSelection.sourceMonomer });
      // End replace mode (overlay + highlight)
      editorRef.current?.endReplaceSelection?.();
      setReplaceSelection({ active: false, mode: null, sourceMonomer: null });
      // Also broadcast cancel for any item highlights
      window.dispatchEvent(new CustomEvent('pp-replace-selection-cancel'));
    } else {
      editorRef.current?.addMonomer(monomer, options);
    }
  }, [replaceSelection]);


  return (
    <ConfirmProvider>
      <div className="h-full min-h-0">
        <DesignPageLayoutMUI
          sidebar={
            <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Monomer Library" />
                <Tab label="Output" />
              </Tabs>

              {/* Keep both mounted; toggle visibility */}
              <Box
                role="tabpanel"
                sx={{
                  display: tabIndex === 0 ? 'flex' : 'none',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden', // the MonomerLibraryContainer manages its own scroll
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
                {/* Output tab: let the first child scroll */}
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <OutputContainer outputData={outputData} />
                </Box>
              </Box>
            </Box>
          }
          viewerContainer={
            <PeptideEditorMain
              isActive={isHomeActive}
              ref={editorRef}
              Viewer3D={<div>3D Viewer Placeholder</div>}
              onOutputChange={setOutputData}
              uiState={uiState}
              setUiState={setUiState}
              onBeginReplaceSelection={handleBeginReplaceSelection}
              onCancelReplaceSelection={handleCancelReplaceSelection}
            />
          }
        // outputPanel={<OutputContainer outputData={outputData} />}
        />
      </div>
    </ConfirmProvider>
  );
});

export default Home;

