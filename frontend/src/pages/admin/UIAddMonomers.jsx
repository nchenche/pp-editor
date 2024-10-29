/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';


import FormWizard from "react-form-wizard-component";
import "react-form-wizard-component/dist/style.css";

import './styles.css'


import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Description, Field, Input, Label } from '@headlessui/react'
import { Button } from '@headlessui/react'

import { forwardRef } from 'react'
import clsx from 'clsx'

import InputContainer from './components/InputContainer';
import { MolDisplayer } from './components/MolDisplayer';


const TabStep1 = ({ smiles, handleChangeSmiles }) => {
  return (
    <>
      <InputContainer smiles={smiles} handleChangeSmiles={handleChangeSmiles} />
      <MolDisplayer smiles={smiles} />
    </>
  )
}

const TabStep2 = ({ smiles, handleSelectedBonds, selectedBonds }) => {
  const queryParams = {
    h_explicit_only: false,
    add_bond_indices: true,
    format_svg: true
  }

  const onBondClick = (event) => {
    if (!event.target.classList.contains('bond-highlight-path')) return;

    const groupBond = event.target.parentNode;
    const classes = groupBond.classList;
    classes.toggle('selected');

    const bondClassName = Array.from(classes).find(ele => ele.includes('group-bond-'));
    if (!bondClassName) return;
    const bondIndex = bondClassName.split("group-bond-")[1];

    handleSelectedBonds(bondIndex);
  };

  return (
    <MolDisplayer smiles={smiles} queryParams={queryParams} onBondClick={onBondClick} selectedBonds={selectedBonds} selectable_bonds={true} />
  )
}


const TabStep3 = ({ fragments }) => {
  const queryParams = {
    h_explicit_only: false,
    add_bond_indices: false,
    format_svg: true,
    mols_per_row: 2
  }

  if (!fragments.length) return;

  return (
    <MolDisplayer smiles={fragments} queryParams={queryParams} selectable_molecules={true}/>
  )
}




const UIAddMonomers = ({ children }) => {
  const [smiles, setSmiles] = useState('CCO'); // To store the input SMILES string
  const [selectedBonds, setSelectedBonds] = useState([]); // To store the input SMILES string
  const [fragments, setFragments] = useState([]); // To store the fragments after API response


  const handleChangeSmiles = (value) => {
    setSmiles(value);
    setSelectedBonds([]);
    setFragments([]);
  }

  const handleSelectedBonds = (bondIndex) => {
    if (selectedBonds.includes(bondIndex)) {
      setSelectedBonds(selectedBonds.filter((idx) => idx !== bondIndex));
    } else {
      setSelectedBonds([...selectedBonds, bondIndex]);
    }
  }

  const handleComplete = () => {
    console.log("Form completed!");
    // Handle form completion logic here
  };

  const tabChanged = async ({ prevIndex, nextIndex }) => {
    if (nextIndex === 3) {
      // console.log("Fragmenting molecule...");
    }
  };

  // Fragment the molecule when selected bonds change
  useEffect(() => {
    if (!selectedBonds.length) {
      setFragments([]);
      return;
    }

    const payload = { smiles: smiles, bonds: selectedBonds };

    // Define an async function to make the API call
    const fragmentMolecule = async () => {
      console.log("Fragmenting molecule...");
      try {
        // Make POST request to the API
        const response = await fetch('http://0.0.0.0:5000/api/rdkit/fragment-molecule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        // Get JSON data from response
        const result = await response.json();

        // Set fragments state with data from API response
        setFragments(result.data);
        console.log("Fragments received: ", result.data);
      } catch (error) {
        console.error('Error while fragmenting the molecule:', error);
      }
    };

    // Call the async function
    fragmentMolecule();
  }, [selectedBonds]); // Dependency array includes selectedBonds and smiles



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
          <TabStep1 smiles={smiles} handleChangeSmiles={handleChangeSmiles} />
        </FormWizard.TabContent>

        <FormWizard.TabContent title="Select bond(s)" icon="ti-settings">
          <div className='grid grid-cols-2'>
            <div className='p-4 m-2'>
              <h2 className='text-xl font-medium border-b-4 border-cyan-800/35 pb-4'>Selected bonds</h2>
              <ul className='mt-8'>
                {/* Conditional rendering to display "None" if selectedBonds is empty */}
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
          <TabStep3 fragments={fragments} />
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