import { useCallback } from "react";
import { removeGroup, buildBilnFromRowMonomerLists } from "../utils/bilnUtils";
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

    // Handle drag start
    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        setHoveredMonomer(''); // Clear hover state when dragging starts
    }, [setIsDragging, setHoveredMonomer]);

    // Handle drag end
    const handleOnDragEnd = useCallback((result) => {
        setIsDragging(false);
        // console.log('Drag result:', result);
        const { source, destination, draggableId } = result;

        if (!destination) {
            return; // dropped outside the list
        }

        let newBiln = null;
        if (source.droppableId === destination.droppableId) {
            // Reorder within the same list
            const reorderedList = Array.from(rowMonomerLists[source.droppableId]);
            const [removed] = reorderedList.splice(source.index, 1);
            reorderedList.splice(destination.index, 0, removed);

            rowMonomerLists[source.droppableId] = reorderedList;
            newBiln = buildBilnFromRowMonomerLists(rowMonomerLists, bilnValue);
            console.log("Reordered BILN:", newBiln);
        }
        else {
            // Move between 2 different lists
            const sourceList = Array.from(rowMonomerLists[source.droppableId]);
            const destList = Array.from(rowMonomerLists[destination.droppableId]);
            const [removed] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, removed);

            rowMonomerLists[source.droppableId] = sourceList;
            rowMonomerLists[destination.droppableId] = destList;
            newBiln = buildBilnFromRowMonomerLists(rowMonomerLists, bilnValue);
            console.log("Moved BILN:", newBiln);
        }
        if (newBiln) setBilnValue(() => newBiln);

    }, [bilnValue, setBilnValue, rowMonomerLists]);


    return {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
        handleDragStart,
    };
}
