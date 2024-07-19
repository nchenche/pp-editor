import { useState } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
// import Home from './pages/Home';
// import About from './pages/About';
import './App.css'

import FilterableMonomerLibrary from './components/core/Monomers';
import VisNetwork from './components/graph/Test2';



function App() {

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          {/* <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes> */}
          {/* <FilterableMonomerLibrary /> */}
          <VisNetwork />
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App
