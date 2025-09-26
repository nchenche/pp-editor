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

  // Handlers for MonomerLibrary interactions
  const handleAddingMonomer = useCallback((monomer, options) => {
    editorRef.current?.addMonomer(monomer, options);
  }, []);

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
            />
          }
          viewerContainer={
            <PeptideEditorMain
              ref={editorRef}
              Viewer3D={<div>3D Viewer Placeholder</div>}
              onOutputChange={setOutputData}
              uiState={uiState}
              setUiState={setUiState}
            />
          }
          outputPanel={<OutputContainer outputData={outputData} />}
        />
      </div>
    </ConfirmProvider>
  );
});

export default Home;