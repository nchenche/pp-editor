import { describe, it, expect } from 'vitest';

import { getMappedTemplateResidues, groupResidueRuns } from './templateResidues';

describe('getMappedTemplateResidues', () => {
    const templateResidues = [
        { resid: 10, icode: '', observed: true },
        { resid: 11, icode: '', observed: true },
        { resid: 12, icode: '', observed: false }, // unresolved in template
        { resid: 13, icode: '', observed: true },
        { resid: 13, icode: 'A', observed: true },
        { resid: 20, observed: true }, // numbering jump, bonded
    ];

    it('skips masked and unresolved slots and keeps author numbering', () => {
        const out = getMappedTemplateResidues({ templateResidues, manualMasks: [1] });
        expect(out).toEqual([
            { resid: 10, icode: '' },
            { resid: 13, icode: '' },
            { resid: 13, icode: 'A' },
            { resid: 20, icode: '' },
        ]);
    });

    it('accepts snake_case masks and tolerates missing data', () => {
        expect(getMappedTemplateResidues({ templateResidues, manual_masks: [0, 3, 4, 5] })).toEqual([
            { resid: 11, icode: '' },
        ]);
        expect(getMappedTemplateResidues(null)).toEqual([]);
    });
});

describe('groupResidueRuns', () => {
    it('groups consecutive numbers and isolates insertion codes', () => {
        const { runs, withIcode } = groupResidueRuns([
            { resid: 10, icode: '' },
            { resid: 11, icode: '' },
            { resid: 13, icode: '' },
            { resid: 13, icode: 'A' },
            { resid: 14, icode: '' },
            { resid: 20, icode: '' },
        ]);
        expect(runs).toEqual([[10, 11], [13, 14], [20, 20]]);
        expect(withIcode).toEqual([{ resid: 13, icode: 'A' }]);
    });
});
