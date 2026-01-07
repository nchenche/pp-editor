import { useCallback, useEffect, useMemo, useState } from 'react';

const SCAFFOLD_MAPPINGS_STORAGE_KEY = 'pp-editor:scaffold-mappings:v1';

function readPersistedRawMappings() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window?.localStorage?.getItem(SCAFFOLD_MAPPINGS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

const emptyMapping = {
    enabled: false,
    chainId: null,
    start: null,
    end: null,
    offset: 0,
    // Internal flag: true if `offset` was auto-set to account for an N-ter cap.
    // Allows us to revert the offset when the cap is removed without clobbering
    // user-entered offsets.
    offsetAutoByCap: false,
    manualMasks: [],
    source: null,
    pdbPath: null,
    disabledByUser: false,
};

export function useScaffoldMappings(rowMonomerLists, scaffoldTemplate) {
    const [rawMappings, setRawMappings] = useState(() => {
        const persisted = readPersistedRawMappings();
        return Array.isArray(persisted) ? persisted : [];
    });

    useEffect(() => {
        try {
            window?.localStorage?.setItem(SCAFFOLD_MAPPINGS_STORAGE_KEY, JSON.stringify(rawMappings));
        } catch {
            /* ignore quota errors */
        }
    }, [rawMappings]);

    // AA-only lengths for each designed chain (caps excluded)
    const designAaLengths = useMemo(
        () => rowMonomerLists.map(countAaMonomers),
        [rowMonomerLists],
    );

    useEffect(() => {
        setRawMappings((prev) => {
            const targetLen = rowMonomerLists.length;
            if (prev.length === targetLen) return prev;
            return Array.from({ length: targetLen }, (_, idx) => {
                const current = prev[idx];
                return current ? { ...emptyMapping, ...current } : { ...emptyMapping };
            });
        });
    }, [rowMonomerLists]);

    const computedEntries = useMemo(
        () =>
            rawMappings.map((mapping, idx) => {
                const monList = rowMonomerLists[idx] || [];
                const { hasNTerCap, hasCTerCap } = detectCaps(monList);
                const aaLen = designAaLengths[idx] ?? null;

                if (!scaffoldTemplate) {
                    return {
                        mapping: {
                            ...emptyMapping,
                            ...mapping,
                            manualMasks: sanitizeManualMasks(mapping?.manualMasks),
                            sequence: '',
                            templateResidues: [],
                            trailingCapCount: hasCTerCap ? 1 : 0,
                        },
                        derivedStart: null,
                        derivedEnd: null,
                        derivedChainId: null,
                    };
                }

                const slice = resolveTemplateSlice({
                    template: scaffoldTemplate,
                    mapping,
                    designedLength: aaLen,
                });

                // Only expose as many template residues as there are AA monomers
                const effectiveLen =
                    aaLen != null && aaLen > 0
                        ? Math.min(aaLen, slice.residues.length)
                        : slice.residues.length;

                const effectiveResidues = slice.residues.slice(0, effectiveLen);

                const manualSet = buildMaskSet(mapping.manualMasks, effectiveLen);

                // masked residues still use '-' in the sequence string, but we keep
                // the full residue objects in templateResidues for the UI
                const maskedResidues = effectiveResidues.map((res, i) =>
                    manualSet.has(i) ? { ...res, resn: '-', code: res.code } : res,
                );

                const trailingCapCount = hasCTerCap ? 1 : 0;

                const sequence = mapping.enabled
                    ? formatSequence(
                        mapping.offset,
                        maskedResidues.map((r) => r.resn || r.code),
                        trailingCapCount,
                    )
                    : '';

                const pdbPath = scaffoldTemplate?.pdbPath || null;
                const name = scaffoldTemplate?.name || null;
                const source = scaffoldTemplate?.source || null;

                return {
                    mapping: {
                        ...emptyMapping,
                        ...mapping,
                        manualMasks: Array.from(manualSet).sort((a, b) => a - b),
                        sequence,
                        templateResidues: effectiveResidues,  // <-- only AA-length slice
                        source,
                        pdbPath,
                        name,
                        trailingCapCount,
                    },
                    derivedStart: slice.startNumber ?? null,
                    derivedEnd: slice.endNumber ?? null,
                    derivedChainId: slice.chainId ?? null,
                };
            }),
        [rawMappings, scaffoldTemplate, rowMonomerLists, designAaLengths],
    );

    const scaffoldMappings = useMemo(
        () => computedEntries.map((entry) => entry.mapping),
        [computedEntries],
    );

    const anyScaffoldEnabled = useMemo(
        () => scaffoldMappings.some((m) => m?.enabled),
        [scaffoldMappings],
    );

    const scaffoldMappingPayload = useMemo(() => {
        if (!anyScaffoldEnabled) return null;
        // send only enabled mappings, stripped of heavy fields
        const enabled = scaffoldMappings
            .map((m, idx) => ({ ...m, seqIdx: idx }))
            .filter((m) => m.enabled);

        if (!enabled.length) return null;
        return {
            template_id: scaffoldTemplate?.id ?? null,
            mappings: enabled.map((m) => ({
                enabled: m.enabled,
                chain_id: m.chainId,
                start: m.start,
                end: m.end,
                offset: m.offset,
                manual_masks: m.manualMasks ?? [],
            })),
        };
    }, [anyScaffoldEnabled, scaffoldMappings, scaffoldTemplate]);

    // AUTO-RANGE allocation now uses AA-only lengths (caps excluded)
    const autoRanges = useMemo(() => {
        if (!scaffoldTemplate) return rowMonomerLists.map(() => null);

        const firstChain = resolveChain(scaffoldTemplate, null);
        const residues = normalizeResidues(firstChain);
        if (!residues.length) return rowMonomerLists.map(() => null);

        let nextResid = residues[0]?.resid ?? 1;
        const maxResid = residues[residues.length - 1]?.resid ?? nextResid;
        const chainId = normalizeChainId(firstChain) ?? null;

        return rowMonomerLists.map((_, idx) => {
            const len = designAaLengths[idx] ?? 0; // AA count only
            if (len <= 0 || nextResid > maxResid) return null;

            const start = nextResid;
            let end = start + len - 1;
            if (end > maxResid) end = maxResid;

            nextResid = end + 1;
            return { start, end, chainId };
        });
    }, [scaffoldTemplate, rowMonomerLists, designAaLengths]);

    // Prefill start/end/chainId/enabled for uninitialized mappings
    useEffect(() => {
        if (!scaffoldTemplate) {
            // reset all mappings
            setRawMappings((prev) => prev.map(() => ({ ...emptyMapping })));
            return;
        };
        if (!autoRanges.length) return;

        setRawMappings((prev) => {
            let mutated = false;

            const next = prev.map((mapping = emptyMapping, idx) => {
                const auto = autoRanges[idx];
                if (!auto) return mapping;

                const candidate = { ...emptyMapping, ...mapping };

                const isUninitialized =
                    candidate.start == null &&
                    candidate.end == null &&
                    !candidate.enabled &&
                    !candidate.chainId;

                if (!isUninitialized || candidate.disabledByUser) return mapping;

                mutated = true;
                return {
                    ...candidate,
                    enabled: true,
                    chainId: auto.chainId,
                    start: auto.start,
                    end: auto.end,
                };
            });

            return mutated ? next : prev;
        });
    }, [autoRanges, scaffoldTemplate]);

    // AUTO N-terminal offset for N-cap:
    // - if first monomer is a cap and offset is 0 → offset = 1 (and mark auto)
    // - if cap is later removed and offset was auto-set → revert offset back to 0
    useEffect(() => {
        setRawMappings((prev) => {
            let mutated = false;
            const next = prev.map((mapping = emptyMapping, idx) => {
                const monList = rowMonomerLists[idx] || [];
                const { hasNTerCap } = detectCaps(monList);
                const current = { ...emptyMapping, ...mapping };

                if (!current.enabled || current.disabledByUser) return mapping;

                const offset = Number(current.offset) || 0;
                const wasAuto = !!current.offsetAutoByCap;

                // Cap present: only auto-set when offset is still untouched.
                if (hasNTerCap) {
                    if (offset !== 0) return mapping; // user already set offset
                    if (wasAuto) return mapping; // already auto-set
                    mutated = true;
                    return { ...current, offset: 1, offsetAutoByCap: true };
                }

                // Cap removed: revert only if we previously auto-set it.
                if (!hasNTerCap && wasAuto) {
                    if (offset === 0) {
                        // Offset already cleared; just drop the flag.
                        mutated = true;
                        return { ...current, offsetAutoByCap: false };
                    }
                    if (offset === 1) {
                        mutated = true;
                        return { ...current, offset: 0, offsetAutoByCap: false };
                    }
                    // Unexpected: offset changed while still flagged auto. Be conservative and
                    // only clear the flag (do not clobber the user's value).
                    mutated = true;
                    return { ...current, offsetAutoByCap: false };
                }

                return mapping;
            });
            return mutated ? next : prev;
        });
    }, [rowMonomerLists]);

    const handleEditScaffoldMapping = useCallback(
        (seqIdx, patch) => {
            setRawMappings((prev) => {
                let next = prev.slice();
                const current = { ...emptyMapping, ...(next[seqIdx] || {}) };

                const enablingNow =
                    patch &&
                    Object.prototype.hasOwnProperty.call(patch, 'enabled') &&
                    patch.enabled === true &&
                    !current.enabled;

                // Track explicit user disabling/enabling
                let patchWithDisableFlag = patch;
                if (patch && Object.prototype.hasOwnProperty.call(patch, 'enabled')) {
                    if (patch.enabled === false) {
                        patchWithDisableFlag = { ...patch, disabledByUser: true };
                    } else if (patch.enabled === true) {
                        patchWithDisableFlag = { ...patch, disabledByUser: false };
                    }
                }

                // Any explicit offset edit is considered user-driven; stop treating it as auto.
                if (patchWithDisableFlag && Object.prototype.hasOwnProperty.call(patchWithDisableFlag, 'offset')) {
                    patchWithDisableFlag = { ...patchWithDisableFlag, offsetAutoByCap: false };
                }

                // If enabling a chain that has no chainId/start/end yet, immediately prefill it.
                // This avoids the "Auto" (null chain) situation.
                if (enablingNow && scaffoldTemplate) {
                    const wasUninitialized =
                        current.start == null &&
                        current.end == null &&
                        !current.chainId;

                    // Default chain id = first template chain
                    const firstChain = resolveChain(scaffoldTemplate, null);
                    const defaultChainId = normalizeChainId(firstChain) || null;

                    if (wasUninitialized) {
                        const auto = autoRanges[seqIdx] || null;

                        patchWithDisableFlag = {
                            ...patchWithDisableFlag,
                            chainId: auto?.chainId ?? defaultChainId,
                            start: auto?.start ?? current.start ?? null,
                            end: auto?.end ?? current.end ?? null,
                        };
                    } else if (
                        (patchWithDisableFlag?.chainId ?? current.chainId) == null &&
                        defaultChainId
                    ) {
                        // Even if start/end exist, never leave chainId null when enabled
                        patchWithDisableFlag = {
                            ...patchWithDisableFlag,
                            chainId: defaultChainId,
                        };
                    }
                }

                // Determine which chain we are editing (patch overrides current)
                const effectiveChainId = patchWithDisableFlag?.chainId ?? current.chainId ?? null;

                // Compute resid bounds for that chain, if possible
                let minResid = null;
                let maxResid = null;
                if (scaffoldTemplate && effectiveChainId != null) {
                    const chain = resolveChain(scaffoldTemplate, effectiveChainId);
                    const residues = normalizeResidues(chain);
                    if (residues.length) {
                        minResid = residues[0].resid;
                        maxResid = residues[residues.length - 1].resid;
                    }
                }

                const normalizedPatch = normalizePatch(
                    patchWithDisableFlag,
                    current,
                    minResid,
                    maxResid,
                );
                next[seqIdx] = { ...current, ...normalizedPatch };

                // After applying this patch, re-pack all mappings on this template chain
                if (scaffoldTemplate && effectiveChainId != null) {
                    next = repackChainMappings(next, effectiveChainId, scaffoldTemplate);
                }

                return next;
            });
        },
        [scaffoldTemplate, autoRanges],
    );

    const hasTemplateOverlap = useCallback(() => {
        // console.log('Checking template overlap for mappings:', scaffoldMappings);
        if (!Array.isArray(scaffoldMappings) || !scaffoldMappings.length) return false;

        const byChain = new Map();

        scaffoldMappings.forEach((m, seqIdx) => {
            if (!m?.enabled) return;
            if (m.chainId == null) return;
            if (m.start == null || m.end == null) return;

            const startNum = Number(m.start);
            const endNum = Number(m.end);
            if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) return;

            const s = Math.min(startNum, endNum);
            const e = Math.max(startNum, endNum);

            const arr = byChain.get(m.chainId) || [];
            arr.push({ seqIdx, start: s, end: e });
            byChain.set(m.chainId, arr);
        });

        for (const [, ranges] of byChain.entries()) {
            if (ranges.length < 2) continue;
            ranges.sort((a, b) => a.start - b.start);
            let prev = ranges[0];
            for (let i = 1; i < ranges.length; i++) {
                const cur = ranges[i];
                if (cur.start <= prev.end) {
                    return true; // overlap detected on this chain
                }
                prev = cur;
            }
        }
        return false;
    }, [scaffoldMappings]);

    return { scaffoldMappings, anyScaffoldEnabled, scaffoldMappingPayload, handleEditScaffoldMapping, hasTemplateOverlap };
}

