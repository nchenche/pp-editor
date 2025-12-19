import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useMemo, useState } from 'react';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import NavBar from './components/layout/Navbar';

import Home from './pages/Home';
import UIAddMonomers from './pages/admin/UIAddMonomers';
import PersonalMonomers from './pages/admin/PersonalMonomers';
import MonomerLibraryContainer from './pages/admin/MonomerLibrary';
import Documentation from './pages/Documentation';
import './App.css'

import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import { useOwnerId } from './hooks/useOwnerId';


function OwnerIdRequiredDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Owner ID required</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          This page is only available when you’re connected with an Owner ID.
          Please click on "Load ID" or "Create ID" in the header to connect with an Owner ID.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">OK</Button>
      </DialogActions>
    </Dialog>
  );
}

function OwnerIdRequiredRouteDialog() {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = useMemo(() => {
    const from = location?.state?.from?.pathname;
    return from && typeof from === 'string' ? from : '/';
  }, [location?.state?.from?.pathname]);

  const handleClose = useCallback(() => {
    navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  return <OwnerIdRequiredDialog open={true} onClose={handleClose} />;
}


// import DesignPeptideContainer from './pages/designPeptide/DesignPeptide';
// import MonomerCrudPage from './components/monomerCrud/MonomerCrudPage';
// import About from './pages/About';
// import FilterableMonomerLibrary from './components/core/Monomers';
// import PeptideEditor from './components/core/Peptide';
// import VisNetwork from './components/graph/Test2';

function AppRoutes() {
  const ownerId = useOwnerId();
  const location = useLocation();
  // const isDesignActive = location.pathname === '/';

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
      {/* <div style={{ display: isDesignActive ? 'block' : 'none', height: '100%', minHeight: 0 }}>
        <main className="flex-grow min-h-0 h-full">
          <Home isActive={isDesignActive} />
        </main>
      </div> */}


      {/* Other routes render normally */}
      <Routes>
        <Route path="/" element={<Home isActive={true} />} />
        <Route
          path="/my-monomers"
          element={
            ownerId ? (
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <PersonalMonomers />
              </Box>
            ) : (
              <OwnerIdRequiredRouteDialog key={location.key} />
            )
          }
        />
        <Route
          path="/admin-monomers"
          element={
            ownerId ? (
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <UIAddMonomers />
              </Box>
            ) : (
              <OwnerIdRequiredRouteDialog key={location.key} />
            )
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
  const ownerId = useOwnerId();
  const [isOwnerRequiredOpen, setIsOwnerRequiredOpen] = useState(false);

  const dataLinks = [
    {
      to: '/',
      text: 'Design peptide'
    },
    {
      to: '/my-monomers',
      text: 'My monomers',
      disabled: !ownerId,
      disabledReason: 'Requires Owner ID connection (use Load ID / Create ID in the header).'
    },
    {
      to: '/admin-monomers',
      text: 'Add new monomer',
      disabled: !ownerId,
      disabledReason: 'Requires Owner ID connection (use Load ID / Create ID in the header).'
    },
    {
      to: '/documentation',
      text: 'Documentation'
    }
  ];

  const onDisabledLinkClick = useCallback(() => {
    setIsOwnerRequiredOpen(true);
  }, []);

  const closeOwnerRequired = useCallback(() => {
    setIsOwnerRequiredOpen(false);
  }, []);

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
          <NavBar dataLinks={dataLinks} onDisabledLinkClick={onDisabledLinkClick} />
        </Header>
        <AppRoutes />
        <Footer />

        <OwnerIdRequiredDialog open={isOwnerRequiredOpen} onClose={closeOwnerRequired} />
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
