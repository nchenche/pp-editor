import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useMemo, useState } from 'react';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import NavBar from './components/layout/Navbar';

import Home from './pages/Home';
import PersonalMonomers from './pages/admin/PersonalMonomers';
import MonomerLibraryContainer from './pages/admin/MonomerLibrary';
import PublicMonomers from './pages/admin/PublicMonomers';
import Documentation from './pages/Documentation';
import SubmitPublicMonomers from './pages/SubmitPublicMonomers';
import './App.css'

import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import { useOwnerId } from './hooks/useOwnerId';

import DataPolicyDialog from './components/common/DataPolicyDialog';


const COOKIE_CONSENT_STORAGE_KEY = 'pp-editor:cookie-consent:v1';

function readCookieConsent() {
  try {
    const raw = window?.localStorage?.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCookieConsentAccepted() {
  try {
    window?.localStorage?.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ accepted: true, acceptedAt: new Date().toISOString() })
    );
  } catch {
    // If storage is blocked, keep showing consent on next load.
  }
}


function CookieConsentDialog({ open, onAccept }) {
  return <DataPolicyDialog open={open} mode="consent" onAccept={onAccept} />;
}


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


function CookieConsentController() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const path = location?.pathname || '';
    if (path !== '/') {
      setOpen(false);
      return;
    }

    const consent = readCookieConsent();
    setOpen(!consent?.accepted);
  }, [location?.pathname]);

  const accept = useCallback(() => {
    writeCookieConsentAccepted();
    setOpen(false);
  }, []);

  return <CookieConsentDialog open={open} onAccept={accept} />;
}


function AppRoutes() {
  const ownerId = useOwnerId();
  const location = useLocation();

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          path="/submit-public-monomers"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <SubmitPublicMonomers />
            </Box>
          }
        />

        <Route
          path="/admin/public-monomers"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <PublicMonomers />
            </Box>
          }
        />
        {/* <Route
          path="/monomers"
          element={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', backgroundColor: 'background.default' }}>
              <MonomerLibraryContainer />
            </Box>
          }
        /> */}
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
      to: '/submit-public-monomers',
      text: 'Submit to public library'
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

        <CookieConsentController />

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
