import { useCallback, useEffect, useMemo, useState } from 'react';

const emptyMapping = {
    enabled: false,
    chainId: null,
    start: null,
    end: null,
    offset: 0,
    manualMasks: [],
};

export function useScaffoldMappings(rowMonomerLists, scaffoldTemplate) {
    const [rawMappings, setRawMappings] = useState([]);

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
                if (!scaffoldTemplate) {
                    return {
                        mapping: {
                            ...emptyMapping,
                            ...mapping,
                            manualMasks: sanitizeManualMasks(mapping?.manualMasks),
                            sequence: '',
                            templateResidues: [],
                        },
                        derivedStart: null,
                        derivedEnd: null,
                        derivedChainId: null,
                    };
                }

                const slice = resolveTemplateSlice({
                    template: scaffoldTemplate,
                    mapping,
                    designedLength: rowMonomerLists[idx]?.length ?? null,
                });

                const manualSet = buildMaskSet(mapping.manualMasks, slice.residues.length);
                const maskedResidues = slice.residues.map((code, i) => (manualSet.has(i) ? 'X' : code));
                const sequence = mapping.enabled ? formatSequence(mapping.offset, maskedResidues) : '';

                return {
                    mapping: {
                        ...emptyMapping,
                        ...mapping,
                        manualMasks: Array.from(manualSet).sort((a, b) => a - b),
                        sequence,
                        templateResidues: slice.residues,
                    },
                    derivedStart: slice.startNumber ?? null,
                    derivedEnd: slice.endNumber ?? null,
                    derivedChainId: slice.chainId ?? null,
                };
            }),
        [rawMappings, scaffoldTemplate, rowMonomerLists],
    );

    const scaffoldMappings = useMemo(
        () => computedEntries.map((entry) => entry.mapping),
        [computedEntries],
    );

    const derivedRanges = useMemo(
        () =>
            computedEntries.map((entry) => ({
                start: entry.derivedStart,
                end: entry.derivedEnd,
            })),
        [computedEntries],
    );

    const derivedChainIds = useMemo(
        () => computedEntries.map((entry) => entry.derivedChainId ?? null),
        [computedEntries],
    );

    useEffect(() => {
        if (!scaffoldTemplate) return;
        if (!derivedRanges.length) return;

        setRawMappings((prev) => {
            let mutated = false;
            const next = prev.map((mapping = emptyMapping, idx) => {
                const derived = derivedRanges[idx];
                const suggestedChainId = derivedChainIds[idx];
                if (!derived?.start && !suggestedChainId) return mapping;

                let candidate = mapping;

                const shouldAutoEnable =
                    !candidate.enabled && candidate.start == null && candidate.end == null;

                if (shouldAutoEnable && derived.start != null && derived.end != null) {
                    candidate = candidate === mapping ? { ...candidate } : candidate;
                    candidate.enabled = true;
                    candidate.start = derived.start;
                    candidate.end = derived.end;
                    if (!candidate.chainId && suggestedChainId) {
                        candidate.chainId = suggestedChainId;
                    }
                    mutated = true;
                    return candidate;
                }

                let changed = false;

                if (!candidate.chainId && suggestedChainId) {
                    candidate = candidate === mapping ? { ...candidate } : candidate;
                    candidate.chainId = suggestedChainId;
                    changed = true;
                }

                if (candidate.start == null && derived.start != null) {
                    candidate = candidate === mapping ? { ...candidate } : candidate;
                    candidate.start = derived.start;
                    changed = true;
                }

                if (candidate.end == null && derived.end != null) {
                    candidate = candidate === mapping ? { ...candidate } : candidate;
                    candidate.end = derived.end;
                    changed = true;
                }

                if (changed) {
                    mutated = true;
                    return candidate;
                }

                return mapping;
            });

            return mutated ? next : prev;
        });
    }, [derivedRanges, derivedChainIds, scaffoldTemplate]);

    const handleEditScaffoldMapping = useCallback((seqIdx, patch) => {
        setRawMappings((prev) => {
            const next = prev.slice();
            const current = { ...emptyMapping, ...(next[seqIdx] || {}) };
            const normalizedPatch = normalizePatch(patch, current);
            next[seqIdx] = { ...current, ...normalizedPatch };
            return next;
        });
    }, []);

    return { scaffoldMappings, handleEditScaffoldMapping };
}

