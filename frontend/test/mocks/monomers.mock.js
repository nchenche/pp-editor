// Produces a monomer list with res-idx aligned to BILN token order
export function monomersMock(biln) {
  const tokens = (biln || '')
    .trim()
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .split(/[.-]/)
    .filter(Boolean);
  return tokens.map((t, i) => ({
    symbol: t.replace(/\([^)]*\)/g, ''),
    'res-idx': `res-${i}`,
    m_subtype: 'aa',
    m_RgroupIdx: [0, 1], // pretend both termini exist
  }));
}