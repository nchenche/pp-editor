import { describe, it, expect } from 'vitest';
import { getConformerJobBiln } from './conformerJobBiln';

describe('getConformerJobBiln', () => {
    it('reads BILN from inputs.payload when result_ref has no BILN (current backend shape)', () => {
        const job = {
            job_id: 'j1',
            result_ref: { properties: { PDB: 'HETATM...' } },
            inputs: { payload: { biln: 'A-C(1,3)-G-C(1,3)' }, query_params: {} },
        };
        expect(getConformerJobBiln(job)).toBe('A-C(1,3)-G-C(1,3)');
    });

    it('prefers result_ref.properties.BILN, then top-level biln', () => {
        expect(getConformerJobBiln({
            result_ref: { properties: { BILN: 'A-A' } },
            biln: 'B-B',
            inputs: { payload: { biln: 'C-C' } },
        })).toBe('A-A');
        expect(getConformerJobBiln({ biln: 'B-B', inputs: { payload: { biln: 'C-C' } } })).toBe('B-B');
    });

    it('falls back across sources in order, skipping empty/null ones', () => {
        const listItem = { job_id: 'j1', inputs: null, result_ref: { properties: {} } };
        const stored = { inputs: { payload: { biln: 'G-G' } } };
        expect(getConformerJobBiln(listItem, null, stored)).toBe('G-G');
        expect(getConformerJobBiln(listItem, { inputs: { payload: { biln: 'K-K' } } }, stored)).toBe('K-K');
    });

    it('returns empty string when nothing is found', () => {
        expect(getConformerJobBiln()).toBe('');
        expect(getConformerJobBiln(null, {}, { inputs: { payload: { biln: '   ' } } })).toBe('');
    });
});
