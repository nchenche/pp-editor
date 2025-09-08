import { useCallback, useEffect, useState, useRef, useMemo } from 'react';

import { DesignPageLayout2 } from '../layouts/DesignPageLayout';
import { PeptideEditorMain } from '../components/peptide-editor/PeptideEditorMain';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';


function Home({ children }) {

  const memoizedLibraryContainer = useMemo(() => (
    <MonomerLibraryContainer filterValue={""} onMonomerItemDoubleClick={() => { }} />
  ), []);

  const memoizedPeptideEditor = useMemo(() => (
    <PeptideEditorMain
      Viewer3D={<div>3D Viewer Placeholder</div>} // Replace with actual component
    />
  ), []); // Recreate if bilnValue or monomers change

  return (
    <div className="h-full min-h-0">
      <DesignPageLayout2
        sidebar={memoizedLibraryContainer}
        viewerContainer={memoizedPeptideEditor}
        outputPanel={"Output"}
      />
    </div>
  );
}

export default Home;