function repackChainMappings(rawMappings, chainId, scaffoldTemplate) {
    const next = rawMappings.map((m) => ({ ...emptyMapping, ...m }));

    const chain = resolveChain(scaffoldTemplate, chainId);
    const residues = normalizeResidues(chain);
    if (!residues.length) return rawMappings;

    const minResid = residues[0].resid;
    const maxResid = residues[residues.length - 1].resid;

    // Collect enabled mappings on this template chain, keep original seqIdx order
    const group = next
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m.enabled && (m.chainId ?? null) === chainId && m.start != null && m.end != null);

    if (group.length === 0) return rawMappings;

    // Sort by seqIdx (design chain order)
    group.sort((a, b) => a.idx - b.idx);

    let prevEnd = null;

    for (const { m, idx } of group) {
        let start = Number(m.start);
        let end = Number(m.end);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

        let spanLen = Math.max(1, end - start + 1);

        if (prevEnd == null) {
            // First mapping: clamp requested start into [minResid, maxResid]
            if (start < minResid) start = minResid;
        } else {
            // Subsequent mappings start at least after previous end
            start = Math.max(start, prevEnd + 1, minResid);
        }
        if (start > maxResid) start = maxResid;

        end = start + spanLen - 1;
        if (end > maxResid) end = maxResid;
        if (end < start) end = start;

        next[idx] = {
            ...next[idx],
            start,
            end,
        };
        prevEnd = end;
    }
    return next;
}

