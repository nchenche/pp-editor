import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/api';

const REPORT_URL = '/api/core/molecules/template_mapping_report';

/**
 * Pre-flight check of the template mapping: asks the backend for the same
 * per-position report the conformer job will apply (constrained / unresolved /
 * masked positions, rejected backbone atoms, chirality mismatches, backbone
 * breaks between bonded designed residues), without embedding.
 *
 * The request is debounced and keyed by a signature of its inputs; a report is
 * only returned while it matches the current inputs, so stale results are never
 * displayed against an edited mapping.
 *
 * @param {{ biln: string|null, payload: {template_id: string, mappings: object[]}|null,
 *           enabled: boolean, debounceMs?: number }} params
 * @returns {{ report: object|null, loading: boolean, error: string|null }}
 */
export function useTemplateMappingReport({ biln, payload, enabled, debounceMs = 400 }) {
    const signature = useMemo(() => {
        if (!enabled || !biln || !payload?.template_id || !Array.isArray(payload?.mappings) || !payload.mappings.length) {
            return null;
        }
        return JSON.stringify({ biln, template_id: payload.template_id, scaffold_mappings: payload.mappings });
    }, [biln, payload, enabled]);

    const [state, setState] = useState({ signature: null, report: null, error: null });

    useEffect(() => {
        if (!signature) return undefined;
        const controller = new AbortController();
        let cancelled = false;

        const timer = setTimeout(async () => {
            try {
                const res = await apiFetch(`${API_BASE_URL}${REPORT_URL}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: signature,
                    signal: controller.signal,
                });
                const body = await res.json().catch(() => null);
                if (cancelled) return;
                if (!res.ok || body?.status !== 'success') {
                    setState({ signature, report: null, error: body?.message || `Mapping check failed (status ${res.status})` });
                    return;
                }
                setState({ signature, report: body.data ?? null, error: null });
            } catch (e) {
                if (cancelled || e?.name === 'AbortError') return;
                setState({ signature, report: null, error: e?.message || 'Mapping check failed' });
            }
        }, debounceMs);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
        };
    }, [signature, debounceMs]);

    const fresh = !!signature && state.signature === signature;
    return {
        report: fresh ? state.report : null,
        error: fresh ? state.error : null,
        loading: !!signature && !fresh,
    };
}

/**
 * Report of one designed chain (by BILN chain index), or null.
 */
export function chainReport(report, seqIdx) {
    const chains = Array.isArray(report?.chains) ? report.chains : [];
    return chains.find((c) => Number(c?.seq_idx) === Number(seqIdx)) ?? null;
}

/**
 * Issues with severity "error" (block generation unless the user confirms).
 * @returns {Array<{ seq_idx: number, index: number, code: string, severity: string, message: string }>}
 */
export function blockingIssues(report) {
    const issues = Array.isArray(report?.issues) ? report.issues : [];
    return issues.filter((i) => i?.severity === 'error');
}
