import { useEffect, useState } from 'react';


import FormWizard from "react-form-wizard-component";
import "react-form-wizard-component/dist/style.css";


import './styles.css'


import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Description, Field, Input, Label } from '@headlessui/react'
import { Button } from '@headlessui/react'

import { forwardRef } from 'react'
import clsx from 'clsx'

import InputContainer from './components/InputContainer'

const API_URL = "http://0.0.0.0:5000/api/rdkit/generate-svg"


const MoleculeDisplay = ({ smiles }) => {
  const [svg, setSvg] = useState(''); // To store the fetched SVG data
  const [error, setError] = useState(null); // To store any error during fetching


  useEffect(() => {
    const controller = new AbortController(); // Create an AbortController to cancel fetch if needed
    const signal = controller.signal;

    const fetchSvgFromSmiles = async () => {
      try {
        // POST request to the server
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ smiles }),
          signal: signal, // Attach the signal to the fetch request
        });

        // Check if the request was successful
        if (!response.ok) {
          throw new Error('Error fetching the SVG');
        }

        // Parse the response as text (since SVG is a text-based format)
        const svgData = await response.text();

        // Set the fetched SVG data
        setSvg(svgData);
        setError(null); // Clear previous errors if fetch is successful
      } catch (error) {
        // Handle fetch errors (e.g., network errors or aborted requests)
        if (error.name !== 'AbortError') {
          setError(error.message); // Only set error if it's not an abort
        }
      }
    };

    // Fetch data
    fetchSvgFromSmiles();

    // Cleanup function: cancel the fetch request if the component unmounts
    return () => {
      controller.abort(); // This will cancel the fetch if the component is unmounted
    };
  }, [smiles]);


  // useEffect to handle mouse hover events on the bonds in the SVG
  useEffect(() => {
    const handleMouseOver = (event) => {
      if (!event.target.classList.contains('hover-target')) return;

      // Extract bond class (e.g., 'bond-1') from the original path
      const bondClass = Array.from(event.target.classList).find(cls => cls.startsWith('bond-'));
      if (bondClass) {
        // console.log(`Hovered over ${bondClass}`);
        // Select all original bond paths that have the same bond class
        const bondElements = document.querySelectorAll(`.${bondClass}`);
        bondElements.forEach((bondElement) => {
          bondElement.classList.add('highlight'); // Add highlight class to the original paths
        });
      }
    };

    const handleMouseOut = (event) => {
      if (!event.target.classList.contains('hover-target')) return;

      // Extract bond class (e.g., 'bond-1')
      const bondClass = Array.from(event.target.classList).find(cls => cls.startsWith('bond-'));
      if (bondClass) {
        // Select all original bond paths that have the same bond class
        const bondElements = document.querySelectorAll(`.${bondClass}`);
        bondElements.forEach((bondElement) => {
          bondElement.classList.remove('highlight'); // Remove highlight class from the original paths
        });
      }
    };

    // Select the SVG container with the paths (ensure the class exists after rendering)
    const svgElement = document.querySelector('.molecule-svg');

    // If the SVG is rendered, add event listeners
    if (svgElement) {
      svgElement.addEventListener('mouseenter', handleMouseOver, true);
      svgElement.addEventListener('mouseleave', handleMouseOut, true);
    }

    // Cleanup: Remove the event listeners when SVG changes or the component unmounts
    return () => {
      if (svgElement) {
        svgElement.removeEventListener('mouseenter', handleMouseOver, true);
        svgElement.removeEventListener('mouseleave', handleMouseOut, true);
      }
    };
  }, [svg]); // Re-run when SVG is updated


  useEffect(() => {
    if (svg) {
      // Get the SVG element after it's been added to the DOM
      const svgElement = document.querySelector('.molecule-svg svg');

      if (svgElement) {
        // Select all paths from the SVG
        const allPaths = svgElement.querySelectorAll('path');

        // Iterate over each path and process those that match 'bond-' pattern
        allPaths.forEach((path, idx) => {
          const hasBondClass = Array.from(path.classList).some(cls => cls.startsWith('bond-'));
          if (hasBondClass) {
            // Create a duplicate path for wider hover area
            const duplicatePath = path.cloneNode(true);

            // Add a new class to the duplicate to differentiate it
            duplicatePath.classList.add('hover-target');

            // Style the duplicate path for easier hover detection
            // duplicatePath.style.stroke = 'transparent';

            // Set the original path to ignore pointer events
            path.style.pointerEvents = 'none';

            // Insert the duplicate path before the original one, so it's behind visually
            path.parentNode.insertBefore(duplicatePath, path);
          }
        });
      }
    }
  }, [svg]);

  return (
    <>

      {/* Render the SVG if available */}
      {svg && (
        <div className="w-96 h-96 border mx-auto mt-2">
          <div
            id="svg-container"
            className='w-full h-full overflow-hidden molecule-svg'
            dangerouslySetInnerHTML={{ __html: svg }} /> {/* Inject SVG into the DOM */}
        </div>
      )}

      {/* Error handling */}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </>
  )
}


const UIAddMonomers = ({ children }) => {
  const [smiles, setSmiles] = useState('CCO'); // To store the input SMILES string

  const handleComplete = () => {
    console.log("Form completed!");
    // Handle form completion logic here
  };
  const tabChanged = ({ prevIndex, nextIndex }) => {
    console.log("prevIndex", prevIndex);
    console.log("nextIndex", nextIndex);
  };

  return (
    <div className='m-2 w-8/12 mx-auto'>
      <FormWizard
        color="rgb(30, 41, 59)"
        stepSize='xs'
        shape="circle"
        onComplete={handleComplete}
        onTabChange={tabChanged}
      >
        <FormWizard.TabContent title="Choose a molecule" icon="ti-user">
          <InputContainer smiles={smiles} setSmiles={setSmiles} />
          <MoleculeDisplay smiles={smiles} />
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Select bond(s)" icon="ti-settings">
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Select a fragment" icon="ti-check">
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Fill the fields" icon="ti-check">
        </FormWizard.TabContent>

      </FormWizard>
      {/* add style */}
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/lykmapipo/themify-icons@0.1.2/css/themify-icons.css");
      `}</style>


    </div>
  );
}

export default UIAddMonomers;