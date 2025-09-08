/**
 * Decomposes a BILN string into tokens and separators.
 */
export function decomposeBiln(biln) {
    const parts = biln.split(/([.-])/);
    const tokens = parts.filter((_, i) => i % 2 === 0);
    const seps = parts.filter((_, i) => i % 2 === 1);
    return { tokens, seps };
}

/**
 * Builds a link map from a BILN string.
 */
export function buildLinkMapFromBiln(bilnValue) {
    const { tokens } = decomposeBiln(bilnValue);
    const linkMap = {};
    tokens.forEach((tok, monomerIdx) => {
        const matches = Array.from(tok.matchAll(/\((\d+),(\d+)\)/g));
        matches.forEach(([, linkId, rgroup]) => {
            if (!linkMap[linkId]) linkMap[linkId] = [];
            if (!linkMap[linkId].some(pair => pair.monomerIdx === monomerIdx && pair.rgroup === Number(rgroup))) {
                linkMap[linkId].push({ monomerIdx, rgroup: Number(rgroup) });
            }
        });
    });
    return linkMap;
}

/**
 * Splits a BILN string into array of sequences.
 */
export function getSequences(input) {
    if (!input) return [];
    const seqArr = input.includes('.') ? input.split('.') : [input];
    return seqArr.map((sequence) => (sequence.replace(/\([^)]*\)/g, '')));
}

/**
 * Remove a group from a string, matching a target value.
 */
export function removeGroup(str, target) {
    const regex = new RegExp("\\([^)]*?,\\s*" + target + "\\)", "g");
    return str.replace(regex, "");
}

/**
 * Rebuild the BILN string from the reordered monomer lists.
 */
export function buildBilnFromRowMonomerLists(rowLists, prevBiln) {
    const { tokens: origTokens } = decomposeBiln(prevBiln);
    const rowStrs = rowLists.map((row) => {
        const newTokens = row.map((m) => {
            const idx = parseInt(m['res-idx'].split('-')[1], 10);
            return origTokens[idx];
        });
        return newTokens.join('-');
    });
    return rowStrs.join('.').replace(/[-.\s]+$/g, '');
}

/**
 * Set monomer sequences from a BILN string and monomers.
 */
export function setMonomerSequences(bilnValue, monomers) {
    const sequences = getSequences(bilnValue);
    if (!sequences.length) return [];

    let offset = 0;
    return sequences.map(seq => {
        const count = seq.split('-').length;
        const slice = monomers.slice(offset, offset + count);
        offset += count;
        return slice;
    });
}