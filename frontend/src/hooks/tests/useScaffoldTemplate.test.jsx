import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

import { useScaffoldTemplate } from '../useScaffoldTemplate';

function jsonResponse(body, { status = 200 } = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

const PDB_TEXT = [
    'ATOM      1  N   ALA A  10      11.104   6.134  -6.504  1.00  0.00           N',
    'ATOM      2  CA  ALA A  10      11.639   6.071  -5.147  1.00  0.00           C',
    'HETATM    3  N   AIB A  11      12.104   6.134  -6.504  1.00  0.00           N',
    'HETATM    4  CA  AIB A  11      12.639   6.071  -5.147  1.00  0.00           C',
    'HETATM    5  O   HOH A 500      30.000  30.000  30.000  1.00  0.00           O',
    'END',
].join('\n');

const BACKEND_CHAINS = [
    {
        id: 'A',
        length: 3,
        observed_length: 2,
        sequence: 'AX-',
        residues: [
            { resid: 10, icode: '', resname: 'ALA', resn: 'A', observed: true },
            { resid: 11, icode: '', resname: 'AIB', resn: 'X', observed: true, is_modified: true },
            { resid: 12, icode: '', resname: 'GLY', resn: 'G', observed: false, missing_source: 'remark465' },
        ],
    },
];

describe('useScaffoldTemplate.restoreTemplateById', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        try { window.localStorage.clear(); } catch { /* ignore */ }
    });
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('uses the backend residue-slot model when available', async () => {
        fetch.mockResolvedValueOnce(jsonResponse({ status: 'success', data: { pdb_text: PDB_TEXT, chains: BACKEND_CHAINS } }));
        const { result } = renderHook(() => useScaffoldTemplate());

        await act(async () => {
            const res = await result.current.restoreTemplateById('tmpl-backend');
            expect(res.ok).toBe(true);
        });

        const tmpl = result.current.scaffoldTemplate;
        expect(tmpl.chains).toEqual(['A']);
        expect(tmpl.chainData[0].residues.map((r) => r.resid)).toEqual([10, 11, 12]);
        expect(tmpl.chainData[0].residues[2].observed).toBe(false);
        expect(tmpl.text).toBe(PDB_TEXT);
    });

    it('falls back to parsing the PDB text (without waters) for older backends', async () => {
        fetch.mockResolvedValueOnce(jsonResponse({ status: 'success', data: { pdb_text: PDB_TEXT } }));
        const { result } = renderHook(() => useScaffoldTemplate());

        await act(async () => {
            await result.current.restoreTemplateById('tmpl-legacy');
        });

        const residues = result.current.scaffoldTemplate.chainData[0].residues;
        expect(residues.map((r) => r.resname)).toEqual(['ALA', 'AIB']);
    });
});
