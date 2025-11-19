import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { API_BASE_URL } from '../../../config'; // adjust path if needed

const CustomField = ({ descr, name, onChange, value = '', error, helperText }) => {
  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {descr}
      </Typography>
      <TextField
        type="text"
        name={name}
        value={value}
        size="small"
        fullWidth
        onChange={onChange}
        error={!!error}
        helperText={helperText}
      />
    </Stack>
  );
};

const InputContainer = ({ smiles, handleChangeSmiles }) => {
  const [inputChemblValue, setInputChemblValue] = useState('');
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [loadingChembl, setLoadingChembl] = useState(false);
  const [chemblError, setChemblError] = useState('');

  const isSmilesTab = selectedTabIndex === 0;
  const isChemblTab = selectedTabIndex === 1;

  const handleSubmitClick = async () => {
    const id = inputChemblValue.trim();
    if (!id) {
      setChemblError('Please enter a CHEMBL ID.');
      return;
    }

    setChemblError('');
    setLoadingChembl(true);

    try {
      const baseUrl = 'https://www.ebi.ac.uk/chembl/api/data/molecule';
      const url = `${baseUrl}.json?molecule_chembl_id=${encodeURIComponent(id)}`;

      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error('Failed to retrieve data from ChEMBL.');
      }

      const data = await resp.json();
      const molecules = data?.molecules || [];

      if (!Array.isArray(molecules) || molecules.length === 0) {
        throw new Error('No molecule found for this CHEMBL ID.');
      }

      const structures = molecules[0]?.molecule_structures;
      const smiles = structures?.canonical_smiles;

      if (!smiles) {
        throw new Error('No SMILES available for this CHEMBL ID.');
      }

      // Update SMILES field in parent
      handleChangeSmiles(smiles);

      // Switch back to SMILES tab so user sees the result
      setSelectedTabIndex(0);
    } catch (e) {
      setChemblError(e.message || 'Error contacting ChEMBL service.');
    } finally {
      setLoadingChembl(false);
    }
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        width: '100%',
        maxWidth: '48rem',
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Tabs
        value={selectedTabIndex}
        onChange={(_, idx) => setSelectedTabIndex(idx)}
        centered
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="SMILES" />
        <Tab label="CHEMBL ID" />
      </Tabs>

      {/* SMILES tab */}
      {isSmilesTab && (
        <Box sx={{ mt: 1 }}>
          <CustomField
            descr="Enter a SMILES"
            name="input_smiles"
            onChange={(e) => handleChangeSmiles(e.target.value)}
            value={smiles}
          />
        </Box>
      )}

      {/* CHEMBL tab */}
      {isChemblTab && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <CustomField
            descr="Enter a CHEMBL ID (e.g. CHEMBL25)"
            name="input_chemblid"
            onChange={(e) => {
              setInputChemblValue(e.target.value);
              setChemblError('');
            }}
            value={inputChemblValue}
            error={!!chemblError}
            helperText={chemblError || ' '}
          />

          {chemblError && (
            <Alert severity="error" variant="outlined">
              {chemblError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSubmitClick}
              disabled={loadingChembl}
            >
              {loadingChembl ? 'Loading…' : 'Fetch SMILES'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default InputContainer;

