import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import NavBar from './components/layout/Navbar';

import Home from './pages/Home';
import UIAddMonomers from './pages/admin/UIAddMonomers';
import MonomerLibraryContainer from './pages/admin/MonomerLibrary';
import DesignPeptideContainer from './pages/designPeptide/DesignPeptide';



// import About from './pages/About';

import './App.css'

import FilterableMonomerLibrary from './components/core/Monomers';
import PeptideEditor from './components/core/Peptide';

// import VisNetwork from './components/graph/Test2';

// A-C-K-A-C(1,2).A(1,1)-F

const dataLinks = [
  {
      to: '/',
      text: 'Home'
  },
  // {
  //     to: '/peptide',
  //     text: 'Design a peptide'
  // },
  {
    to: '/monomers',
    text: 'Monomer library'
  },
  {
      to: '/admin-monomers',
      text: 'Add new monomer'
  }
]



function App() {

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col min-h-screen">
        <Header>
          <NavBar dataLinks={dataLinks}/>
        </Header>
        <main className="flex-grow min-h-0 h-full">
          <Routes>
            <Route path="/" element={<Home />} />  
            {/* <Route path="/peptide" element={<DesignPeptideContainer />} /> */}
            <Route path="/admin-monomers" element={<UIAddMonomers />} />
            <Route path="/monomers" element={<MonomerLibraryContainer />} />
            {/* <Route path="/monomers" element={<FilterableMonomerLibrary />} /> */}

          </Routes>
        </main>
        <Footer />
      </div>
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
