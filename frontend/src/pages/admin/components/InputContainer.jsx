import { useState } from 'react';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Description, Field, Input, Label } from '@headlessui/react'
import { Button } from '@headlessui/react'

import { forwardRef } from 'react'


let MyCustomTab = forwardRef(function (props, ref) {
  return <button className="py-1 px-4 border-opacity-5 border-b-4 border-b-cyan-500  data-[selected]:border-opacity-30" ref={ref} {...props} />
})


const CustomField = ({ descr, name, onChange, value='' }) => {
  return (
      <Field>
        {/* <Label>SMILES</Label> */}
        <Description className="text-sm/6 p-1 text-slate-500">{descr}</Description>
        <Input
          type="text"
          name={name}
          value={value}
          className="border rounded-lg data-[hover]:shadow data-[focus]:bg-blue-100"
          onChange={onChange}
        />
      </Field>
  )
}


const InputContainer = ({smiles, setSmiles}) => {
  const [inputChemblValue, setInputChemblValue] = useState("");
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const handleSubmitClick = () => {
    console.log("selectedTabIndex:", selectedTabIndex);

    if (selectedTabIndex === 0) {
      console.log("smiles value:", smiles);
    } else
    console.log("chembl id:", inputChemblValue);

  }

  return (
    <div className='border-2 p-2 sm:w-full md:w-5/12 mx-auto flex flex-col'>
      <TabGroup className="border" selectedIndex={selectedTabIndex} onChange={(index) => setSelectedTabIndex(index)}>

        <TabList className="flex justify-center space-x-6">
          <Tab as={MyCustomTab}>SMILES</Tab>
          <Tab as={MyCustomTab}>CHEMBL ID</Tab>
        </TabList>

        <TabPanels className="border-2 border-slate-600 flex justify-center my-2 p-4">
          <TabPanel>            
            <CustomField 
            descr="Enter a SMILES" 
            name="input_smiles" 
            onChange={(e) => setSmiles(e.target.value)}
            value={smiles}></CustomField>
          </TabPanel>

          <TabPanel>
          <CustomField 
            descr="Enter a CHEMBL ID" 
            name="input_chemblid" 
            onChange={(e) => setInputChemblValue(e.target.value)} 
            value={inputChemblValue}></CustomField>
          </TabPanel>          
        </TabPanels>

      </TabGroup>

      <Button 
        className="rounded bg-sky-600 py-2 px-4 text-sm text-white data-[hover]:bg-sky-500 data-[active]:bg-sky-700 self-end"
        onClick={handleSubmitClick}
      >
        Submit
      </Button>
    </div>
  )
}

export default InputContainer;

