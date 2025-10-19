import { useCallback, useEffect, useState, useRef, useMemo, forwardRef } from 'react';

import { ConfirmProvider } from '../components/common/ConfirmDialogProvider';

import { DesignPageLayout2, DesignPageLayoutMUI } from '../layouts/DesignPageLayout';
import { PeptideEditorMain } from '../components/peptide-editor/PeptideEditorMain';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';
import { OutputContainer } from '../components/output/OutputContainer';

const Home = forwardRef((props, ref) => {

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
            <MonomerLibraryContainer
              filterValue=""
              handleAddingMonomer={handleAddingMonomer}
              uiState={uiState}
              setUiState={setUiState}
              replaceSelection={replaceSelection}
            />
          }
          viewerContainer={
            <PeptideEditorMain
              ref={editorRef}
              Viewer3D={<div>3D Viewer Placeholder</div>}
              onOutputChange={setOutputData}
              uiState={uiState}
              setUiState={setUiState}
              onBeginReplaceSelection={handleBeginReplaceSelection}
              onCancelReplaceSelection={handleCancelReplaceSelection}
            />
          }
          outputPanel={<OutputContainer outputData={outputData} />}
        />
      </div>
    </ConfirmProvider>
  );
});

export default Home;

