import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

import { useTemplateMappingReport, chainReport, blockingIssues } from '../useTemplateMappingReport';

function jsonResponse(body, { status = 200 } = {}) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const payload = {
    template_id: 'tmpl-1',
    mappings: [{ enabled: true, chain_id: 'A', start: 1, end: 3, offset: 0, manual_masks: [], seq_idx: 0 }],
};
const REPORT = {
    chains: [{ seq_idx: 0, chain_id: 'A', positions: [], summary: { constrained: 3 } }],
    issues: [
        { seq_idx: 0, index: 2, code: 'break_between_mapped', severity: 'error', message: 'break' },
        { seq_idx: 0, index: 1, code: 'chirality_mismatch', severity: 'warning', message: 'chir' },
    ],
    warnings: ['break', 'chir'],
    blocking: true,
    anchors_total: 12,
};

describe('useTemplateMappingReport', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('debounces the dry-run request and returns the report for the current inputs', async () => {
        fetch.mockResolvedValue(jsonResponse({ status: 'success', data: REPORT }));
        const { result } = renderHook((props) => useTemplateMappingReport(props), {
            initialProps: { biln: 'A-A-A', payload, enabled: true },
        });
        expect(result.current.loading).toBe(true);
        expect(fetch).not.toHaveBeenCalled();

        await act(async () => { await vi.advanceTimersByTimeAsync(450); });

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, init] = fetch.mock.calls[0];
        expect(url).toContain('/api/core/molecules/template_mapping_report');
        expect(JSON.parse(init.body)).toEqual({ biln: 'A-A-A', template_id: 'tmpl-1', scaffold_mappings: payload.mappings });
        expect(result.current.report).toEqual(REPORT);
        expect(result.current.loading).toBe(false);
    });

    it('never exposes a report computed for previous inputs', async () => {
        fetch.mockResolvedValue(jsonResponse({ status: 'success', data: REPORT }));
        const { result, rerender } = renderHook((props) => useTemplateMappingReport(props), {
            initialProps: { biln: 'A-A-A', payload, enabled: true },
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(450); });
        expect(result.current.report).not.toBeNull();

        rerender({ biln: 'A-A-G', payload, enabled: true });
        expect(result.current.report).toBeNull();
        expect(result.current.loading).toBe(true);
    });

    it('is idle when disabled and surfaces backend errors', async () => {
        const { result, rerender } = renderHook((props) => useTemplateMappingReport(props), {
            initialProps: { biln: 'A-A-A', payload, enabled: false },
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(450); });
        expect(fetch).not.toHaveBeenCalled();
        expect(result.current).toEqual({ report: null, error: null, loading: false });

        fetch.mockResolvedValue(jsonResponse({ status: 'error', message: "Template chain 'Z' not found" }, { status: 400 }));
        rerender({ biln: 'A-A-A', payload, enabled: true });
        await act(async () => { await vi.advanceTimersByTimeAsync(450); });
        expect(result.current.error).toBe("Template chain 'Z' not found");
        expect(result.current.report).toBeNull();
    });
});

describe('report helpers', () => {
    it('selects a chain report and blocking issues', () => {
        expect(chainReport(REPORT, 0).chain_id).toBe('A');
        expect(chainReport(REPORT, 1)).toBeNull();
        expect(blockingIssues(REPORT).map((i) => i.code)).toEqual(['break_between_mapped']);
        expect(blockingIssues(null)).toEqual([]);
    });
});
