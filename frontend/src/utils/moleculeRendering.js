// Utilities for molecule SVG rendering requests.
// Keeps client-side sizing/normalization consistent across admin and editor UIs.

function safeString(value) {
  if (value == null) return '';
  return String(value);
}

export function estimateAtomCountFromSmiles(smiles) {
  if (!smiles || typeof smiles !== 'string') return 0;
  const str = safeString(smiles);

  // Count bracket atoms first (each [...] represents one atom)
  const bracketAtoms = (str.match(/\[[^\]]+\]/g) || []).length;
  const withoutBrackets = str.replace(/\[[^\]]+\]/g, '');

  // Count common element tokens (2-letter first)
  const tokens = withoutBrackets.match(
    /Cl|Br|Si|Se|Na|Li|Mg|Al|Ca|Zn|Fe|Cu|Mn|Co|Ni|Ag|Au|Sn|Hg|Pb|[B-IK-Z][a-z]?|[bcnops]/g,
  );
  const tokenAtoms = tokens ? tokens.length : 0;

  return bracketAtoms + tokenAtoms;
}

export function computePreferredSizeFromSmiles(smiles, { min = 450, max = 2400, base = 450, perAtom = 20 } = {}) {
  const atomCount = estimateAtomCountFromSmiles(smiles);
  const scaled = Math.round(base + atomCount * perAtom);
  return Math.max(min, Math.min(max, scaled));
}

export function computePreferredSizeFromSmilesList(smilesList, options) {
  const arr = Array.isArray(smilesList) ? smilesList : [smilesList];
  let maxAtoms = 0;
  for (const s of arr) {
    const n = estimateAtomCountFromSmiles(typeof s === 'string' ? s : '');
    if (n > maxAtoms) maxAtoms = n;
  }
  const scaled = Math.round((options?.base ?? 450) + maxAtoms * (options?.perAtom ?? 20));
  const min = options?.min ?? 450;
  const max = options?.max ?? 2400;
  return Math.max(min, Math.min(max, scaled));
}

export function normalizeMoleculeSvgQueryParams(queryParams, smiles) {
  const raw = (queryParams && typeof queryParams === 'object') ? queryParams : {};

  // Allow some common aliases (camelCase → snake_case). Keep explicit snake_case if present.
  const aliases = {
    hExplicitOnly: 'h_explicit_only',
    addBondIndices: 'add_bond_indices',
    addAtomIndices: 'add_atom_indices',
    annotateDummyAtoms: 'is_annotate_dummy_atoms',
    optimize2D: 'optimize_2d',
    addH: 'is_add_h',
    removeH: 'is_remove_h',
    molsPerRow: 'mols_per_row',
    minFontSize: 'min_font_size',
    maxFontSize: 'max_font_size',
    formatSvg: 'format_svg',
  };

  const normalized = {};
  for (const [k, v] of Object.entries(raw)) {
    // Client-only flags must not be sent to server.
    if (k === 'autoSize' || k === 'autoSizeOptions') continue;

    const key = aliases[k] || k;
    if (v === undefined || v === null) continue;
    normalized[key] = v;
  }

  // Auto-size if caller didn't provide explicit width/height.
  const autoSize = raw.autoSize !== false;
  if (autoSize) {
    const toNumberOrNull = (v) => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const widthNum = toNumberOrNull(normalized.width);
    const heightNum = toNumberOrNull(normalized.height);

    const hasWidth = widthNum != null;
    const hasHeight = heightNum != null;

    // If caller did not provide both dimensions, compute a single square size
    // and set BOTH width/height to the same value.
    if (!hasWidth || !hasHeight) {
      const size = computePreferredSizeFromSmilesList(smiles, raw.autoSizeOptions);
      console.log('Auto-size molecule SVG to', size);   
      normalized.width = size;
      normalized.height = size;
    } else if (widthNum !== heightNum) {
      // Enforce square output when both are provided but inconsistent.
      // Pick the larger one to reduce risk of clipping.
      const size = Math.max(widthNum, heightNum);
      normalized.width = size;
      normalized.height = size;
    }
  }

  return normalized;
}