function normalizePatch(patch, current) {
    if (!patch) return {};
    const merged = { ...patch };

    if ('manualMasks' in merged) {
        merged.manualMasks = sanitizeManualMasks(merged.manualMasks);
    }

    const startChanged = Object.prototype.hasOwnProperty.call(patch, 'start') && patch.start !== current.start;
    const endChanged = Object.prototype.hasOwnProperty.call(patch, 'end') && patch.end !== current.end;
    const enabledChanged =
        Object.prototype.hasOwnProperty.call(patch, 'enabled') && patch.enabled === false && current.enabled;

    if (startChanged || endChanged || enabledChanged) {
        merged.manualMasks = [];
    }

    const start = merged.start != null ? Number(merged.start) : current.start;
    const end = merged.end != null ? Number(merged.end) : current.end;

    if (start != null) merged.start = start;
    if (end != null) merged.end = end;

    if (start != null && (merged.end == null || merged.end <= start)) {
        merged.end = start + 1;
    }

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

function formatSequence(offset, residues) {
    const prefix = Array.from({ length: Math.max(0, Number(offset) || 0) }, () => 'X');
    return [...prefix, ...residues].join('-');
}

function resolveTemplateSlice({ template, mapping, designedLength }) {
    const chain = resolveChain(template, mapping.chainId);
    const residues = normalizeResidues(chain);
    if (!residues.length) {
        return { residues: [], startNumber: null, endNumber: null, chainId: null };
    }

    const startNumber = mapping.start != null ? Number(mapping.start) : residues[0]?.number ?? 1;
    const targetEnd =
        mapping.end != null
            ? Number(mapping.end)
            : designedLength != null
              ? startNumber + Math.max(designedLength - 1, 0)
              : residues[residues.length - 1].number;

    const startIdx = resolveIndex(residues, startNumber) ?? 0;
    const endIdx =
        resolveIndex(residues, targetEnd) ??
        Math.min(residues.length - 1, startIdx + Math.max((designedLength ?? residues.length) - 1, 0));

    if (endIdx < startIdx) {
        return { residues: [], startNumber: null, endNumber: null, chainId: normalizeChainId(chain) ?? null };
    }

    const slice = residues.slice(startIdx, endIdx + 1);
    return {
        residues: slice.map((res) => res.code),
        startNumber: slice[0]?.number ?? null,
        endNumber: slice[slice.length - 1]?.number ?? null,
        chainId: normalizeChainId(chain) ?? null,
    };
}

function resolveChain(template, chainId) {
    const chains = Array.isArray(template?.chainData) ? template.chainData : [];
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
                code: normalizeResidueCode(res?.resName ?? res?.name ?? res?.label ?? res?.code ?? res?.type),
                number:
                    res?.resSeq ??
                    res?.seqNumber ??
                    res?.sequenceNumber ??
                    res?.index ??
                    res?.idx ??
                    idx + 1,
            }))
            .filter((res) => !!res.code);
    }
    if (typeof chain.sequence === 'string' && chain.sequence.trim()) {
        const tokens = chain.sequence.split(/[\s,.-]+/).filter(Boolean);
        return tokens.map((token, idx) => ({
            code: normalizeResidueCode(token),
            number: idx + 1,
        }));
    }
    if (Array.isArray(chain.sequence)) {
        return chain.sequence
            .map((token, idx) => ({
                code: normalizeResidueCode(token),
                number: idx + 1,
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

function resolveIndex(residues, targetNumber) {
    if (targetNumber == null) return null;
    const exact = residues.findIndex((res) => res.number === targetNumber);
    if (exact >= 0) return exact;
    const fallback = targetNumber - 1;
    if (fallback >= 0 && fallback < residues.length) return fallback;
    return null;
}