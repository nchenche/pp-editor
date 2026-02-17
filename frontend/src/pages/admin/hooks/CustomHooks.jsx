import { useCallback, useEffect, useState, useRef, memo } from 'react';

import { API_URL } from '../../../config';
import { apiFetch } from '../../../utils/api';

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
        const response = await apiFetch(`${API_URL}/molecules/fragmentation`, {
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
        const response = await apiFetch(`${API_URL}/molecules/molblock`, {
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


/**
 * Classify a molecule from its SMILES (aa / cap / other) and get optional form prefill.
 * Returns the `data` object from the response, or null on error.
 */
export async function classifyMolecule(smiles, { signal } = {}) {
  if (!smiles || !String(smiles).trim()) return null;

  try {
    const response = await apiFetch(`${API_URL}/molecules/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smiles: String(smiles).trim() }),
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json?.data ?? null;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    console.warn('[classifyMolecule] classification failed:', err?.message);
    return null;
  }
}


/**
 * Validate SDF content against the server before database ingestion.
 *
 * @param {{ sdf: string, strict?: boolean, functional_check?: boolean, owner_id?: string|null }} params
 * @param {{ signal?: AbortSignal, fetchFn?: Function }} options
 *   - fetchFn: override the default apiFetch (e.g. apiFetchNoOwner for admin pages)
 * @returns {Promise<{ valid: boolean, errors: Array, warnings: Array, parsed_tags?: object, functional_check?: object|null }>}
 */
export async function validateSdf(
  { sdf, strict = true, functional_check = true, owner_id = null },
  { signal, fetchFn } = {},
) {
  const doFetch = fetchFn || apiFetch;

  const response = await doFetch(`${API_URL}/molecules/validate-sdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdf, strict, functional_check, owner_id }),
    ...(signal ? { signal } : {}),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    // Server returned a structured error (e.g. 400 for bad SMILES)
    const msg = json?.error || json?.message || `Validation request failed (${response.status})`;
    throw new Error(msg);
  }

  return json?.data ?? { valid: true, errors: [], warnings: [] };
}