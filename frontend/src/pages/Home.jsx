import { useCallback, useEffect, useState, useRef, useMemo } from 'react';

import { DesignPageLayout2 } from '../layouts/DesignPageLayout';
import { PeptideEditorMain } from '../components/peptide-editor/PeptideEditorMain';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';
import { OutputContainer } from '../components/output/OutputContainer';


function Home({ children }) {

  const editorRef = useRef(null);
  const [outputData, setOutputData] = useState({});

  const [uiState, setUiState] = useState({
    activeSeqIdx: 0,
    selectedMonomer: null,
    hoveredMonomer: '',
  });

  // Handlers for MonomerLibrary interactions
  const handleAddingMonomer = useCallback((monomer) => {
    console.log("Add monomer clicked:", monomer);
    editorRef.current?.addMonomer(monomer);
  }, []);

  const memoizedLibraryContainer = useMemo(() => (
    <MonomerLibraryContainer filterValue={""} handleAddingMonomer={handleAddingMonomer} activeSeqIdx={uiState.activeSeqIdx} />
  ), [handleAddingMonomer]);

  const memoizedPeptideEditor = useMemo(() => (
    <PeptideEditorMain
      ref={editorRef}
      Viewer3D={<div>3D Viewer Placeholder</div>} // Replace with actual component
      onOutputChange={setOutputData}
      uiState={uiState}
      setUiState={setUiState}
    />
  ), [setOutputData, uiState, setUiState]); 

  const memoizedOutputContainer = useMemo(() => (
    <OutputContainer outputData={outputData} />
  ), [outputData]);

  return (
    <div className="h-full min-h-0">
      <DesignPageLayout2
        sidebar={memoizedLibraryContainer}
        viewerContainer={memoizedPeptideEditor}
        outputPanel={memoizedOutputContainer}
      />
    </div>
  );
}

export default Home;