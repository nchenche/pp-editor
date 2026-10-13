/**
 * Template residues actually constrained by a scaffold mapping: inside the displayed
 * slice (`templateResidues`), not manually masked, and resolved in the template
 * (unresolved residues have no coordinates). Items use PDB author numbering so they
 * can be matched with Mol* `auth_seq_id` / `pdbx_PDB_ins_code`.
 *
 * @param {{ templateResidues?: Array<{resid: number, icode?: string, observed?: boolean}>,
 *           manualMasks?: number[], manual_masks?: number[] }} mapping
 * @returns {Array<{ resid: number, icode: string }>}
 */
export function getMappedTemplateResidues(mapping) {
    const residues = Array.isArray(mapping?.templateResidues) ? mapping.templateResidues : [];
    const rawMasks = Array.isArray(mapping?.manualMasks)
        ? mapping.manualMasks
        : (Array.isArray(mapping?.manual_masks) ? mapping.manual_masks : []);
    const masks = new Set(
        rawMasks.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x >= 0).map((x) => Math.trunc(x)),
    );

    const out = [];
    residues.forEach((res, i) => {
        if (masks.has(i) || res?.observed === false) return;
        const resid = Number(res?.resid);
        if (!Number.isFinite(resid)) return;
        out.push({ resid, icode: String(res?.icode ?? '').trim() });
    });
    return out;
}

/**
 * Compact residues into consecutive author-number runs for range queries.
 * Residues with an insertion code cannot be expressed as numeric ranges and are
 * returned separately.
 *
 * @param {Array<{ resid: number, icode?: string }>} residues
 * @returns {{ runs: Array<[number, number]>, withIcode: Array<{ resid: number, icode: string }> }}
 */
export function groupResidueRuns(residues) {
    const runs = [];
    const withIcode = [];
    for (const r of Array.isArray(residues) ? residues : []) {
        if (r?.icode) {
            withIcode.push({ resid: r.resid, icode: r.icode });
            continue;
        }
        const last = runs[runs.length - 1];
        if (last && r.resid === last[1] + 1) {
            last[1] = r.resid;
        } else {
            runs.push([r.resid, r.resid]);
        }
    }
    return { runs, withIcode };
}
