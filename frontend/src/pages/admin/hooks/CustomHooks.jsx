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


/** Max SDF payload size accepted by the backend (10 MB). */
export const MAX_SDF_VALIDATE_BYTES = 10 * 1024 * 1024;

/**
 * Normalize an error/warning entry to { code?, message } regardless of whether
 * the backend sent it as a plain string or an object.
 */
function normalizeIssue(entry) {
  if (typeof entry === 'string') return { message: entry };
  if (entry && typeof entry === 'object') {
    return {
      code: entry.code || undefined,
      message: entry.message || entry.code || 'Unknown issue',
    };
  }
  return { message: 'Unknown issue' };
}

/**
 * Validate SDF content against the server before database ingestion.
 *
 * The backend returns a **batch** response (`data.records[]`) even for a
 * single-record payload.  This helper normalises the response into a flat
 * shape that existing callers (and SdfValidationDialog) expect:
 *
 *   { valid, errors[], warnings[], parsed_tags?, functional_check? }
 *
 * For multi-record payloads, per-record issues are flattened into the
 * top-level arrays and prefixed with the record number and symbol/name.
 *
 * @param {{ sdf: string, strict?: boolean, functional_check?: boolean, owner_id?: string|null }} params
 * @param {{ signal?: AbortSignal, fetchFn?: Function }} options
 *   - fetchFn: override the default apiFetch (e.g. apiFetchNoOwner for admin pages)
 * @returns {Promise<{ valid: boolean, errors: Array<{code?,message}>, warnings: Array<{code?,message}>, parsed_tags?: object|null, functional_check?: object|null }>}
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
    const msg = json?.error || json?.message || `Validation request failed (${response.status})`;
    throw new Error(msg);
  }

  const data = json?.data;
  if (!data) return { valid: true, errors: [], warnings: [] };

  // --- Flatten batch response into the shape callers expect ---
  const records = Array.isArray(data.records) ? data.records : [];
  const isSingle = records.length <= 1;

  // Start with global-level issues
  const flatErrors = (data.errors || []).map((e) => {
    const n = normalizeIssue(e);
    return { ...n, message: isSingle ? n.message : `Global: ${n.message}` };
  });
  const flatWarnings = (data.warnings || []).map((w) => {
    const n = normalizeIssue(w);
    return { ...n, message: isSingle ? n.message : `Global: ${n.message}` };
  });

  // Per-record issues
  for (const rec of records) {
    const label = isSingle
      ? ''
      : `Record #${(rec.index ?? 0) + 1}${
          rec.parsed_tags?.symbol || rec.parsed_tags?.m_name
            ? ` (${rec.parsed_tags.symbol || rec.parsed_tags.m_name})`
            : ''
        }: `;

    for (const e of rec.errors || []) {
      const n = normalizeIssue(e);
      flatErrors.push({ ...n, message: `${label}${n.message}` });
    }
    for (const w of rec.warnings || []) {
      const n = normalizeIssue(w);
      flatWarnings.push({ ...n, message: `${label}${n.message}` });
    }

    // Functional check failure → append as an error entry
    if (rec.functional_check && rec.functional_check.ok === false && rec.functional_check.stage !== 'skipped') {
      flatErrors.push({
        code: `functional_check_${rec.functional_check.stage || 'unknown'}`,
        message: `${label}Functional check failed${rec.functional_check.stage ? ` at stage "${rec.functional_check.stage}"` : ''}: ${rec.functional_check.error || 'unknown error'}`,
      });
    }
  }

  return {
    valid: Boolean(data.valid),
    errors: flatErrors,
    warnings: flatWarnings,
    // Backward-compat shortcuts for single-record callers
    parsed_tags: isSingle ? (records[0]?.parsed_tags ?? data.parsed_tags ?? null) : null,
    functional_check: isSingle ? (records[0]?.functional_check ?? null) : null,
  };
}