function countAaMonomers(monList) {
    if (!Array.isArray(monList)) return 0;
    return monList.filter((m) => m?.m_type === 'aa').length;
}

function detectCaps(monList) {
    const arr = Array.isArray(monList) ? monList : [];
    if (!arr.length) return { hasNTerCap: false, hasCTerCap: false };

    const first = arr[0];
    const last = arr[arr.length - 1];
    const hasNTerCap = first?.m_type === 'cap';
    const hasCTerCap = last?.m_type === 'cap';

    return { hasNTerCap, hasCTerCap };
}

function formatSequence(offset, residues, trailingCapCount = 0) {
    const prefix = Array.from({ length: Math.max(0, Number(offset) || 0) }, () => 'X');
    const suffix = Array.from({ length: Math.max(0, trailingCapCount || 0) }, () => 'X');
    // replace any '-' i residues with 'X' in the sequence string
    const cleanedResidues = residues.map((r) => (r === '-' ? 'X' : r));
    return [...prefix, ...cleanedResidues, ...suffix].join('-');
}

function normalizePatch(
    patch,
    current,
    minResid = null,
    maxResid = null,
) {
    if (!patch) return {};
    const merged = { ...patch };

    const startChanged =
        Object.prototype.hasOwnProperty.call(patch, 'start') && patch.start !== current.start;
    const endChanged =
        Object.prototype.hasOwnProperty.call(patch, 'end') && patch.end !== current.end;
    const disablingNow =
        Object.prototype.hasOwnProperty.call(patch, 'enabled') &&
        patch.enabled === false &&
        current.enabled;

    if (startChanged || endChanged || disablingNow) {
        merged.manualMasks = [];
    }

    // ...existing code...
    let start =
        Object.prototype.hasOwnProperty.call(patch, 'start')
            ? patch.start
            : current.start;
    let end =
        Object.prototype.hasOwnProperty.call(patch, 'end')
            ? patch.end
            : current.end;

    start = start != null ? Number(start) : null;
    end = end != null ? Number(end) : null;

    if (start != null && !Number.isFinite(start)) start = current.start ?? null;
    if (end != null && !Number.isFinite(end)) end = current.end ?? null;

    // Clamp start/end to template chain resid range if known
    if (minResid != null) {
        if (start != null && start < minResid) start = minResid;
        if (end != null && end < minResid) end = minResid;
    }
    if (maxResid != null) {
        if (start != null && start > maxResid) start = maxResid;
        if (end != null && end > maxResid) end = maxResid;
    }

    // NEW: if only start changed, preserve the previous span length (prevents end "growing")
    if (startChanged && !endChanged) {
        const cs = Number(current.start);
        const ce = Number(current.end);
        if (Number.isFinite(cs) && Number.isFinite(ce)) {
            const span = Math.max(1, ce - cs + 1);
            if (start != null) {
                end = start + span - 1;
                if (maxResid != null && end > maxResid) end = maxResid;
            }
        }
    }

    // Ensure end is not before start
    if (start != null && (end == null || end < start)) {
        end = start;
    }

    merged.start = start;
    merged.end = end;

    return merged;
}

