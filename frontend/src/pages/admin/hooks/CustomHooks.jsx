import { useCallback, useEffect, useState, useRef, memo } from 'react';


// Custom Hooks
export const useFragments = (smiles, selectedBonds) => {
  const [fragments, setFragments] = useState([]);

  useEffect(() => {
    if (!selectedBonds.length) {
      setFragments([]);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fragmentMolecule = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/molecules/fragmentation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ smiles, bonds: selectedBonds }),
          signal,
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        setFragments(() => result.data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error while fragmenting the molecule:', error);
        }
      }
    };

    fragmentMolecule();

    return () => {
      controller.abort();
    };
  }, [selectedBonds]);

  return [fragments];
};


/* 
Wrapping handleFormSubmit in useCallback means that the definition of the handleFormSubmit 
function will be memoized — which means it will only be recreated if any of the dependencies 
(formData, fragments, selectedFragmentIndex) change.
*/
export const useFormSubmission = (formData, fragments, selectedFragmentIndex) => {
  const [molBlock, setMolBlock] = useState('');

  const handleFormSubmit = useCallback(() => {
    const payload = { form: formData, smiles: fragments[selectedFragmentIndex] };
    console.log('payload', payload);

    const generateMolBlock = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/molecules/molblock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        setMolBlock(result.data);
      } catch (error) {
        console.error('Error while generating molblock string:', error);
      }
    };

    generateMolBlock();
  }, [formData, fragments, selectedFragmentIndex]);

  return [handleFormSubmit, molBlock];
};