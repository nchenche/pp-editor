import { useCallback, useEffect, useMemo, useState } from 'react';

const emptyMapping = {
    enabled: false,
    chainId: null,
    start: null,
    end: null,
    offset: 0,
    manualMasks: [],
    source: null,
    pdbPath: null
};

export function useScaffoldMappings(rowMonomerLists, scaffoldTemplate) {
    const [rawMappings, setRawMappings] = useState([]);

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

                const manualSet = buildMaskSet(mapping.manualMasks, slice.residues.length);

                // masked residues still use '-' in the sequence string, but we keep
                // the full residue objects in templateResidues for the UI
                const maskedResidues = slice.residues.map((res, i) =>
                    manualSet.has(i) ? { ...res, resn: '-', code: res.code } : res
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
                        templateResidues: slice.residues,
                        source,
                        pdbPath,
                        name,
                        trailingCapCount, // NEW: used by TemplateSequence
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
        if (!scaffoldTemplate) return;
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

                if (!isUninitialized) return mapping;

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

    // AUTO N-terminal offset for N-cap: if first monomer is a cap and offset is 0 → offset = 1
    useEffect(() => {
        setRawMappings((prev) => {
            let mutated = false;
            const next = prev.map((mapping = emptyMapping, idx) => {
                const monList = rowMonomerLists[idx] || [];
                const { hasNTerCap } = detectCaps(monList);
                const current = { ...emptyMapping, ...mapping };

                if (!hasNTerCap) return mapping;
                if ((current.offset ?? 0) !== 0) return mapping; // user already set offset

                mutated = true;
                return { ...current, offset: 1 };
            });
            return mutated ? next : prev;
        });
    }, [rowMonomerLists]);

    useEffect(() => {
        if (!scaffoldTemplate) return;

        setRawMappings((prev) => {
            let mutated = false;

            const next = prev.map((mapping = emptyMapping, idx) => {
                const aaLen = designAaLengths[idx] ?? 0;
                if (!aaLen) return mapping;

                const current = { ...emptyMapping, ...mapping };
                if (!current.enabled) return mapping;
                if (current.start == null) return mapping;

                const chain = resolveChain(scaffoldTemplate, current.chainId);
                const residues = normalizeResidues(chain);
                if (!residues.length) return mapping;

                const minResid = residues[0].resid;
                const maxResid = residues[residues.length - 1].resid;

                let start = Number(current.start);
                if (!Number.isFinite(start)) return mapping;

                // Clamp start to chain range
                if (start < minResid) start = minResid;
                if (start > maxResid) start = maxResid;

                let desiredEnd = start + aaLen - 1;
                if (desiredEnd > maxResid) desiredEnd = maxResid;
                if (desiredEnd < start) desiredEnd = start;

                if (current.start === start && current.end === desiredEnd) {
                    return mapping; // nothing to change
                }

                mutated = true;
                return {
                    ...current,
                    start,
                    end: desiredEnd,
                };
            });

            return mutated ? next : prev;
        });
    }, [designAaLengths, scaffoldTemplate]);

    const handleEditScaffoldMapping = useCallback((seqIdx, patch) => {
        setRawMappings((prev) => {
            const next = prev.slice();
            const current = { ...emptyMapping, ...(next[seqIdx] || {}) };

            // AA length for this designed chain (caps excluded)
            const aaLen = designAaLengths[seqIdx] ?? 0;

            // Determine which chain we are editing (patch overrides current)
            const effectiveChainId = patch?.chainId ?? current.chainId ?? null;

            // Compute resid bounds for that chain, if possible
            let minResid = null;
            let maxResid = null;
            let forbiddenRanges = [];
            if (scaffoldTemplate) {
                const chain = resolveChain(scaffoldTemplate, effectiveChainId);
                const residues = normalizeResidues(chain);
                if (residues.length) {
                    minResid = residues[0].resid;
                    maxResid = residues[residues.length - 1].resid;
                }

                // Collect all other enabled ranges on the same template chain
                if (effectiveChainId != null) {
                    forbiddenRanges = prev
                        .map((m, i) => ({ m, i }))
                        .filter(({ m, i }) => {
                            if (!m || i === seqIdx) return false;
                            if (!m.enabled) return false;
                            if ((m.chainId ?? null) !== effectiveChainId) return false;
                            if (m.start == null || m.end == null) return false;
                            const s = Number(m.start);
                            const e = Number(m.end);
                            if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
                            return true;
                        })
                        .map(({ m }) => {
                            const s = Number(m.start);
                            const e = Number(m.end);
                            return [Math.min(s, e), Math.max(s, e)];
                        });
                }
            }

            const normalizedPatch = normalizePatch(
                patch,
                current,
                minResid,
                maxResid,
                forbiddenRanges,
                aaLen,          // NEW
            );
            next[seqIdx] = { ...current, ...normalizedPatch };
            return next;
        });
    }, [scaffoldTemplate, designAaLengths]);

    const hasTemplateOverlap = useCallback(() => {
        console.log('Checking template overlap for mappings:', scaffoldMappings);
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

    return { scaffoldMappings, anyScaffoldEnabled, handleEditScaffoldMapping, hasTemplateOverlap };
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
    forbiddenRanges = [],
    chainAaLength = null,
) {
    if (!patch) return {};
    const merged = { ...patch };

    if ('manualMasks' in merged) {
        merged.manualMasks = sanitizeManualMasks(merged.manualMasks);
    }

    const startChanged =
        Object.prototype.hasOwnProperty.call(patch, 'start') && patch.start !== current.start;
    const endChanged =
        Object.prototype.hasOwnProperty.call(patch, 'end') && patch.end !== current.end;
    const disablingNow =
        Object.prototype.hasOwnProperty.call(patch, 'enabled') &&
        patch.enabled === false &&
        current.enabled;
    const enablingNow =
        Object.prototype.hasOwnProperty.call(patch, 'enabled') &&
        patch.enabled === true &&
        !current.enabled;

    if (startChanged || endChanged || disablingNow) {
        merged.manualMasks = [];
    }

    // Base numeric values
    let start = merged.start != null ? Number(merged.start) : current.start;
    let end = merged.end != null ? Number(merged.end) : current.end;

    const L = chainAaLength && chainAaLength > 0 ? chainAaLength : null;

    // If user edited start/end and we know AA length, keep mapped span length == L
    if (L != null && (startChanged || endChanged)) {
        if (startChanged && !endChanged) {
            // Anchor on new start
            if (!Number.isFinite(start)) start = current.start;
            if (start != null) {
                end = start + L - 1;
            }
        } else if (endChanged && !startChanged) {
            // Anchor on new end
            if (!Number.isFinite(end)) end = current.end;
            if (end != null) {
                start = end - (L - 1);
            }
        } else {
            // Both changed: trust start, derive end
            if (!Number.isFinite(start)) start = current.start;
            if (start != null) {
                end = start + L - 1;
            }
        }
    }

    if (!Number.isFinite(start)) start = current.start;
    if (!Number.isFinite(end)) end = current.end;

    // Clamp to template chain resid range if known
    if (minResid != null) {
        if (start != null && start < minResid) start = minResid;
        if (end != null && end < minResid) end = minResid;
    }
    if (maxResid != null) {
        if (start != null && start > maxResid) start = maxResid;
        if (end != null && end > maxResid) end = maxResid;
    }

    // Ensure end is not before start
    if (start != null && (end == null || end < start)) {
        if (L != null) {
            end = start + L - 1;
        } else if (maxResid != null) {
            end = Math.min(start + 1, maxResid);
        } else {
            end = start + 1;
        }
    }

    // If we know AA length, enforce ideal end again after clamping
    if (L != null && start != null) {
        const idealEnd = start + L - 1;
        if (maxResid != null) {
            end = Math.min(idealEnd, maxResid);
        } else {
            end = idealEnd;
        }
    }

    // Enforce non-overlapping ranges for this template chain
    const overlapsForbidden =
        start != null &&
        end != null &&
        forbiddenRanges.some(([fs, fe]) => Math.max(start, fs) <= Math.min(end, fe));

    if (overlapsForbidden) {
        if (!enablingNow && current.start != null && current.end != null) {
            // For normal edits, fall back to previous valid range
            start = current.start;
            end = current.end;
        } else if (forbiddenRanges.length) {
            // Place range after the last forbidden block
            const maxForbiddenEnd = Math.max(...forbiddenRanges.map((r) => r[1]));
            let newStart = Math.max(maxForbiddenEnd + 1, minResid ?? maxForbiddenEnd + 1);

            if (maxResid != null && newStart > maxResid) {
                // No room left: keep previous (may be invalid)
                newStart = current.start ?? minResid;
            }

            start = newStart;
            if (L != null) {
                const idealEnd = newStart + L - 1;
                end = maxResid != null ? Math.min(idealEnd, maxResid) : idealEnd;
            } else {
                end = maxResid != null ? Math.min(newStart + 1, maxResid) : newStart + 1;
            }
        }
    }

    if (start != null) merged.start = start;
    if (end != null) merged.end = end;

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