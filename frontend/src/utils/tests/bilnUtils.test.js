import { describe, it, expect } from 'vitest';
import { buildBilnFromRowMonomerLists, deriveSeqCount, decomposeBiln } from '../bilnUtils';

describe('buildBilnFromRowMonomerLists', () => {
    it('drops empty rows (no consecutive ..)', () => {
        const prevBiln = 'C-D-A-F-E-C-G-F-G-F.I-K-H';
        const rowLists = [
            [{ 'res-idx': 'res-0' }, { 'res-idx': 'res-1' }], // "C-D"
            [],                                               // empty after drag -> removed
            [{ 'res-idx': 'res-11' }, { 'res-idx': 'res-12' }, { 'res-idx': 'res-13' }], // "I-K-H"
        ];
        const out = buildBilnFromRowMonomerLists(rowLists, prevBiln);
        expect(out).toBe('C-D.K-H');
        expect(deriveSeqCount(out)).toBe(2);
    });

    it('keeps token order per row', () => {
        const prevBiln = 'A-B.C.D';
        const rowLists = [
            [{ 'res-idx': 'res-0' }, { 'res-idx': 'res-1' }],
            [{ 'res-idx': 'res-2' }, { 'res-idx': 'res-3' }],
        ];
        expect(buildBilnFromRowMonomerLists(rowLists, prevBiln)).toBe('A-B.C-D');
    });

    it('returns empty string for all-empty rows', () => {
        const out = buildBilnFromRowMonomerLists([[], []], 'A-B.C');
        expect(out).toBe('');
    });
});

describe('decomposeBiln', () => {
    it('splits tokens and separators', () => {
        const { tokens, seps } = decomposeBiln('A-B.C');
        expect(tokens).toEqual(['A', 'B', 'C']);
        expect(seps).toEqual(['-', '.']);
    });
});