function sanitizeManualMasks(list) {
    if (!Array.isArray(list)) return [];
    return Array.from(new Set(list.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0))).sort(
        (a, b) => a - b,
    );
}

function buildMaskSet(list, maxLen) {
    const set = new Set();
    for (const idx of sanitizeManualMasks(list)) {
        if (idx < maxLen) set.add(idx);
    }
    return set;
}


function resolveTemplateSlice({ template, mapping, designedLength }) {
    const chain = resolveChain(template, mapping.chainId);
    const residues = normalizeResidues(chain);  // [{ code: 'THR', resid: 16, resn: 'T' }, ...]
    if (!residues.length) {
        return { residues: [], startNumber: null, endNumber: null, chainId: null };
    }

    const firstResid = residues[0].resid;
    const lastResid = residues[residues.length - 1].resid;

    // Use mapping.start if provided, otherwise start at the first real resid
    let startNumber =
        mapping.start != null ? Number(mapping.start) : firstResid;
    if (!Number.isFinite(startNumber)) startNumber = firstResid;

    // Clamp start to valid template range
    if (startNumber < firstResid) startNumber = firstResid;
    if (startNumber > lastResid) startNumber = lastResid;

    // Compute target end (mapping.end or inferred from designed length)
    let targetEnd;
    if (mapping.end != null) {
        targetEnd = Number(mapping.end);
    } else if (designedLength != null) {
        targetEnd = startNumber + Math.max(designedLength - 1, 0);
    } else {
        targetEnd = lastResid;
    }
    if (!Number.isFinite(targetEnd)) targetEnd = lastResid;

    // Clamp end inside [startNumber, lastResid]
    if (targetEnd < startNumber) targetEnd = startNumber;
    if (targetEnd > lastResid) targetEnd = lastResid;

    const startIdx = resolveIndex(residues, startNumber) ?? 0;
    const endIdx = resolveIndex(residues, targetEnd) ?? startIdx;

    if (endIdx < startIdx) {
        return {
            residues: [],
            startNumber: null,
            endNumber: null,
            chainId: normalizeChainId(chain) ?? null,
        };
    }

    const slice = residues.slice(startIdx, endIdx + 1);
    return {
        residues: slice,
        startNumber: slice[0]?.resid ?? null,
        endNumber: slice[slice.length - 1]?.resid ?? null,
        chainId: normalizeChainId(chain) ?? null,
    };
}

