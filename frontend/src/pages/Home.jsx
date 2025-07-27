import { useState, useMemo } from 'react';

import { Box } from '@mui/material';


import { DesignPageLayout2 } from '../layouts/DesignPageLayout';
import { MonomerLibraryContainer } from './designPeptide/components/monomerLibrary/MonomerLibraryContainer';

import { InputBiln, InputSearch } from './designPeptide/components/Inputs';


function Home({ children }) {
  const [bilnValue, setBilnValue] = useState('A-C-K-A-C-G-L');  // Example initial value

  // Memoize the sidebar so it's created once and not on every Home re-render
  const memoizedLibraryContainer = useMemo(
    () => <MonomerLibraryContainer filterValue={""} onMonomerItemDoubleClick={() => { }} />,
    [] // Only create once; add dependencies if sidebar should update
  );

  // Handlers and state management would go here
  // ...

  return (
    <div className="h-full min-h-0">
      <DesignPageLayout2
        sidebar={memoizedLibraryContainer}
        sequenceEditor={

          <Box width={{ xs: "100%", sm: 400, md: 500 }} mx="auto" p={0}>
            <InputBiln value={bilnValue} onChangeValue={setBilnValue} />
          </Box>
        }
        viewerContainer={"Viewer"}
        outputPanel={"Output"}
      />
    </div>
  );
}

export default Home;