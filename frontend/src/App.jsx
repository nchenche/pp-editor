import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import NavBar from './components/layout/Navbar';

import Home from './pages/Home';
import UIAddMonomers from './pages/admin/UIAddMonomers';
import MonomerLibraryContainer from './pages/admin/MonomerLibrary';
import Documentation from './pages/Documentation';


// import DesignPeptideContainer from './pages/designPeptide/DesignPeptide';
// import MonomerCrudPage from './components/monomerCrud/MonomerCrudPage';

import { Box } from '@mui/material';

// import About from './pages/About';

import './App.css'

import FilterableMonomerLibrary from './components/core/Monomers';
import PeptideEditor from './components/core/Peptide';

// import VisNetwork from './components/graph/Test2';

const dataLinks = [
  {
    to: '/',
    text: 'Design peptide'
  },
  // {
  //     to: '/peptide',
  //     text: 'Design a peptide'
  // },
  // {
  //   to: '/monomers',
  //   text: 'Monomer library'
  // },
  {
    to: '/admin-monomers',
    text: 'Add new monomer'
  },
  {
    to: '/documentation',
    text: 'Documentation'
  }
]


function AppRoutes() {
  const location = useLocation();
  const isDesignActive = location.pathname === '/';


  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
        {/* Persist Design page; only hide/show */}
        {/*
      <div style={{ display: isDesignActive ? 'block' : 'none', height: '100%', minHeight: 0 }}>
        <main className="flex-grow min-h-0 h-full">
          <Home isActive={isDesignActive} />
        </main>
      </div>
         */}

        
      {/* Other routes render normally */}
      <Routes>
        <Route path="/" element={<></>} />
        <Route
          path="/admin-monomers"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <UIAddMonomers />
            </Box>
          }
        />
        <Route
          path="/monomers"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', backgroundColor: 'background.default' }}>
              <MonomerLibraryContainer />
            </Box>
          }
        />
        <Route
          path="/documentation"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <Documentation />
            </Box>
          }
        />
      </Routes>
    </Box>
  );
}


function App() {

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Box
        sx={{
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header>
          <NavBar dataLinks={dataLinks} />
        </Header>
        <AppRoutes />
        <Footer />
      </Box>
    </Router>
  );
}

export default App



// src/
// ├── components/
// │   ├── peptide-editor/
// │   │   ├── PeptideEditorMain.jsx         # Parent layout container (as above)
// │   │   ├── SequenceInput.jsx             # BILN text input + controls
// │   │   ├── MonomerTrack.jsx              # Interactive sequence track
// │   │   ├── Viewer2D/
// │   │   │   ├── Viewer2D.jsx              # 2D viewer entry point
// │   │   │   ├── Viewer2DControls.jsx      # Collapsible toolbar
// │   │   │   └── ... (utils/hooks)         
// │   │   ├── Viewer3D/
// │   │   │   ├── Viewer3D.jsx              # 3D viewer entry point
// │   │   │   ├── Viewer3DControls.jsx      # Collapsible toolbar
// │   │   │   └── ... (utils/hooks)         
// │   │   ├── ControlBar.jsx                # Generic collapsible bar (reused)
// │   │   └── index.js                      # Exports for easy import
// │   ├── monomer-library/
// │   │   ├── MonomerLibraryPanel.jsx       # Library browser/search/filters
// │   │   └── ... (filters, item, etc)
// │   └── output-panel/
// │       ├── OutputPanel.jsx               # Export formats, peptide props
// │       └── ... (subcomponents)
// │
// ├── hooks/
// │   ├── usePeptideEditorState.js          # State for sequence, selection, etc
// │   └── ... (other shared hooks)
// │
// ├── pages/
// │   └── DesignPeptidePage.jsx             # Main app page, composes all above
// │
// └── utils/
//     └── ... (formatting, molecular tools, helpers)
