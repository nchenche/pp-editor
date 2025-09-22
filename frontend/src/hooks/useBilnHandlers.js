import { useCallback } from "react";
import { decomposeBiln, removeGroup, buildBilnFromRowMonomerLists } from "../utils/bilnUtils";
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

    /**
     * Add a monomer at C-ter with smart handling of caps and occupied termini.
     */
    const addMonomerToBiln = useCallback(async (monomer, uiState) => {
        if (!monomer) return;

        const code = monomer.symbol || monomer.m_abbr;
        if (!code) {
            console.warn("Monomer has no valid code:", monomer);
            return;
        }

        const addingIsCap = monomer.m_subtype === "cap";
        // Determine cap direction of the item being added (if a cap)
        const isNterCap = addingIsCap && monomer.m_RgroupIdx?.[1] != null;
        const isCterCap = addingIsCap && monomer.m_RgroupIdx?.[0] != null;

        // Split current BILN into segments
        const trimmed = (bilnValue || "").replace(/^[.-]+|[.-]+$/g, "");
        const segments = trimmed ? trimmed.split(".") : [""];

        // Active segment
        const segIdx = uiState.activeSeqIdx ?? 0;
        const seg = segments[segIdx] || "";
        const segMonomers = seg ? seg.split("-") : [];

        // Global indices to fetch terminal monomers
        const offset = segments
            .slice(0, segIdx)
            .reduce((sum, s) => sum + (s ? s.split("-").length : 0), 0);

        const cterGlobalIdx = offset + Math.max(segMonomers.length - 1, 0);

        // Lookup terminal monomer object
        const getByResIdx = (gi) => monomers.find(
            (m) => parseInt(String(m["res-idx"]).split("-")[1], 10) === gi
        );
        const cterMonomer = segMonomers.length > 0 ? getByResIdx(cterGlobalIdx) : undefined;

        // Case: adding a non-cap but C-ter is not free (either capped or already bonded)
        const cterAvailable = isCterFree(cterGlobalIdx, cterMonomer);

        // If empty sequence, just add
        if (segMonomers.length === 0) {
            const newSeg = addingIsCap && isNterCap ? [code] : [code];
            segments[segIdx] = newSeg.join("-");
            setBilnValue(segments.join("."));
            return;
        }

        if (!addingIsCap && !cterAvailable) {
            // Build helpful, short message
            const lastLabel = segMonomers[segMonomers.length - 1];
            const isLastCap = cterMonomer?.m_subtype === 'cap';
            const reason = isLastCap
                ? `The C-terminus is capped with “${cterMonomer?.symbol || lastLabel}”.`
                : `The C-terminus is already used in a bond (e.g., head‑to‑tail cyclization).`;

            const title = 'Cannot append at C‑terminus';
            const message = [
                reason,
                '',
                isLastCap
                    ? `Append is not possible while the cap is present. You can replace the C‑ter cap with “${code}”.`
                    : `Append is not possible while the C‑ter is occupied. Insert at another position or remove the bond first.`,
            ].join('\n');

            if (isLastCap) {
                const ok = await confirm({
                    title,
                    message,
                    confirmText: `Replace cap with “${code}”`,
                    cancelText: 'Cancel',
                });
                if (!ok) return;

                // Replace last token (the cap) with the new monomer code
                const newSegMonomers = segMonomers.slice();
                newSegMonomers[newSegMonomers.length - 1] = code;
                segments[segIdx] = newSegMonomers.join("-");
                setBilnValue(segments.join("."));
                return;
            } else {
                // Inform-only dialog
                await confirm({
                    title,
                    message,
                    confirmText: 'Close',
                    hideCancel: true,
                });
                return;
            }
        }

        // Default behavior:
        // - If adding an N-ter cap: replace or prepend at N-ter (not covered here; kept simple)
        // - If adding a C-ter cap: replace existing cap or append cap
        // - Else append to C-ter
        let newSegMonomers = segMonomers.slice();

        if (isNterCap) {
            // Optional: implement N-ter capping policy here
            newSegMonomers.unshift(code);
        } else if (isCterCap) {
            // Replace existing C-ter cap or append cap
            const lastIsCap = cterMonomer?.m_subtype === 'cap';
            if (lastIsCap) newSegMonomers[newSegMonomers.length - 1] = code;
            else newSegMonomers.push(code);
        } else {
            // Regular monomer append
            newSegMonomers.push(code);
        }

        segments[segIdx] = newSegMonomers.join("-");
        setBilnValue(segments.join("."));
    }, [bilnValue, monomers, setBilnValue, isCterFree]);
    // Delete monomer
    const handleDeleteMonomerItem = (monomer) => {
        if (!monomer) return;

        const resIdx = parseInt(monomer['res-idx'].split('-')[1], 10); // 0-based
        const { tokens, seps } = decomposeBiln(bilnValue);

        const targetToken = tokens[resIdx];

        // 1. Extract connection IDs from the token to remove
        const linkIds = Array.from(targetToken.matchAll(/\((\d+),\d+\)/g)).map((m) => m[1]);

        // 2. Remove all matching links from other tokens
        if (linkIds.length > 0) {
            tokens.forEach((tok, i) => {
                if (i !== resIdx) {
                    linkIds.forEach((id) => {
                        tokens[i] = tok.replace(new RegExp(`\\(${id},\\d+\\)`, 'g'), '');
                    });
                }
            });
        }

        // 3. Remove the token and its associated separator
        tokens.splice(resIdx, 1);

        // 4. Handle separator removal carefully
        if (seps.length > 0) {
            const isNextSepRowSplit = seps[resIdx] === '.';
            const sepIdxToRemove = isNextSepRowSplit ? resIdx - 1 : resIdx;

            if (sepIdxToRemove >= 0 && sepIdxToRemove < seps.length) {
                seps.splice(sepIdxToRemove, 1);
            }
        }

        // 5. Rebuild the BILN
        const newBiln = tokens.map((t, i) => t + (seps[i] || '')).join('').replace(/[-.\s]+$/g, '');
        console.log("Deletion of monomer:", monomer["res-idx"]);
        console.log("New BILN:", newBiln);
        setBilnValue(newBiln);
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
