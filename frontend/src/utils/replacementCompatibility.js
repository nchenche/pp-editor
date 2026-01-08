// Replacement compatibility helpers used by Home and the monomer library.

function normalizeBiln(biln) {
  return (biln || '')
    .trim()
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .replace(/\.+/g, '.')
    .replace(/\-+/g, '-');
}

function splitBilnTokens(biln) {
  const normalized = normalizeBiln(biln);
  const rawSegments = normalized ? normalized.split('.') : [];
  return rawSegments.map((seg) => (seg ? seg.split('-') : []).filter(Boolean));
}

function parseGlobalResIdx(sourceMonomer) {
  const raw = String(sourceMonomer?.['res-idx'] ?? '');
  const parts = raw.split('-');
  const idx = parseInt(parts?.[1], 10);
  return Number.isFinite(idx) ? idx : null;
}

function locateTokenByGlobalIdx(segments, globalIdx) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  let acc = 0;
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const seg = segments[segIdx] || [];
    const len = seg.length;
    if (globalIdx < acc + len) {
      const idxInSeg = globalIdx - acc;
      return { segIdx, idxInSeg, segLen: len, token: seg[idxInSeg] || '' };
    }
    acc += len;
  }
  return null;
}

export function deriveRequiredRgroupsForReplacement({ biln, sourceMonomer }) {
  const globalIdx = parseGlobalResIdx(sourceMonomer);
  if (globalIdx == null) return [];

  const segments = splitBilnTokens(biln);
  const loc = locateTokenByGlobalIdx(segments, globalIdx);
  if (!loc) return [];

  const required = new Set();

  // Implicit peptide connectivity within the segment:
  // - if there is a previous residue, we need rgroup 1
  // - if there is a next residue, we need rgroup 2
  if (loc.segLen > 1) {
    if (loc.idxInSeg > 0) required.add(1);
    if (loc.idxInSeg < loc.segLen - 1) required.add(2);
  }

  // Explicit bond annotations in the token: (bondId,rgroup)
  const tok = String(loc.token || '');
  const matches = Array.from(tok.matchAll(/\((\d+),(\d+)\)/g));
  for (const m of matches) {
    const rg = Number(m?.[2]);
    if (Number.isFinite(rg) && rg > 0) required.add(rg);
  }

  return Array.from(required).sort((a, b) => a - b);
}

export function availableRgroupsForMonomer(m) {
  const out = new Set();
  const arrays = [m?.m_Rgroups, m?.m_RgroupIdx, m?.m_attachmentPointIdx];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] != null) out.add(i + 1);
    }
  }
  return out;
}

export function getMissingRequiredRgroups({ candidate, requiredRgroups }) {
  const req = Array.isArray(requiredRgroups) ? requiredRgroups : [];
  if (req.length === 0) return [];

  const avail = availableRgroupsForMonomer(candidate);
  const missing = [];
  for (const r of req) {
    if (!avail.has(r)) missing.push(r);
  }
  return missing;
}

export function isReplacementCompatible({ candidate, requiredRgroups }) {
  return getMissingRequiredRgroups({ candidate, requiredRgroups }).length === 0;
}
