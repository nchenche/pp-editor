import { useCallback } from "react";
import { removeGroup, buildBilnFromRowMonomerLists, buildLinkMapFromBiln } from "../utils/bilnUtils";
import { useConfirm } from "../components/common/ConfirmDialogProvider";


export function useBilnHandlers({
    bilnValue,
    setBilnValue,
    monomers,
    rowMonomerLists,
    setRowMonomerLists,
    linkMap,
    uiState,
    setUiState,
    setIsDragging,
    setHoveredMonomer,
}) {
    const confirm = useConfirm();

    const getMonomerByGlobalIdx = useCallback((globalIdx) => {
        const gi = Number(globalIdx);
        if (!Number.isFinite(gi)) return undefined;
        return (monomers || []).find(
            (m) => parseInt(String(m?.['res-idx']).split("-")[1], 10) === gi
        );
    }, [monomers]);

    const parseBilnSegments = useCallback((rawBiln) => {
        const normalized = (rawBiln || '')
            .trim()
            .replace(/^[.\-]+|[.\-]+$/g, '')
            .replace(/\.+/g, '.')
            .replace(/\-+/g, '-');
        const rawSegments = normalized ? normalized.split('.') : [];
        const segments = rawSegments.map(seg => (seg ? seg.split('-') : []).filter(Boolean));
        return segments;
    }, []);

    const computeOffsetForSeqIdx = useCallback((segments, seqIdx) => {
        let offset = 0;
        for (let i = 0; i < seqIdx; i++) offset += (segments?.[i]?.length || 0);
        return offset;
    }, []);

    const findHeadToTailLinkId = useCallback((seqIdx, segments) => {
        const segTokens = segments?.[seqIdx] || [];
        if (segTokens.length < 2) return null;

        const offset = computeOffsetForSeqIdx(segments, seqIdx);
        const nterIdx = offset;
        const cterIdx = offset + segTokens.length - 1;

        for (const [connId, pairs] of Object.entries(linkMap || {})) {
            if (!Array.isArray(pairs) || pairs.length !== 2) continue;

            const a = pairs[0];
            const b = pairs[1];
            const aIdx = Number(a?.monomerIdx);
            const bIdx = Number(b?.monomerIdx);
            const aRg = Number(a?.rgroup);
            const bRg = Number(b?.rgroup);

            const matches =
                (aIdx === nterIdx && aRg === 1 && bIdx === cterIdx && bRg === 2) ||
                (bIdx === nterIdx && bRg === 1 && aIdx === cterIdx && aRg === 2);

            if (matches) return connId;
        }
        return null;
    }, [computeOffsetForSeqIdx, linkMap]);

    const validateDnDReorder = useCallback((candidateRows, candidateBiln) => {
        // Treat empty rows as non-existent; `buildBilnFromRowMonomerLists` drops them.
        const effectiveRows = (candidateRows || []).filter((r) => Array.isArray(r) && r.length > 0);

        const candidateLinkMap = buildLinkMapFromBiln(candidateBiln || '');

        // Only treat *complete* links (exactly 2 endpoints) as consuming R-groups.
        const usedRgroupsByMonomerIdx = new Map();
        for (const pairs of Object.values(candidateLinkMap || {})) {
            if (!Array.isArray(pairs) || pairs.length !== 2) continue;
            for (const p of pairs) {
                const monomerIdx = Number(p?.monomerIdx);
                const rgroup = Number(p?.rgroup);
                if (!Number.isFinite(monomerIdx) || !Number.isFinite(rgroup)) continue;
                if (!usedRgroupsByMonomerIdx.has(monomerIdx)) usedRgroupsByMonomerIdx.set(monomerIdx, new Set());
                usedRgroupsByMonomerIdx.get(monomerIdx).add(rgroup);
            }
        }

        let offset = 0;
        for (const row of effectiveRows) {
            const lastIdx = row.length - 1;
            for (let i = 0; i < row.length; i++) {
                const monomer = row[i];
                const globalIdx = offset + i;

                const isCap = monomer?.m_subtype === 'cap';
                const hasR1 = monomer?.m_RgroupIdx?.[0] != null; // BILN rgroup 1
                const hasR2 = monomer?.m_RgroupIdx?.[1] != null; // BILN rgroup 2
                const isNterCap = isCap && hasR2 && !hasR1;
                const isCterCap = isCap && hasR1 && !hasR2;

                // Caps must remain terminal; they are non-draggable but can be displaced.
                if (isNterCap && i !== 0) return { ok: false, reason: 'nter-cap-not-terminal', monomer };
                if (isCterCap && i !== lastIdx) return { ok: false, reason: 'cter-cap-not-terminal', monomer };

                const used = usedRgroupsByMonomerIdx.get(globalIdx);
                const r1Used = used?.has(1) ?? false;
                const r2Used = used?.has(2) ?? false;

                // Backbone adjacency requires the corresponding R-group to exist and be unused.
                if (i > 0) {
                    if (!hasR1) return { ok: false, reason: 'missing-r1-for-backbone', monomer };
                    if (r1Used) return { ok: false, reason: 'r1-already-used', monomer };
                }
                if (i < lastIdx) {
                    if (!hasR2) return { ok: false, reason: 'missing-r2-for-backbone', monomer };
                    if (r2Used) return { ok: false, reason: 'r2-already-used', monomer };
                }
            }
            offset += row.length;
        }

        return { ok: true, reason: null, monomer: null };
    }, []);

    const showDnDInvalidMoveDialog = useCallback(async ({ reason, monomer }) => {
        const code = monomer?.symbol || monomer?.m_abbr || monomer?.m_name || 'This monomer';

        let title = 'Cannot move monomer';
        let message = 'This move is not possible because it would create an invalid backbone connection.';

        switch (reason) {
            case 'nter-cap-not-terminal':
                title = 'Cannot move N‑terminal cap';
                message = `The N‑terminus is capped with “${code}”. Capping monomers must remain at the start of the chain.`;
                break;
            case 'cter-cap-not-terminal':
                title = 'Cannot move C‑terminal cap';
                message = `The C‑terminus is capped with “${code}”. Capping monomers must remain at the end of the chain.`;
                break;
            case 'missing-r1-for-backbone':
                title = 'Cannot move monomer here';
                message = `“${code}” cannot be placed at this position because it has no R1 to connect to the left neighbor.`;
                break;
            case 'missing-r2-for-backbone':
                title = 'Cannot move monomer here';
                message = `“${code}” cannot be placed at this position because it has no R2 to connect to the right neighbor.`;
                break;
            case 'r1-already-used':
                title = 'Cannot move monomer here';
                message = 'The N‑terminus is already used in a bond (e.g., cyclic). Remove the bond first.';
                break;
            case 'r2-already-used':
                title = 'Cannot move monomer here';
                message = 'The C‑terminus is already used in a bond (e.g., cyclic). Remove the bond first.';
                break;
            default:
                break;
        }

        await confirm({
            title,
            message,
            confirmText: 'Close',
            hideCancel: true,
        });
    }, [confirm]);

    // Helper: is C-ter free to append?
    const isCterFree = useCallback((cterGlobalIdx, cterMonomer) => {
        if (!cterMonomer) return true; // empty sequence: free
        const isCterCap = cterMonomer?.m_subtype === 'cap' && cterMonomer?.m_RgroupIdx?.[0] != null;
        if (isCterCap) return false;
        // Check if C-ter R-group (index 2 in BILN, 1-based) is already used in a bond (e.g., cyclic)
        const used = Object.values(linkMap || {}).some((pairs) =>
            pairs?.some(p => Number(p.monomerIdx) === Number(cterGlobalIdx) && Number(p.rgroup) === 2)
        );
        return !used;
    }, [linkMap]);

    // Helper: is N-ter free to prepend?
    const isNterFree = useCallback((nterGlobalIdx, nterMonomer) => {
        if (!nterMonomer) return true; // empty sequence: free
        const isNterCap = nterMonomer?.m_subtype === 'cap' && nterMonomer?.m_RgroupIdx?.[1] != null;
        if (isNterCap) return false;
        // N-ter R‑group is 1 (1-based)
        const used = Object.values(linkMap || {}).some((pairs) =>
            pairs?.some(p => Number(p.monomerIdx) === Number(nterGlobalIdx) && Number(p.rgroup) === 1)
        );
        return !used;
    }, [linkMap]);

    const handleCircularizeSequence = useCallback(async (seqIdx) => {
        const segments = parseBilnSegments(bilnValue);
        if (!Array.isArray(segments) || segments.length === 0) return;
        if (!Number.isFinite(Number(seqIdx)) || seqIdx < 0 || seqIdx >= segments.length) return;

        const segTokens = segments[seqIdx] || [];
        if (segTokens.length < 2) {
            await confirm({
                title: 'Cannot circularize',
                message: 'Head-to-tail circularization requires at least two residues.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        // If already circularized (including via manual BILN edits), treat action as a no-op
        // and let the UI call the explicit uncircularize handler.
        const existing = findHeadToTailLinkId(seqIdx, segments);
        if (existing != null) {
            return;
        }

        const offset = computeOffsetForSeqIdx(segments, seqIdx);
        const nterIdx = offset;
        const cterIdx = offset + segTokens.length - 1;

        const nterMonomer = getMonomerByGlobalIdx(nterIdx);
        const cterMonomer = getMonomerByGlobalIdx(cterIdx);

        if (!nterMonomer || !cterMonomer) {
            await confirm({
                title: 'Cannot circularize',
                message: 'Could not resolve the N-terminus/C-terminus monomers for this chain.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        // Disallow if terminal caps are present.
        if (nterMonomer?.m_subtype === 'cap' || cterMonomer?.m_subtype === 'cap') {
            await confirm({
                title: 'Cannot circularize',
                message: 'At least one terminus is capped. Remove the cap before circularizing.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        const nterHasR1 = nterMonomer?.m_RgroupIdx?.[0] != null;
        const cterHasR2 = cterMonomer?.m_RgroupIdx?.[1] != null;
        if (!nterHasR1 || !cterHasR2) {
            await confirm({
                title: 'Cannot circularize',
                message: 'Circularization requires a free N-terminus R1 and a free C-terminus R2.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        const nterAvailable = isNterFree(nterIdx, nterMonomer);
        const cterAvailable = isCterFree(cterIdx, cterMonomer);
        if (!nterAvailable || !cterAvailable) {
            await confirm({
                title: 'Cannot circularize',
                message: 'The N-terminus and/or C-terminus is already used in a bond (e.g., cyclic). Remove the bond first.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        // Pick next unused connection id.
        const existingIds = Object.keys(linkMap || {})
            .map((k) => parseInt(k, 10))
            .filter((n) => Number.isFinite(n));
        let nextId = existingIds.length ? Math.max(...existingIds) + 1 : 1;
        while ((linkMap || {})[String(nextId)] != null) nextId += 1;

        // Append annotations to the first and last token in the segment.
        segments[seqIdx][0] = `${segments[seqIdx][0]}(${nextId},1)`;
        segments[seqIdx][segTokens.length - 1] = `${segments[seqIdx][segTokens.length - 1]}(${nextId},2)`;

        const newBiln = segments.map(seg => seg.join('-')).join('.');
        setBilnValue(newBiln);
    }, [bilnValue, confirm, computeOffsetForSeqIdx, findHeadToTailLinkId, getMonomerByGlobalIdx, isCterFree, isNterFree, linkMap, parseBilnSegments, setBilnValue]);

    const handleUncircularizeSequence = useCallback(async (seqIdx) => {
        const segments = parseBilnSegments(bilnValue);
        if (!Array.isArray(segments) || segments.length === 0) return;
        if (!Number.isFinite(Number(seqIdx)) || seqIdx < 0 || seqIdx >= segments.length) return;

        const segTokens = segments[seqIdx] || [];
        if (segTokens.length < 2) return;

        const connId = findHeadToTailLinkId(seqIdx, segments);
        const removedId = parseInt(String(connId), 10);
        if (!Number.isFinite(removedId)) {
            await confirm({
                title: 'Cannot uncircularize',
                message: 'No head-to-tail cyclic bond was found for this chain.',
                confirmText: 'Close',
                hideCancel: true,
            });
            return;
        }

        // Remove the endpoints from first/last tokens.
        const firstTok = segments[seqIdx][0];
        const lastTok = segments[seqIdx][segTokens.length - 1];
        segments[seqIdx][0] = String(firstTok)
            .replace(new RegExp(`\\(${removedId},1\\)`, 'g'), '')
            .replace(new RegExp(`\\(${removedId},2\\)`, 'g'), '');
        segments[seqIdx][segTokens.length - 1] = String(lastTok)
            .replace(new RegExp(`\\(${removedId},1\\)`, 'g'), '')
            .replace(new RegExp(`\\(${removedId},2\\)`, 'g'), '');

        // Rebuild and then decrement all connection ids above removedId (keeps ids dense,
        // matching existing bond-breaking behavior).
        let newBiln = segments.map(seg => seg.join('-')).join('.');
        newBiln = newBiln.replace(/\((\d+),(\d+)\)/g, (match, n, rg) => {
            const nNum = parseInt(n, 10);
            if (nNum > removedId) return `(${nNum - 1},${rg})`;
            return match;
        });

        setBilnValue(newBiln);
    }, [bilnValue, confirm, findHeadToTailLinkId, parseBilnSegments, setBilnValue]);

    const handleMirrorSequence = useCallback(async (seqIdx) => {
        const segments = parseBilnSegments(bilnValue);
        if (!Array.isArray(segments) || segments.length === 0) return;
        if (!Number.isFinite(Number(seqIdx)) || seqIdx < 0 || seqIdx >= segments.length) return;

        const segTokens = segments[seqIdx] || [];
        if (segTokens.length === 0) return;

        const offset = computeOffsetForSeqIdx(segments, seqIdx);

        let changed = false;
        for (let i = 0; i < segTokens.length; i++) {
            const globalIdx = offset + i;
            const m = getMonomerByGlobalIdx(globalIdx);
            const tok = String(segments[seqIdx][i] || '');
            const code = tok.match(/^[^(]+/)?.[0] || '';
            if (!code) continue;

            // Toggle behavior:
            // - L -> D: only for current *natural* amino acids (m_subtype === 'natural'), and never for Gly (G).
            // - D -> L: if token is a simple dX (single-letter), allow toggling back even if subtype changed.
            const isSimpleLetter = /^[A-Z]$/.test(code);
            const isSimpleDLetter = /^d[A-Z]$/.test(code);

            let nextCode = null;
            if (isSimpleDLetter) {
                // Unmirror dX -> X (including dG -> G to recover from invalid manual edits)
                nextCode = code.slice(1);
            } else {
                const subtype = m?.m_subtype;
                if (subtype !== 'natural') continue;
                if (!isSimpleLetter) continue;
                if (code === 'G') continue; // Glycine has no enantiomer
                nextCode = `d${code}`;
            }

            if (!nextCode || nextCode === code) continue;
            segments[seqIdx][i] = tok.replace(/^[^(]+/, nextCode);
            changed = true;
        }

        if (!changed) return;
        const newBiln = segments.map(seg => seg.join('-')).join('.');
        setBilnValue(newBiln);
    }, [bilnValue, computeOffsetForSeqIdx, getMonomerByGlobalIdx, parseBilnSegments, setBilnValue]);

    /**
     * Add a monomer with smart handling of:
     * - Empty library -> create first sequence
     * - "new-sequence" -> append new segment and focus it
     * - Prepend/Append with caps and occupied termini
     */
    const addMonomerToBiln = useCallback(async (monomer, opts) => {
        if (!monomer) return;

        const mode = opts?.mode || 'append';       // 'append' | 'prepend' | 'insert' | 'new-sequence'
        const linkVia = opts?.link || 'peptide';   // reserved for advanced linking (R-groups)
        const selectedSeqIdx = (opts?.activeSequenceIdx ?? uiState.activeSeqIdx ?? 0);

        const code = monomer.symbol || monomer.m_abbr;
        if (!code) {
            console.warn("Monomer has no valid code:", monomer);
            return;
        }

        // Parse current sequences
        const trimmed = (bilnValue || "").replace(/^[.-]+|[.-]+$/g, "");
        const segments = trimmed ? trimmed.split(".") : [];
        const seqCount = segments.length;

        // Target sequence index
        let segIdx = 0;
        let createdNewSequence = false;

        const mustCreateNew = seqCount === 0 || mode === 'new-sequence';
        if (mustCreateNew) {
            // Create first or append a new sequence
            segments.push('');
            segIdx = segments.length - 1;
            createdNewSequence = true;
        } else {
            // Clamp to existing sequences
            segIdx = Math.max(0, Math.min(
                typeof selectedSeqIdx === 'number' ? selectedSeqIdx : 0,
                Math.max(seqCount - 1, 0)
            ));
        }

        // Focus the newly created sequence
        if (createdNewSequence) {
            setUiState(prev => (prev.activeSeqIdx === segIdx ? prev : { ...prev, activeSeqIdx: segIdx }));
        }

        // Segment details
        const seg = segments[segIdx] || "";
        const segMonomers = seg ? seg.split("-") : [];

        // If empty segment, just place the first monomer and commit
        if (segMonomers.length === 0) {
            segments[segIdx] = code;
            setBilnValue(segments.join("."));
            return;
        }

        // Compute global indices for both termini
        const offset = segments
            .slice(0, segIdx)
            .reduce((sum, s) => sum + (s ? s.split("-").length : 0), 0);

        const nterGlobalIdx = offset + 0;
        const cterGlobalIdx = offset + Math.max(segMonomers.length - 1, 0);

        // Lookup monomer objects at termini
        const getByResIdx = (gi) => monomers.find(
            (m) => parseInt(String(m["res-idx"]).split("-")[1], 10) === gi
        );
        const nterMonomer = segMonomers.length > 0 ? getByResIdx(nterGlobalIdx) : undefined;
        const cterMonomer = segMonomers.length > 0 ? getByResIdx(cterGlobalIdx) : undefined;

        // Determine if the monomer is a cap and cap type
        const addingIsCap = monomer.m_subtype === "cap";
        const isNterCapToAdd = addingIsCap && monomer.m_RgroupIdx?.[1] != null;
        const isCterCapToAdd = addingIsCap && monomer.m_RgroupIdx?.[0] != null;

        // Check terminal availability
        const nterAvailable = isNterFree(nterGlobalIdx, nterMonomer);
        const cterAvailable = isCterFree(cterGlobalIdx, cterMonomer);

        let newSegMonomers = segMonomers.slice();

        // If adding a cap, override mode to the appropriate terminus
        if (addingIsCap) {
            if (isNterCapToAdd) {
                const firstIsCap = nterMonomer?.m_subtype === 'cap';
                if (firstIsCap) {
                    newSegMonomers[0] = code; // replace existing N-cap
                } else {
                    // If N-ter occupied by bond, block and inform
                    if (!nterAvailable) {
                        await confirm({
                            title: 'Cannot cap at N‑terminus',
                            message: 'The N‑terminus is already used in a bond. Remove the bond first.',
                            confirmText: 'Close',
                            hideCancel: true,
                        });
                        return;
                    }
                    newSegMonomers.unshift(code);
                }
            } else if (isCterCapToAdd) {
                const lastIsCap = cterMonomer?.m_subtype === 'cap';
                if (lastIsCap) {
                    newSegMonomers[newSegMonomers.length - 1] = code; // replace existing C-cap
                } else {
                    if (!cterAvailable) {
                        await confirm({
                            title: 'Cannot cap at C‑terminus',
                            message: 'The C‑terminus is already used in a bond. Remove the bond first.',
                            confirmText: 'Close',
                            hideCancel: true,
                        });
                        return;
                    }
                    newSegMonomers.push(code);
                }
            } else {
                // Unknown cap type: default to append
                if (!cterAvailable) {
                    await confirm({
                        title: 'Cannot append cap',
                        message: 'The C‑terminus is not available.',
                        confirmText: 'Close',
                        hideCancel: true,
                    });
                    return;
                }
                newSegMonomers.push(code);
            }

            segments[segIdx] = newSegMonomers.join("-");
            setBilnValue(segments.join("."));
            return;
        }

        // Non-cap monomer. Apply mode (prepend/append). Insert can be implemented later.
        if (mode === 'prepend') {
            if (!nterAvailable) {
                const firstIsCap = nterMonomer?.m_subtype === 'cap';
                const title = 'Cannot prepend at N‑terminus';
                if (firstIsCap) {
                    const ok = await confirm({
                        title,
                        message: `The N‑terminus is capped with “${nterMonomer?.symbol || newSegMonomers[0]}”. Replace it with “${code}”?`,
                        confirmText: `Replace cap with “${code}”`,
                        cancelText: 'Cancel',
                    });
                    if (!ok) return;
                    newSegMonomers[0] = code;
                } else {
                    await confirm({
                        title,
                        message: 'The N‑terminus is already used in a bond (e.g., cyclic). Remove the bond first.',
                        confirmText: 'Close',
                        hideCancel: true,
                    });
                    return;
                }
            } else {
                newSegMonomers.unshift(code);
            }
        } else {
            // default: append (also used for mode === 'insert' as a simple fallback)
            if (!cterAvailable) {
                const lastIsCap = cterMonomer?.m_subtype === 'cap';
                const title = 'Cannot append at C‑terminus';
                if (lastIsCap) {
                    const ok = await confirm({
                        title,
                        message: `The C‑terminus is capped with “${cterMonomer?.symbol || newSegMonomers[newSegMonomers.length - 1]}”. Replace it with “${code}”?`,
                        confirmText: `Replace cap with “${code}”`,
                        cancelText: 'Cancel',
                    });
                    if (!ok) return;
                    newSegMonomers[newSegMonomers.length - 1] = code;
                } else {
                    await confirm({
                        title,
                        message: 'The C‑terminus is already used in a bond (e.g., cyclic). Remove the bond first.',
                        confirmText: 'Close',
                        hideCancel: true,
                    });
                    return;
                }
            } else {
                newSegMonomers.push(code);
            }
        }

        segments[segIdx] = newSegMonomers.join("-");
        setBilnValue(segments.join("."));
    }, [bilnValue, monomers, uiState.activeSeqIdx, setBilnValue, setUiState, isNterFree, isCterFree, confirm, linkMap]);


    // Replace a monomer at the sourceMonomer position with newMonomer's code.
    // Keeps any existing connection annotations present in the token.
    const replaceMonomerInBiln = useCallback((newMonomer, opts) => {
        if (!newMonomer) return;
        const source = opts?.sourceMonomer;
        if (!source) {
            console.warn('replaceMonomerInBiln: missing sourceMonomer in opts');
            return;
        }
        const code = newMonomer.symbol || newMonomer.m_abbr;
        if (!code) {
            console.warn('replaceMonomerInBiln: newMonomer has no valid code', newMonomer);
            return;
        }

        // Normalize and split BILN into segments and per-segment tokens
        const normalized = (bilnValue || '')
            .trim()
            .replace(/^[.\-]+|[.\-]+$/g, '')
            .replace(/\.+/g, '.')
            .replace(/\-+/g, '-');
        const rawSegments = normalized ? normalized.split('.') : [];
        const segments = rawSegments.map(seg => (seg ? seg.split('-') : []).filter(Boolean));

        if (segments.length === 0) {
            console.warn('replaceMonomerInBiln: no segments in current BILN');
            return;
        }

        // Global residue index of the source monomer
        const resIdx = parseInt(String(source['res-idx']).split('-')[1], 10);
        if (Number.isNaN(resIdx)) {
            console.warn('replaceMonomerInBiln: invalid sourceMonomer res-idx', source);
            return;
        }

        // Locate target segment and index within that segment
        let segIdx = 0;
        let idxInSeg = resIdx;
        for (let i = 0, acc = 0; i < segments.length; i++) {
            const len = segments[i].length;
            if (resIdx < acc + len) {
                segIdx = i;
                idxInSeg = resIdx - acc;
                break;
            }
            acc += len;
        }

        const tok = segments[segIdx]?.[idxInSeg];
        if (!tok) {
            console.warn('replaceMonomerInBiln: target token not found at', { segIdx, idxInSeg, resIdx });
            return;
        }

        // Replace only the monomer code at the beginning of token; keep any "(id,rg)" annotations
        const newTok = tok.replace(/^[^(]+/, code);
        segments[segIdx][idxInSeg] = newTok;

        const newBiln = segments.map(seg => seg.join('-')).join('.');
        setBilnValue(newBiln);
    }, [bilnValue, setBilnValue]);


    // Delete monomer (segment-aware)
    const handleDeleteMonomerItem = (monomer) => {
        if (!monomer) return;
        const resIdx = parseInt(String(monomer['res-idx']).split('-')[1], 10); // 0-based global index

        // Normalize and split BILN into segments and per-segment tokens
        const normalized = (bilnValue || '')
            .trim()
            .replace(/^[.\-]+|[.\-]+$/g, '')
            .replace(/\.+/g, '.')
            .replace(/\-+/g, '-');
        const rawSegments = normalized ? normalized.split('.') : [];
        const segments = rawSegments.map(seg => (seg ? seg.split('-') : []).filter(Boolean));

        if (segments.length === 0) return; // nothing to delete

        // Locate the target segment and intra-segment index for resIdx
        let segIdx = 0;
        let idxInSeg = resIdx;
        for (let i = 0, acc = 0; i < segments.length; i++) {
            const len = segments[i].length;
            if (resIdx < acc + len) {
                segIdx = i;
                idxInSeg = resIdx - acc;
                break;
            }
            acc += len;
        }

        const targetToken = segments[segIdx]?.[idxInSeg];
        if (!targetToken) return;

        // 1) Collect connection IDs present in the token being removed
        const linkIds = Array.from(targetToken.matchAll(/\((\d+),\d+\)/g)).map((m) => m[1]);

        // 2) Remove the token from its segment
        segments[segIdx].splice(idxInSeg, 1);

        // 3) Remove matching links from all remaining tokens
        if (linkIds.length > 0) {
            for (let si = 0; si < segments.length; si++) {
                for (let ti = 0; ti < segments[si].length; ti++) {
                    let tok = segments[si][ti];
                    linkIds.forEach((id) => {
                        tok = tok.replace(new RegExp(`\\(${id},\\d+\\)`, 'g'), '');
                    });
                    segments[si][ti] = tok;
                }
            }
        }

        // 4) If the segment is now empty, remove the segment (shifts indices)
        if (segments[segIdx].length === 0) {
            segments.splice(segIdx, 1);
        }

        // 5) Rebuild BILN
        const newBiln = segments.length === 0
            ? ''
            : segments.map(seg => seg.join('-')).join('.');

        setBilnValue(newBiln);

        // 6) Update uiState focus to a valid sequence (keep same index if possible)
        setUiState(prev => {
            const newSeqCount = segments.length;
            let nextIdx = null;
            if (newSeqCount > 0) {
                // If we removed the entire segment, focus the sequence that shifted into its place,
                // otherwise keep the same segIdx.
                nextIdx = Math.min(segIdx, newSeqCount - 1);
            }
            if (prev.seqNumber === newSeqCount && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: newSeqCount, activeSeqIdx: nextIdx };
        });
    };


    // Link two monomers
    const handleMonomerLinking = useCallback((monomer1, monomer2) => {
        const res_idx1 = parseInt(monomer1.residue.split('-')[1]);
        const res_idx2 = parseInt(monomer2.residue.split('-')[1]);
        const rgroup1 = parseInt(monomer1.rgroup) + 1;
        const rgroup2 = parseInt(monomer2.rgroup) + 1;

        // Find all existing connection IDs in the BILN string
        const matches = Array.from(bilnValue.matchAll(/\((\d+),\d+\)/g));
        const existingIds = matches.map(m => parseInt(m[1], 10));
        const maxId = existingIds.length ? Math.max(...existingIds) : 0;
        const nextConnectionId = maxId + 1;

        console.log(
            `Linking ${res_idx1}-${rgroup1} and ${res_idx2}-${rgroup2} with connection ${nextConnectionId}`
        );

        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res_idx1 * 2] += `(${nextConnectionId},${rgroup1})`;
        bilnParts[res_idx2 * 2] += `(${nextConnectionId},${rgroup2})`;

        setBilnValue(bilnParts.join(''));
    }, [bilnValue, setBilnValue]);


    // Break bond
    const handleBondBreaking = useCallback((residues, rgroups) => {
        const res_idx1 = parseInt(residues[0]);
        const res_idx2 = parseInt(residues[1]);
        const rgroup1 = parseInt(rgroups[0]);
        const rgroup2 = parseInt(rgroups[1]);

        // 1. Find the connectionId (linkMap key) being removed
        const linkMapIdToRemove = Object.entries(linkMap).find(([connId, pairs]) => {
            const ids = pairs.map(p => `${p.monomerIdx}-${p.rgroup}`);
            const target1 = `${res_idx1}-${rgroup1}`;
            const target2 = `${res_idx2}-${rgroup2}`;
            return ids.includes(target1) && ids.includes(target2);
        })?.[0];

        const removedId = parseInt(linkMapIdToRemove, 10);
        if (isNaN(removedId)) {
            console.warn("handleBondBreaking: No connection found for these residues/rgroups.");
            return;
        }

        // 2. Remove the bond from the relevant monomers in bilnParts
        const bilnParts = bilnValue.split(/([.-])/);
        bilnParts[res_idx1 * 2] = removeGroup(bilnParts[res_idx1 * 2], rgroup1);
        bilnParts[res_idx2 * 2] = removeGroup(bilnParts[res_idx2 * 2], rgroup2);

        // 3. Decrement all connection IDs > removedId throughout the BILN string
        let newBiln = bilnParts.join('');
        newBiln = newBiln.replace(/\((\d+),(\d+)\)/g, (match, n, rg) => {
            const nNum = parseInt(n, 10);
            if (nNum > removedId) {
                return `(${nNum - 1},${rg})`;
            }
            return match;
        });

        setBilnValue(newBiln);
    }, [bilnValue, setBilnValue, linkMap]);

    const handleDeleteSequence = (index) => {
        // Normalize and split BILN into segments and per-segment tokens
        const normalized = (bilnValue || '')
            .trim()
            .replace(/^[.\-]+|[.\-]+$/g, '')
            .replace(/\.+/g, '.')
            .replace(/\-+/g, '-');
        const rawSegments = normalized ? normalized.split('.') : [];
        const segments = rawSegments.map(seg => (seg ? seg.split('-') : []).filter(Boolean));

        if (segments.length === 0) return;
        if (index < 0 || index >= segments.length) return;

        // 1) Collect connection IDs present in ALL tokens of the segment being removed
        const linkIdSet = new Set();
        for (const tok of segments[index]) {
            const ids = Array.from(tok.matchAll(/\((\d+),\d+\)/g)).map((m) => m[1]);
            ids.forEach((id) => linkIdSet.add(id));
        }

        // 2) Remove the entire segment
        segments.splice(index, 1);

        // 3) Remove matching links from all remaining tokens
        if (linkIdSet.size > 0) {
            for (let si = 0; si < segments.length; si++) {
                for (let ti = 0; ti < segments[si].length; ti++) {
                    let tok = segments[si][ti];
                    linkIdSet.forEach((id) => {
                        tok = tok.replace(new RegExp(`\\(${id},\\d+\\)`, 'g'), '');
                    });
                    segments[si][ti] = tok;
                }
            }
        }

        // 4) Rebuild BILN
        const newBiln = segments.length === 0
            ? ''
            : segments.map(seg => seg.join('-')).join('.');

        setBilnValue(newBiln);

        // 5) Update uiState focus to a valid sequence (keep same index if possible)
        setUiState(prev => {
            const newSeqCount = segments.length;
            let nextIdx = null;
            if (newSeqCount > 0) {
                nextIdx = Math.min(index, newSeqCount - 1);
            }
            if (prev.seqNumber === newSeqCount && prev.activeSeqIdx === nextIdx) return prev;
            return { ...prev, seqNumber: newSeqCount, activeSeqIdx: nextIdx };
        });
    };

    // Handle drag start
    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        setHoveredMonomer(''); // Clear hover state when dragging starts
    }, [setIsDragging, setHoveredMonomer]);

    // Handle drag end
    const handleOnDragEnd = useCallback(async (result) => {
        setIsDragging(false);
        // console.log('Drag result:', result);
        const { source, destination } = result;

        if (!destination) {
            return; // dropped outside the list
        }

        // No-op drop
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Work on a clone first; only commit if valid.
        const nextRows = (rowMonomerLists || []).map((row) => Array.from(row || []));

        const srcId = parseInt(String(source.droppableId), 10);
        const dstId = parseInt(String(destination.droppableId), 10);
        if (!Number.isFinite(srcId) || !Number.isFinite(dstId)) return;

        // Support dropping into a UI-only placeholder chain row (dstId may be >= current chain count).
        const needed = Math.max(srcId, dstId);
        while (nextRows.length <= needed) nextRows.push([]);

        if (srcId === dstId) {
            const reorderedList = Array.from(nextRows[srcId] || []);
            const [removed] = reorderedList.splice(source.index, 1);
            reorderedList.splice(destination.index, 0, removed);
            nextRows[srcId] = reorderedList;
        } else {
            const sourceList = Array.from(nextRows[srcId] || []);
            const destList = Array.from(nextRows[dstId] || []);
            const [removed] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, removed);
            nextRows[srcId] = sourceList;
            nextRows[dstId] = destList;
        }

        const candidateBiln = buildBilnFromRowMonomerLists(nextRows, bilnValue);
        const validation = validateDnDReorder(nextRows, candidateBiln);
        if (!validation.ok) {
            await showDnDInvalidMoveDialog(validation);
            return;
        }

        // Commit: update the memoized rows in-place (existing pattern here)
        for (let i = 0; i < nextRows.length; i++) rowMonomerLists[i] = nextRows[i];
        if (candidateBiln) setBilnValue(() => candidateBiln);

    }, [bilnValue, setBilnValue, rowMonomerLists, validateDnDReorder, showDnDInvalidMoveDialog, setIsDragging]);


    return {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
        handleDragStart,
        handleDeleteSequence,
        replaceMonomerInBiln,
        handleCircularizeSequence,
        handleUncircularizeSequence,
        handleMirrorSequence,
    };
}
