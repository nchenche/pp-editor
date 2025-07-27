import { useCallback } from "react";
import {
    decomposeBiln,
    removeGroup,
    buildBilnFromRowMonomerLists,
} from "../utils/bilnUtils";

export function useBilnHandlers({
    bilnValue,
    setBilnValue,
    monomers,
    rowMonomerLists,
    setRowMonomerLists,
    linkMap,
    uiState,
    setUiState
}) {

    /**
     * Add a monomer to the current BILN string.
     * @param {Object} monomer - The monomer object to add.
     * @param {number} activeSeqIdx - The index of the active sequence.
     * @param {string} bilnValue - The current BILN string.
     * @param {Array} monomers - The list of all monomers.
     * @param {Function} setBilnValue - Function to update the BILN string.
     */
    const addMonomerToBiln = useCallback((monomer, uiState) => {
        if (!monomer) return;

        const code = monomer.symbol || monomer.m_abbr;
        const isNterCap =
            monomer.m_subtype === "cap" && monomer.m_RgroupIdx[1] != null;
        const isCterCap =
            monomer.m_subtype === "cap" && monomer.m_RgroupIdx[0] != null;

        // 1. split into segments and trim stray separators
        const trimmed = bilnValue.replace(/^[.-]+|[.-]+$/g, "");
        const segments = trimmed.split(".");

        // 2. target segment string and its monomer codes
        const seg = segments[uiState.activeSeqIdx] || "";
        const segMonomers = seg ? seg.split("-") : [];

        // 3. find “global” offsets to look up current terminal monomers
        const offset = segments
            .slice(0, uiState.activeSeqIdx)
            .reduce((sum, s) => sum + (s ? s.split("-").length : 0), 0);
        const nterGlobalIdx = offset;
        const cterGlobalIdx = offset + segMonomers.length - 1;

        // 4. grab the actual monomer objects
        const nterMonomer = monomers.find(
            (m) => parseInt(m["res-idx"].split("-")[1], 10) === nterGlobalIdx
        );
        const cterMonomer = monomers.find(
            (m) => parseInt(m["res-idx"].split("-")[1], 10) === cterGlobalIdx
        );

        // 5. detect if they’re already caps
        const isNterCapped =
            nterMonomer?.m_subtype === "cap" && nterMonomer.m_RgroupIdx[1] != null;
        const isCterCapped =
            cterMonomer?.m_subtype === "cap" && cterMonomer.m_RgroupIdx[0] != null;

        // 6. build the new segment
        let newSegMonomers = segMonomers.slice(); // copy array

        if (isNterCap) {
            if (isNterCapped) {
                // replace index 0
                newSegMonomers[0] = code;
            } else {
                // prepend
                newSegMonomers.unshift(code);
            }
        } else {
            if (isCterCap && isCterCapped) {
                // replace last
                newSegMonomers[newSegMonomers.length - 1] = code;
            } else {
                // append
                newSegMonomers.push(code);
            }
        }

        // 7. write back full BILN
        segments[uiState.activeSeqIdx] = newSegMonomers.join("-");
        const newBiln = segments.join(".");

        setBilnValue(newBiln);
        console.log("Updated BILN:", newBiln);

    }, [bilnValue, setBilnValue, monomers]);


    // Delete monomer
    const handleDeleteMonomerItem = useCallback((monomer) => {
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
        setBilnValue(newBiln);
    }, [bilnValue, setBilnValue]);


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


    // Handle drag end
    const handleOnDragEnd = useCallback((result) => {
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

            setRowMonomerLists((prev) => {
                const next = [...prev];
                next[source.droppableId] = reorderedList;

                newBiln = buildBilnFromRowMonomerLists(next, bilnValue);
                return next;
            });
        }
        else {
            // Move between lists
            const sourceList = Array.from(rowMonomerLists[source.droppableId]);
            const destList = Array.from(rowMonomerLists[destination.droppableId]);
            const [removed] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, removed);

            setRowMonomerLists((prev) => {
                const next = [...prev];
                next[source.droppableId] = sourceList;
                next[destination.droppableId] = destList;

                newBiln = buildBilnFromRowMonomerLists(next, bilnValue);
                return next;
            });
        }
        if (newBiln) setBilnValue(() => newBiln);

    }, [bilnValue, setBilnValue, rowMonomerLists]);


    return {
        addMonomerToBiln,
        handleDeleteMonomerItem,
        handleMonomerLinking,
        handleBondBreaking,
        handleOnDragEnd,
    };
}
