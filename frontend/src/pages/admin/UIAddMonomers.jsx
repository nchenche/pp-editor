/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { log } from '../../utils/dev'

import FormWizard from "react-form-wizard-component";
import "react-form-wizard-component/dist/style.css";

import './styles.css'


import {
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';


import { useFragments, useFormSubmission } from './hooks/CustomHooks'
import { TabStep1, TabStep2, TabStep3, TabStep4 } from './components/Steps';



const UIAddMonomers = ({ children }) => {
  // State Hooks
  const [smiles, setSmiles] = useState('CCO');
  const [selectedBonds, setSelectedBonds] = useState([]);
  const [selectedFragmentIndex, setSelectedFragmentIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({});

  // References
  const wizardRef = useRef();
  const formRef = useRef();

  // Custom Hooks for managing fragments and form submission
  const [fragments, setFragments] = useFragments(smiles, selectedBonds);
  const [handleFormSubmit, molBlock] = useFormSubmission(formData, fragments, selectedFragmentIndex);


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
          if (!isValid) return false;

          handleFormSubmit();
          return true;
        }
        return false;
      case 4:
        return true;
      default:
        return true;
    }
  };

  // Function to handle navigating to the next tab
  const handleNext = async () => {
    const isTabValid = await checkTab();
    if (wizardRef.current && isTabValid) {
      wizardRef.current.nextTab();
    }
  };

  // Function to handle navigating to the previous tab
  const handlePrev = () => {
    if (wizardRef.current) {
      wizardRef.current.prevTab();
    }
  };

  // Handle tab change
  const tabChanged = async ({ prevIndex, nextIndex }) => {
    if (wizardRef.current) {
      setTimeout(() => { setCurrentIndex(() => prevIndex) }, 0);
    }
  };

  // FormWizard back button template
  const backButtonTemplate = () => {
    return (
      <Button variant="contained" onClick={handlePrev}>
        Back
      </Button>
    );
  };

  // FormWizard next button template
  const nextButtonTemplate = () => {
    return (
      <Button variant="contained" onClick={handleNext}>
        Next
      </Button>
    );
  };

  // Handle FormWizard completed steps
  const handleComplete = () => {
    console.log("Form completed!");
  };


  // Side effect Hooks
  useEffect(() => {
    setSelectedBonds([]);
  }, [smiles]);

  useEffect(() => {
    setFormData({});
  }, [fragments, selectedFragmentIndex]);

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

  // Handle selection of bonds
  const handleSelectedBonds = (bondIndex) => {
    setSelectedBonds((prevSelectedBonds) =>
      prevSelectedBonds.includes(bondIndex)
        ? prevSelectedBonds.filter((idx) => idx !== bondIndex)
        : [...prevSelectedBonds, bondIndex]
    );
  };

  // Handle selection of fragment
  const handleSelectedFragment = (fragmentIndex) => {
    setSelectedFragmentIndex(fragmentIndex);
  }

  // Use useCallback to memoize setFormData
  const handleFormDataCallback = useCallback((data) => {
    setFormData(data);
  }, []);


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
            fragmentSmiles={fragments[selectedFragmentIndex]}
            initialData={formData}
            onFormDataChange={handleFormDataCallback}
          />
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Validate" icon="ti-check">
          <pre className="bg-slate-900 text-slate-400 text-left p-4 text-xs rounded-lg font-medium overflow-x-auto">
            <code>{molBlock}</code>
          </pre>
        </FormWizard.TabContent>

      </FormWizard>
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/lykmapipo/themify-icons@0.1.2/css/themify-icons.css");
      `}</style>


    </div>
  );
}


export default UIAddMonomers;