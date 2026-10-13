import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

import {
    useScaffoldMappings,
    computeAutoRanges,
    normalizePatch,
    normalizeResidues,
    repackChainMappings,
    resolveIndex,
    resolveTemplateSlice,
} from '../useScaffoldMappings';

// Backend residue-slot model for chain A (slot index -> residue):
//   0:10 ALA  1:11 AIB (HETATM)  2:12 GLY  3:12A SER  4:14 LYS
//   5:15 GLY (unresolved)  6:16 SER (unresolved)  7:17 LEU  8:20 VAL
const chainA = {
    id: 'A',
    residues: [
        { resid: 10, icode: '', resname: 'ALA', resn: 'A', observed: true, is_modified: false },
        { resid: 11, icode: '', resname: 'AIB', resn: 'X', observed: true, is_modified: true },
        { resid: 12, icode: '', resname: 'GLY', resn: 'G', observed: true },
        { resid: 12, icode: 'A', resname: 'SER', resn: 'S', observed: true },
        { resid: 14, icode: '', resname: 'LYS', resn: 'K', observed: true },
        { resid: 15, icode: '', resname: 'GLY', resn: 'G', observed: false, missing_source: 'remark465' },
        { resid: 16, icode: '', resname: 'SER', resn: 'S', observed: false, missing_source: 'remark465' },
        { resid: 17, icode: '', resname: 'LEU', resn: 'L', observed: true },
        { resid: 20, icode: '', resname: 'VAL', resn: 'V', observed: true },
    ],
};
const template = { id: 'tmpl-1', chainData: [chainA], chains: ['A'] };
const aa = (n) => Array.from({ length: n }, () => ({ m_type: 'aa' }));
const keys = (rs) => rs.map((r) => `${r.resid}${r.icode ?? ''}`);

describe('template residue helpers', () => {
    const residues = normalizeResidues(chainA);

    it('normalizes backend slot fields (observed defaults to true)', () => {
        expect(residues[1]).toMatchObject({ code: 'AIB', resid: 11, isModified: true, observed: true });
        expect(residues[3]).toMatchObject({ resid: 12, icode: 'A' });
        expect(residues[5]).toMatchObject({ resid: 15, observed: false });
        expect(normalizeResidues({ residues: [{ resid: 1, resname: 'ALA' }] })[0].observed).toBe(true);
    });

    it('resolves numbers, insertion codes and closest lower slots', () => {
        expect(resolveIndex(residues, 12)).toBe(2);
        expect(resolveIndex(residues, 12, { preferLast: true })).toBe(3);
        expect(resolveIndex(residues, 12, { icode: 'A' })).toBe(3);
        expect(resolveIndex(residues, 12, { preferLast: true, icode: '' })).toBe(2);
        expect(resolveIndex(residues, 13)).toBe(3);
        expect(resolveIndex(residues, 1)).toBe(0);
    });

    it('slices by template slots including unresolved ones', () => {
        const slice = resolveTemplateSlice({ template, mapping: { chainId: 'A', start: 12, end: 17 }, designedLength: 6 });
        expect(keys(slice.residues)).toEqual(['12', '12A', '14', '15', '16', '17']);

        const exact = resolveTemplateSlice({
            template,
            mapping: { chainId: 'A', start: 12, startIcode: 'A', end: 14, endIcode: '' },
            designedLength: 2,
        });
        expect(keys(exact.residues)).toEqual(['12A', '14']);
    });

    it('allocates auto ranges in slots with boundary insertion codes', () => {
        const ranges = computeAutoRanges(residues, [3, 3, 5], 'A');
        expect(ranges[0]).toEqual({ start: 10, end: 12, startIcode: '', endIcode: '', chainId: 'A' });
        expect(ranges[1]).toEqual({ start: 12, end: 15, startIcode: 'A', endIcode: '', chainId: 'A' });
        expect(ranges[2]).toEqual({ start: 16, end: 20, startIcode: '', endIcode: '', chainId: 'A' });

        // The two first ranges resolve to disjoint slices despite sharing number 12.
        const s0 = resolveTemplateSlice({ template, mapping: { chainId: 'A', ...ranges[0] }, designedLength: 3 });
        const s1 = resolveTemplateSlice({ template, mapping: { chainId: 'A', ...ranges[1] }, designedLength: 3 });
        expect(keys(s0.residues)).toEqual(['10', '11', '12']);
        expect(keys(s1.residues)).toEqual(['12A', '14', '15']);
    });

    it('repacks consecutive mappings by slot span across numbering jumps', () => {
        const raw = [
            { enabled: true, chainId: 'A', start: 10, end: 11 },
            { enabled: true, chainId: 'A', start: 10, end: 12 }, // 4 slots: 10, 11, 12, 12A
        ];
        const next = repackChainMappings(raw, 'A', template);
        expect(next[0]).toMatchObject({ start: 10, end: 11, startIcode: '', endIcode: '' });
        // Pushed after the first mapping, keeping its 4-slot span: 12, 12A, 14, 15.
        expect(next[1]).toMatchObject({ start: 12, end: 15, startIcode: '', endIcode: '' });
    });

    it('preserves the slot span when only start changes', () => {
        const current = { start: 10, end: 12, enabled: true }; // 4 slots: 10, 11, 12, 12A
        const patched = normalizePatch({ start: 14 }, current, residues);
        expect(patched).toMatchObject({ start: 14, end: 17, startIcode: null, endIcode: '' });
    });

    it('clears the boundary insertion code when a number is typed', () => {
        const current = { start: 12, startIcode: 'A', end: 14, endIcode: '', enabled: true };
        expect(normalizePatch({ end: 17 }, current, residues)).toMatchObject({ end: 17, endIcode: null });
    });
});

describe('useScaffoldMappings', () => {
    beforeEach(() => {
        try { window.localStorage.clear(); } catch { /* ignore */ }
    });
    afterEach(() => cleanup());

    it('sends seq_idx so a mapping targets the right designed chain', () => {
        const rows = [aa(3), aa(2)];
        const { result } = renderHook(() => useScaffoldMappings(rows, template));

        // Both rows are auto-enabled; disable the first designed chain.
        act(() => result.current.handleEditScaffoldMapping(0, { enabled: false }));

        const payload = result.current.scaffoldMappingPayload;
        expect(payload.template_id).toBe('tmpl-1');
        expect(payload.mappings).toHaveLength(1);
        expect(payload.mappings[0]).toMatchObject({ chain_id: 'A', seq_idx: 1, start: 12, start_icode: 'A' });
    });

    it('exposes unresolved slots as unconstrained residues and avoids false overlaps', () => {
        const rows = [aa(3), aa(5)];
        const { result } = renderHook(() => useScaffoldMappings(rows, template));
        const [first, second] = result.current.scaffoldMappings;

        expect(keys(first.templateResidues)).toEqual(['10', '11', '12']);
        expect(keys(second.templateResidues)).toEqual(['12A', '14', '15', '16', '17']);
        expect(second.templateResidues.map((r) => r.observed)).toEqual([true, true, false, false, true]);
        expect(second.sequence).toBe('S-K-X-X-L');
        expect(result.current.hasTemplateOverlap()).toBe(false);
    });
});
