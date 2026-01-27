/**
 * Client-side persistence of conformer job "inputs".
 *
 * Backend job serialization does not include `inputs.payload`, so to reliably restore
 * SS/template constraints for historical jobs we persist the submit payload locally,
 * keyed by job_id and scoped to (db, session, backend).
 */

import { getSessionId } from './sessionApi';

function normalizeBackendScope(baseUrlOverride) {
    const raw = String(baseUrlOverride ?? '').trim();
    if (!raw) return 'default';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const u = new URL(raw);
            return `${u.origin}${u.pathname}`;
        } catch {
            return raw;
        }
    }
    return raw;
}

function normalizeJobId(jobId) {
    const v = String(jobId ?? '').trim();
    return v || null;
}

function normalizeScopeId(value) {
    const v = String(value ?? '').trim();
    return v || null;
}

function getScopeId({ sessionId = null, ownerId = null } = {}) {
    const effectiveSessionId = sessionId || ownerId || getSessionId();
    return normalizeScopeId(effectiveSessionId) || 'anonymous';
}

// v2 key: intentionally does NOT include backend scope.
// This avoids drift between dev setups (Vite proxy "" vs absolute backend URL).
function getInputsStorageKeyV2({ jobId, dbName = 'pepedit', sessionId = null, ownerId = null } = {}) {
    const id = normalizeJobId(jobId);
    if (!id) return null;
    const scope = getScopeId({ sessionId, ownerId });
    return `pp-conformer-job-inputs:v2:${String(dbName || 'pepedit')}:${scope}:${id}`;
}

function getInputsStorageKey({ jobId, dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
    const id = normalizeJobId(jobId);
    if (!id) return null;

    const scope = getScopeId({ sessionId, ownerId });
    const backend = normalizeBackendScope(baseUrlOverride);

    return `pp-conformer-job-inputs:v1:${String(dbName || 'pepedit')}:${scope}:${backend}:${id}`;
}

export function setConformerJobInputsInStorage(jobId, inputs, { dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
    const keyV2 = getInputsStorageKeyV2({ jobId, dbName, sessionId, ownerId });
    const keyV1 = getInputsStorageKey({ jobId, dbName, sessionId, ownerId, baseUrlOverride });
    if (!keyV2 && !keyV1) return false;

    const payload = inputs && typeof inputs === 'object' ? inputs : null;
    if (!payload) return false;

    const value = JSON.stringify({
        ...payload,
        saved_at: new Date().toISOString(),
    });

    let ok = false;
    try {
        if (keyV2) {
            window?.localStorage?.setItem(keyV2, value);
            ok = true;
        }
        if (keyV1) {
            window?.localStorage?.setItem(keyV1, value);
            ok = true;
        }
    } catch {
        // ignore
    }
    return ok;
}

export function getConformerJobInputsFromStorage(jobId, { dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
    const keyV2 = getInputsStorageKeyV2({ jobId, dbName, sessionId, ownerId });
    const keyV1 = getInputsStorageKey({ jobId, dbName, sessionId, ownerId, baseUrlOverride });

    try {
        // v2 first (stable)
        if (keyV2) {
            const rawV2 = window?.localStorage?.getItem(keyV2);
            if (rawV2) {
                const parsed = JSON.parse(rawV2);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        }

        // then v1 for backwards compatibility
        if (keyV1) {
            const rawV1 = window?.localStorage?.getItem(keyV1);
            if (rawV1) {
                const parsed = JSON.parse(rawV1);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        }

        // final fallback: search any legacy v1 key for this job within same db+scope.
        // This covers drift where backend scope component changed (e.g. absolute URL vs proxy).
        const id = normalizeJobId(jobId);
        if (!id) return null;

        const scope = getScopeId({ sessionId, ownerId });
        const prefix = `pp-conformer-job-inputs:v1:${String(dbName || 'pepedit')}:${scope}:`;
        const suffix = `:${id}`;

        const ls = window?.localStorage;
        if (!ls) return null;

        for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (!k) continue;
            if (!k.startsWith(prefix)) continue;
            if (!k.endsWith(suffix)) continue;
            const raw = ls.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        }

        return null;
    } catch {
        return null;
    }
}

export function clearConformerJobInputsFromStorage(jobId, { dbName = 'pepedit', sessionId = null, ownerId = null, baseUrlOverride } = {}) {
    const keyV2 = getInputsStorageKeyV2({ jobId, dbName, sessionId, ownerId });
    const keyV1 = getInputsStorageKey({ jobId, dbName, sessionId, ownerId, baseUrlOverride });
    if (!keyV2 && !keyV1) return;
    try {
        if (keyV2) window?.localStorage?.removeItem(keyV2);
        if (keyV1) window?.localStorage?.removeItem(keyV1);
    } catch {
        // ignore
    }
}