function resolveChain(template, chainId) {
    // Support both legacy `chainData` and new `chains` from the backend
    const chains =
        (Array.isArray(template?.chainData) && template.chainData.length
            ? template.chainData
            : Array.isArray(template?.chains)
                ? template.chains
                : []);

    if (!chains.length) return null;
    if (!chainId) return chains[0];
    return chains.find((chain) => normalizeChainId(chain) === chainId) ?? chains[0];
}

function normalizeChainId(chain) {
    return (
        chain?.id ??
        chain?.chainId ??
        chain?.chain_id ??
        chain?.name ??
        chain?.label ??
        ''
    ).toString();
}

function normalizeResidues(chain) {
    if (!chain) return [];
    if (Array.isArray(chain.residues) && chain.residues.length) {
        return chain.residues
            .map((res, idx) => ({
                code: normalizeResidueCode(res?.resname ?? res?.name ?? res?.label ?? res?.code ?? res?.type),
                resid:
                    res?.resid ??
                    res?.resSeq ??
                    res?.seqNumber ??
                    res?.sequenceNumber ??
                    res?.index ??
                    res?.idx ??
                    idx + 1,
                resn: res?.resn,
            }))
            .filter((res) => !!res.code);
    }
    if (typeof chain.sequence === 'string' && chain.sequence.trim()) {
        const tokens = chain.sequence.split(/[\s,.-]+/).filter(Boolean);
        return tokens.map((token, idx) => ({
            code: normalizeResidueCode(token),
            resid: idx + 1,
        }));
    }
    if (Array.isArray(chain.sequence)) {
        return chain.sequence
            .map((token, idx) => ({
                code: normalizeResidueCode(token),
                resid: idx + 1,
            }))
            .filter((res) => !!res.code);
    }
    return [];
}

function normalizeResidueCode(raw) {
    if (!raw) return '';
    const code = raw.toString().trim().toUpperCase();
    if (!code) return '';
    return code.length === 1 ? code : code.slice(0, 3);
}

function resolveIndex(residues, targetResid) {
    if (targetResid == null) return null;

    // Exact match first
    let idx = residues.findIndex((res) => res.resid === targetResid);
    if (idx >= 0) return idx;

    // If numbering has gaps, pick the closest lower-or-equal residue
    for (let i = residues.length - 1; i >= 0; i--) {
        if (residues[i].resid <= targetResid) return i;
    }

    // Fallback to first residue
    return 0;
}