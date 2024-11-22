import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import NavBar from './components/layout/Navbar';

import Home from './pages/Home';
import UIAddMonomers from './pages/admin/UIAddMonomers';

// import About from './pages/About';

import './App.css'

import FilterableMonomerLibrary from './components/core/Monomers';
import PeptideEditor from './components/core/Peptide';

// import VisNetwork from './components/graph/Test2';



const dataLinks = [
  {
      to: '/',
      text: 'Home'
  },
  {
      to: '/peptide',
      text: 'Design a peptide'
  },
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
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/peptide" element={<PeptideEditor />} />
            <Route path="/admin-monomers" element={<UIAddMonomers />} />

            {/* <Route path="/monomers" element={<FilterableMonomerLibrary />} /> */}

          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App

