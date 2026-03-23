/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { log } from '../../utils/dev'
import { API_DB_URL, DB_NAME } from '../../config';
import { apiFetch } from '../../utils/api';

import FormWizard from "react-form-wizard-component";
import "react-form-wizard-component/dist/style.css";

import './styles.css'


import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';


import { useFragments, useFormSubmission } from './hooks/CustomHooks'
import { TabStep1, TabStep2, TabStep3, TabStep4, isFragmentAllowed } from './components/Steps';
import { invalidateLibraryFetching } from '../../hooks/useLibraryFetching';


const UIAddMonomers = memo(() => {
  // log("Rendering UIAddMonomers", { background: 'blue', color: 'white' });

  // State Hooks
  const [smiles, setSmiles] = useState('CCO');
  const [selectedBonds, setSelectedBonds] = useState([]);
  const [selectedFragmentIndex, setSelectedFragmentIndex] = useState(-1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [stepError, setStepError] = useState('');

  // References
  const wizardRef = useRef();
  const formRef = useRef();

  // Custom Hooks for managing fragments and form submission
  const [fragments] = useFragments(smiles, selectedBonds);
  const [handleFormSubmit, molBlock] = useFormSubmission(formData, fragments, selectedFragmentIndex);

  const StepGuideline = useCallback(({ title, children, error }) => {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {children}
        </Typography>
        {error ? (
          <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </Paper>
    );
  }, []);

  const checkSymbolExists = useCallback(async (values) => {
    const symbol = String(values?.symbol || '').trim();
    if (!symbol) return { exists: false };

    const params = new URLSearchParams();
    params.set('db_name', DB_NAME);
    params.set('symbol', symbol);

    const res = await apiFetch(`${API_DB_URL}/monomers/exists?${params.toString()}`, { method: 'GET' });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { exists: false, error: json?.message || json?.error || `Failed to validate symbol (status ${res.status})` };
    }

    if (typeof json?.data?.symbol?.exists === 'boolean') {
      return { exists: json.data.symbol.exists };
    }

    if (typeof json?.exists === 'boolean') return { exists: json.exists };
    if (typeof json?.data?.exists === 'boolean') return { exists: json.data.exists };

    return { exists: false };
  }, []);


  const checkTab = async () => {
    switch (currentIndex) {
      case 0:
        if (!smiles) return false;
        return true;
      case 1:
        if (selectedBonds.length === 0) return false;
        return true;
      case 2:
        if (selectedFragmentIndex === -1) return false;
        if (!isFragmentAllowed(fragments?.[selectedFragmentIndex], 4)) return false;
        return true;
      case 3:
        if (formRef.current) {
          const isValid = await formRef.current.isValid();
          if (!isValid) return false;

          const values = formRef.current.getFormData ? formRef.current.getFormData() : formData;
          const existsRes = await checkSymbolExists(values);
          if (existsRes?.error) {
            setStepError(String(existsRes.error));
            return false;
          }
          if (existsRes?.exists) {
            setStepError('This symbol already exists. Please choose a different Symbol.');
            return false;
          }

          setStepError('');

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
  const handleComplete = async () => {
    if (!molBlock) {
      console.error("Form not completed!");
      return;
    }

    console.log("Form completed, sending molblock data to server...");
    console.log(`Server URL: ${API_DB_URL}/monomers/add`);

    try {
      const response = await apiFetch(`${API_DB_URL}/monomers/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: molBlock,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log(result);
      invalidateLibraryFetching('monomer-added');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error during addition of new monomer:', error);
      }
    }
  };


  // Side effect Hooks
  useEffect(() => {
    setSelectedBonds([]);
    setStepError('');
  }, [smiles]);

  useEffect(() => {
    setFormData({});
    setStepError('');
  }, [selectedFragmentIndex]);

  useEffect(() => {
    if (fragments.length > 0) {
      const firstAllowed = fragments.findIndex((f) => isFragmentAllowed(f, 4));
      setSelectedFragmentIndex(firstAllowed >= 0 ? firstAllowed : -1);
    } else {
      setSelectedFragmentIndex(-1);
    }
  }, [fragments]);


  // Handle changes to 'smiles'
  const handleChangeSmiles = useCallback((newSmiles) => {
    setSmiles(newSmiles);
  }, []);

  // Handle selection of bonds
  const handleSelectedBonds = useCallback((bondIndex) => {
    setSelectedBonds((prevSelectedBonds) =>
      prevSelectedBonds.includes(bondIndex)
        ? prevSelectedBonds.filter((idx) => idx !== bondIndex)
        : [...prevSelectedBonds, bondIndex]
    );
  }, []);

  // Handle selection of fragment
  const handleSelectedFragment = useCallback((fragmentIndex) => {
    setStepError('');
    setSelectedFragmentIndex(fragmentIndex);
  }, []);

  // Use useCallback to memoize setFormData
  const handleFormDataCallback = useCallback((data) => {
    setStepError('');
    setFormData(data);
  }, []);


  return (

    <Box
      sx={{
        px: 2,
        py: 1.5,
        width: '100%',
        maxWidth: '70rem',
        mx: 'auto',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* This Box is the scroll container */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 1.5, md: 2 },
          bgcolor: 'background.paper',
        }}
      >
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
            <StepGuideline title="Guideline">
              Enter or paste a valid SMILES string for the molecule you want to convert into a monomer.
            </StepGuideline>
            <TabStep1
              smiles={smiles}
              handleChangeSmiles={handleChangeSmiles}
            />
          </FormWizard.TabContent>

          <FormWizard.TabContent title="Select bond(s)" icon="ti-settings">
            <StepGuideline title="Guideline">
              Select one or more bonds to define where the molecule should be cut. The second 2D view is only an illustrative preview of the resulting fragments; you will choose the actual fragment in the next step.
            </StepGuideline>
            <TabStep2
              smiles={smiles}
              handleSelectedBonds={handleSelectedBonds}
              selectedBonds={selectedBonds}
              fragments={fragments}
            />
          </FormWizard.TabContent>

          <FormWizard.TabContent title="Select a fragment" icon="ti-check">
            <StepGuideline title="Guideline" error={stepError}>
              Choose the fragment that will become the monomer core. A maximum of 4 attachment points ("*") is allowed.
            </StepGuideline>
            <TabStep3
              fragments={fragments}
              selectedFragmentIndex={selectedFragmentIndex}
              handleSelectedFragment={handleSelectedFragment}
              onInvalidFragment={(msg) => setStepError(String(msg || ''))}
            />
          </FormWizard.TabContent>

          <FormWizard.TabContent title="Fill in Monomer Metadata" icon="ti-check">
            <StepGuideline title="Guideline" error={stepError}>
              Fill in the monomer metadata. Clicking “Next” will validate the form and also check that the Symbol does not already exist.
            </StepGuideline>
            <TabStep4
              ref={formRef}
              fragmentSmiles={fragments[selectedFragmentIndex]}
              initialData={formData}
              onFormDataChange={handleFormDataCallback}
            />
          </FormWizard.TabContent>

          <FormWizard.TabContent title="Validate" icon="ti-check">
            <StepGuideline title="Guideline">
              Review the generated molblock for correctness before submitting.
            </StepGuideline>
            <Box mb={2}>
              <Typography variant="h6" >
                Please review the generated molblock for the monomer before submission.
              </Typography>

              <Box mt={2}>
                <TextField
                  multiline
                  minRows={10}
                  maxRows={18}
                  fullWidth
                  variant="outlined"
                  value={molBlock || 'No molblock generated.'}
                  slotProps={{
                    input: {
                      readOnly: true,
                      sx: {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#f8f8ff',
                        backgroundColor: '#141821',
                        '& textarea': {
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          color: 'inherit',
                          overflow: 'auto',
                        },
                      },
                    },
                    inputLabel: {
                      sx: { color: 'text.secondary' },
                    },
                  }}
                />
              </Box>
            </Box>
          </FormWizard.TabContent>

        </FormWizard>
      </Box>


      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/lykmapipo/themify-icons@0.1.2/css/themify-icons.css");
        .wizard-card-footer{
          display: flex;
          justify-content: center;
          margin-top: 10px;
          gap: 20px;
          position: sticky;
          bottom: 0;
          z-index: 2;
          padding: 10px 0;
        }
      `}</style>
    </Box>

  );
});

export default UIAddMonomers;