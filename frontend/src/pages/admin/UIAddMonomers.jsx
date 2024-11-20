/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { log } from '../../utils/dev'

import FormWizard from "react-form-wizard-component";
import "react-form-wizard-component/dist/style.css";

import './styles.css'


// import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
// import { Description, Field, Input, Label } from '@headlessui/react'
// import { Button } from '@headlessui/react'
// import { forwardRef } from 'react'
// import clsx from 'clsx'

import {
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';

import { TabStep1, TabStep2, TabStep3, TabStep4 } from './components/Steps';



const UIAddMonomers = ({ children }) => {
  const [smiles, setSmiles] = useState('CCO'); // To store the input SMILES string
  const [selectedBonds, setSelectedBonds] = useState([]); // To store the input SMILES string
  const [fragments, setFragments] = useState([]); // To store the fragments after API response
  const [selectedFragmentIndex, setSelectedFragmentIndex] = useState(-1); // To store the fragments after API response
  const formRef = useRef();
  const wizardRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0); // To store the input SMILES string
  const [formData, setFormData] = useState({}); // State to hold form data


  const checkTab = async () => {
    switch (currentIndex) {
      case 0:
        if (!smiles) return false;
        return true;
      case 1:
        if (selectedBonds.length === 0) return false;
        return true;
      case 2:
        if (selectedBonds.length === -1) return false;
        return true;
      case 3:
        if (formRef.current) {
          const isValid = await formRef.current.isValid();
          const data = await formRef.current.getFormData();

          console.log(isValid);
          console.log(data);

          if (!isValid) return false;
          return true;
        }
        return false;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isTabValid = await checkTab();
    if (wizardRef.current) {
      if (!isTabValid) {
        return
      };
      wizardRef.current.nextTab();
    }
  };

  const handlePrev = () => {
    if (wizardRef.current) {
      wizardRef.current.prevTab();
    }
  };

  const backButtonTemplate = () => {
    return (
      <Button variant="contained" onClick={handlePrev}>
        Back
      </Button>
    );
  };

  const nextButtonTemplate = () => {
    return (
      <Button variant="contained" onClick={handleNext}>
        Next
      </Button>
    );
  };

  const handleComplete = () => {
    console.log("Form completed!");
  };

  const tabChanged = async ({ prevIndex, nextIndex }) => {
    setTimeout( () => {
      setCurrentIndex(() => prevIndex);
    }, 0)
  };




  // Reset 'selectedBonds' when 'smiles' changes
  useEffect(() => {
    setSelectedBonds([]);
  }, [smiles]);

  // Reset 'formData' when 'fragments' change
  useEffect(() => {
    setFormData({});
  }, [fragments]);

  // Reset 'formData' when 'selectedFragmentIndex' change
  useEffect(() => {
    setFormData({});
  }, [selectedFragmentIndex]);

  // Reset 'selectedFragmentIndex' when 'fragments' change
  useEffect(() => {
    if (fragments.length > 0) {
      setSelectedFragmentIndex(0);
    } else {
      setSelectedFragmentIndex(-1);
    }
  }, [fragments]);


  // Handle changes to 'smiles'
  const handleChangeSmiles = (value) => {
    setSmiles(value);
  };

  const handleSelectedBonds = (bondIndex) => {
    if (selectedBonds.includes(bondIndex)) {
      setSelectedBonds(selectedBonds.filter((idx) => idx !== bondIndex));
    } else {
      setSelectedBonds([...selectedBonds, bondIndex]);
    }
  }

  const handleSelectedFragment = (fragmentIndex) => {
    setSelectedFragmentIndex(fragmentIndex);
  }

  // Use useCallback to memoize setFormData
  const handleFormDataCallback = useCallback((data) => {
    setFormData(data);
  }, []);

  // Reset 'fragments' when 'selectedBonds' changes and trigger fragment generation
  useEffect(() => {
    if (!selectedBonds.length) {
      setFragments([]);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const payload = { smiles: smiles, bonds: selectedBonds };
    console.log(payload);

    const fragmentMolecule = async () => {
      try {
        const response = await fetch('http://0.0.0.0:5000/api/rdkit/fragment-molecule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: signal,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        setFragments(result.data);

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Error while fragmenting the molecule:', error);
        }
      }
    };

    fragmentMolecule();

    // Cleanup function
    return () => { controller.abort(); };

  }, [selectedBonds]);


  return (
    <div className='m-2 w-8/12 mx-auto'>
      <FormWizard
        ref={wizardRef}
        color="rgb(30, 41, 59)"
        stepSize='xs'
        shape="circle"
        onComplete={handleComplete}
        onTabChange={tabChanged}
        backButtonTemplate={backButtonTemplate}
        nextButtonTemplate={nextButtonTemplate}
      >
        <FormWizard.TabContent title="Choose a molecule" icon="ti-user">
          <TabStep1 smiles={smiles} handleChangeSmiles={handleChangeSmiles} />
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Select bond(s)" icon="ti-settings">
          <div className='grid grid-cols-2'>

            <div className='p-4 m-2'>
              <h2 className='text-xl font-medium border-b-4 border-cyan-800/35 pb-4'>Selected bonds</h2>
              <ul className='mt-8'>
                {selectedBonds.length === 0 ? (
                  <li>None</li>
                ) : (
                  selectedBonds.map((bondIndex, idx) => (
                    <li key={idx}>{bondIndex}</li>
                  ))
                )}
              </ul>
            </div>

            <TabStep2 smiles={smiles} handleSelectedBonds={handleSelectedBonds} selectedBonds={selectedBonds} />
          </div>
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Select a fragment" icon="ti-check">
          <TabStep3 fragments={fragments} selectedFragmentIndex={selectedFragmentIndex} handleSelectedFragment={handleSelectedFragment} />
          <p>Selected fragment: {selectedFragmentIndex} - {fragments[selectedFragmentIndex]}</p>
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Fill the fields" icon="ti-check">
          <TabStep4
            ref={formRef}
            fragments={fragments}
            selectedFragmentIndex={selectedFragmentIndex}
            initialData={formData}
            onFormDataChange={handleFormDataCallback}
          />
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Validate" icon="ti-check">
        </FormWizard.TabContent>

      </FormWizard>
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/lykmapipo/themify-icons@0.1.2/css/themify-icons.css");
      `}</style>


    </div>
  );
}


export default UIAddMonomers;