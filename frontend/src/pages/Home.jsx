import React from 'react';


import { DesignPageLayout2 } from '../layouts/DesignPageLayout';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';

function Home({ children }) {
  return (
    <div className="h-full min-h-0">
      <DesignPageLayout2
        sidebar={<MonomerLibraryContainer filterValue={""} onMonomerItemDoubleClick={() => {}} />}
        sequenceEditor={"Editor"}
        viewerContainer={"Viewer"}
        outputPanel={"Output"}
      />
    </div>
  );
}

export default Home;