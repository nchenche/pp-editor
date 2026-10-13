import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
    // Insertion codes of the boundary slots (null = unspecified: start resolves to the
    // first slot with that number, end to the last one).
    startIcode: null,
    endIcode: null,
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

    const prevTemplateIdRef = useRef(null);

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
                // the full residue objects in templateResidues for the UI.
                // Unresolved template residues (no coordinates) are never constrained.
                const maskedResidues = effectiveResidues.map((res, i) =>
                    manualSet.has(i) || res.observed === false ? { ...res, resn: '-', code: res.code } : res,
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
                start_icode: m.startIcode ?? null,
                end_icode: m.endIcode ?? null,
                offset: m.offset,
                manual_masks: m.manualMasks ?? [],
                // Designed chain (BILN chain index) this mapping applies to.
                seq_idx: m.seqIdx,
            })),
        };
    }, [anyScaffoldEnabled, scaffoldMappings, scaffoldTemplate]);

    // AUTO-RANGE allocation now uses AA-only lengths (caps excluded)
    const autoRanges = useMemo(() => {
        if (!scaffoldTemplate) return rowMonomerLists.map(() => null);

        const firstChain = resolveChain(scaffoldTemplate, null);
        const residues = normalizeResidues(firstChain);
        if (!residues.length) return rowMonomerLists.map(() => null);

        const chainId = normalizeChainId(firstChain) ?? null;
        return computeAutoRanges(residues, designAaLengths, chainId);
    }, [scaffoldTemplate, rowMonomerLists, designAaLengths]);

    // Prefill start/end/chainId/enabled for uninitialized mappings
    useEffect(() => {
        // Only reset mappings when a previously-loaded template is cleared.
        // This avoids wiping restored mapping snapshots while a template is not loaded yet.
        // (E.g. resuming a job that used a template that is missing/deleted.)
        const prevTemplateId = prevTemplateIdRef.current;
        const currentTemplateId = scaffoldTemplate?.id ?? null;
        prevTemplateIdRef.current = currentTemplateId;

        if (!scaffoldTemplate) {
            if (prevTemplateId) {
                setRawMappings((prev) => prev.map(() => ({ ...emptyMapping })));
            }
            return;
        }
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
                    startIcode: auto.startIcode,
                    endIcode: auto.endIcode,
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
                            startIcode: auto ? auto.startIcode : null,
                            endIcode: auto ? auto.endIcode : null,
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

                // Template slots of that chain (bounds + slot-based span arithmetic), if known
                let chainResidues = [];
                if (scaffoldTemplate && effectiveChainId != null) {
                    chainResidues = normalizeResidues(resolveChain(scaffoldTemplate, effectiveChainId));
                }

                const normalizedPatch = normalizePatch(
                    patchWithDisableFlag,
                    current,
                    chainResidues,
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

    const replaceRawMappings = useCallback(
        (nextRaw) => {
            if (!Array.isArray(nextRaw)) return;
            setRawMappings(() => {
                const targetLen = rowMonomerLists.length;
                return Array.from({ length: targetLen }, (_, idx) => {
                    const src = nextRaw[idx] && typeof nextRaw[idx] === 'object' ? nextRaw[idx] : null;
                    return {
                        ...emptyMapping,
                        ...(src ? {
                            enabled: !!src.enabled,
                            chainId: src.chainId ?? null,
                            start: src.start ?? null,
                            end: src.end ?? null,
                            startIcode: src.startIcode ?? null,
                            endIcode: src.endIcode ?? null,
                            offset: Number.isFinite(Number(src.offset)) ? Number(src.offset) : 0,
                            manualMasks: Array.isArray(src.manualMasks) ? src.manualMasks : [],
                            disabledByUser: !!src.disabledByUser,
                            // Snapshot restore should never keep the "auto" flag.
                            offsetAutoByCap: false,
                        } : {}),
                    };
                });
            });
        },
        [rowMonomerLists.length],
    );

    const hasTemplateOverlap = useCallback(() => {
        if (!Array.isArray(scaffoldMappings) || !scaffoldMappings.length) return false;

        // Compare the template slots actually used by each enabled mapping (chain + author
        // number + insertion code), so adjacent ranges such as ...12 / 12A... do not collide.
        const used = new Set();
        for (const m of scaffoldMappings) {
            if (!m?.enabled || m.chainId == null) continue;
            const residues = Array.isArray(m.templateResidues) ? m.templateResidues : [];
            for (const r of residues) {
                const key = `${m.chainId}|${r.resid}|${r.icode ?? ''}`;
                if (used.has(key)) return true;
                used.add(key);
            }
        }
        return false;
    }, [scaffoldMappings]);

    return { scaffoldMappings, anyScaffoldEnabled, scaffoldMappingPayload, handleEditScaffoldMapping, replaceRawMappings, hasTemplateOverlap };
}

export function repackChainMappings(rawMappings, chainId, scaffoldTemplate) {
    const next = rawMappings.map((m) => ({ ...emptyMapping, ...m }));

    const chain = resolveChain(scaffoldTemplate, chainId);
    const residues = normalizeResidues(chain);
    if (!residues.length) return rawMappings;

    const lastIdx = residues.length - 1;

    // Collect enabled mappings on this template chain, keep original seqIdx order
    const group = next
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m.enabled && (m.chainId ?? null) === chainId && m.start != null && m.end != null);

    if (group.length === 0) return rawMappings;

    // Sort by seqIdx (design chain order)
    group.sort((a, b) => a.idx - b.idx);

    // Spans are counted in template slots (not residue numbers) so that numbering
    // gaps, unresolved residues and insertion codes are handled consistently.
    let prevEndIdx = null;

    for (const { m, idx } of group) {
        const start = Number(m.start);
        const end = Number(m.end);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

        let startIdx = resolveIndex(residues, start, { icode: m.startIcode });
        let endIdx = resolveIndex(residues, end, { preferLast: true, icode: m.endIcode });
        if (startIdx == null || endIdx == null) continue;

        const spanLen = Math.max(1, endIdx - startIdx + 1);

        if (prevEndIdx != null) {
            // Subsequent mappings start at least after previous end
            startIdx = Math.max(startIdx, prevEndIdx + 1);
        }
        if (startIdx > lastIdx) startIdx = lastIdx;

        endIdx = Math.min(startIdx + spanLen - 1, lastIdx);

        next[idx] = {
            ...next[idx],
            ...slotBounds(residues, startIdx, endIdx),
        };
        prevEndIdx = endIdx;
    }
    return next;
}

/**
 * Allocate consecutive template slot ranges to designed chains (AA-only lengths).
 */
export function computeAutoRanges(residues, designAaLengths, chainId) {
    let cursor = 0;
    return designAaLengths.map((rawLen) => {
        const len = rawLen ?? 0;
        if (len <= 0 || cursor >= residues.length) return null;
        const startIdx = cursor;
        const endIdx = Math.min(cursor + len - 1, residues.length - 1);
        cursor = endIdx + 1;
        return { ...slotBounds(residues, startIdx, endIdx), chainId };
    });
}

/**
 * Range bounds of a slot interval: author numbers plus boundary insertion codes,
 * so ranges stay unambiguous when a boundary falls on an insertion-code residue.
 */
function slotBounds(residues, startIdx, endIdx) {
    const s = residues[startIdx];
    const e = residues[endIdx];
    return {
        start: s.resid,
        end: e.resid,
        startIcode: s.icode ?? '',
        endIcode: e.icode ?? '',
    };
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

export function normalizePatch(
    patch,
    current,
    residues = [],
) {
    if (!patch) return {};
    const merged = { ...patch };
    const chainResidues = Array.isArray(residues) ? residues : [];
    const minResid = chainResidues.length ? chainResidues[0].resid : null;
    const maxResid = chainResidues.length ? chainResidues[chainResidues.length - 1].resid : null;

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

    // A typed residue number carries no insertion code: let it resolve by number.
    if (startChanged && !Object.prototype.hasOwnProperty.call(patch, 'startIcode')) merged.startIcode = null;
    if (endChanged && !Object.prototype.hasOwnProperty.call(patch, 'endIcode')) merged.endIcode = null;

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

    // If only start changed, preserve the previous span (in template slots) so the end does not "grow"
    if (startChanged && !endChanged) {
        const cs = Number(current.start);
        const ce = Number(current.end);
        if (Number.isFinite(cs) && Number.isFinite(ce) && start != null) {
            if (chainResidues.length) {
                const csIdx = resolveIndex(chainResidues, cs, { icode: current.startIcode });
                const ceIdx = resolveIndex(chainResidues, ce, { preferLast: true, icode: current.endIcode });
                const sIdx = resolveIndex(chainResidues, start, { icode: merged.startIcode });
                const span = Math.max(1, ceIdx - csIdx + 1);
                const endSlot = chainResidues[Math.min(sIdx + span - 1, chainResidues.length - 1)];
                end = endSlot.resid;
                merged.endIcode = endSlot.icode ?? '';
            } else {
                const span = Math.max(1, ce - cs + 1);
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


export function resolveTemplateSlice({ template, mapping, designedLength }) {
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

    const startIdx = resolveIndex(residues, startNumber, { icode: mapping.startIcode }) ?? 0;
    // Without an explicit insertion code, the end resolves to the last slot carrying that number.
    const endIdx = resolveIndex(residues, targetEnd, { preferLast: true, icode: mapping.endIcode }) ?? startIdx;

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

export function normalizeResidues(chain) {
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
                icode: String(res?.icode ?? '').trim(),
                // Unresolved template residue (no coordinates): kept as an unmapped slot.
                observed: res?.observed !== false,
                isModified: !!(res?.is_modified ?? res?.isModified),
                breakBefore: !!(res?.break_before ?? res?.breakBefore),
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

export function resolveIndex(residues, targetResid, { preferLast = false, icode = null } = {}) {
    if (targetResid == null) return null;

    if (icode != null) {
        const ic = String(icode).trim();
        const exactIdx = residues.findIndex((res) => res.resid === targetResid && (res.icode ?? '') === ic);
        if (exactIdx >= 0) return exactIdx;
    }

    // Exact match first (last occurrence for range ends: insertion codes share a number)
    if (preferLast) {
        for (let i = residues.length - 1; i >= 0; i--) {
            if (residues[i].resid === targetResid) return i;
        }
    } else {
        const idx = residues.findIndex((res) => res.resid === targetResid);
        if (idx >= 0) return idx;
    }

    // If numbering has gaps, pick the closest lower-or-equal residue
    for (let i = residues.length - 1; i >= 0; i--) {
        if (residues[i].resid <= targetResid) return i;
    }

    // Fallback to first residue
    return 0;
}