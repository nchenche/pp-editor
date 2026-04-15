import { API_URL, DB_NAME } from '../config';
import { apiFetch } from './api';


// Normalize common user input mistakes in BILN strings.
// - no leading/trailing whitespace
// - no whitespace around '-' separators
export function normalizeBilnInput(input) {
    if (input == null) return '';
    let s = String(input);
    // normalize common copy/paste whitespace
    s = s.replace(/\u00A0/g, ' ');
    // trim start/end (covers spaces, tabs, newlines)
    s = s.trim();
    // remove whitespace around '-' (covers typing and paste cases)
    s = s.replace(/\s*-\s*/g, '-');
    // normalize *complete* bond annotations to a canonical form: (id,rgroup)
    // (does not affect partial in-progress input like '(1,')
    s = s.replace(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, '($1,$2)');
    return s;
}


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
 * Remove a specific bond annotation of the form "(connId,rgroup)".
 *
 * This is stricter than removeGroup(): it will NOT remove other annotations
 * that happen to use the same rgroup but belong to a different connectionId.
 */
export function removeBondAnnotation(str, connId, rgroup) {
    if (str == null) return '';
    const id = Number(connId);
    const rg = Number(rgroup);
    if (!Number.isFinite(id) || !Number.isFinite(rg)) return String(str);
    const regex = new RegExp(`\\(${id}\\s*,\\s*${rg}\\)`, 'g');
    return String(str).replace(regex, '');
}

/**
 * Rebuild the BILN string from the reordered monomer lists.
 */
export function buildBilnFromRowMonomerLists(rowLists, prevBiln) {
    const { tokens: origTokens } = decomposeBiln(prevBiln || '');

    // Build per-row sequences, skipping empty rows
    const rowStrs = (rowLists || [])
        .map((row) => {
            const newTokens = (row || [])
                .map((m) => {
                    const idx = parseInt(String(m['res-idx']).split('-')[1], 10);
                    return origTokens[idx];
                })
                .filter(Boolean); // drop undefined/empty tokens
            return newTokens.join('-');
        })
        .filter((seg) => seg && seg.trim().length > 0); // drop empty segments

    if (rowStrs.length === 0) return '';

    // Join and normalize separators (defensive)
    return rowStrs
        .join('.')
        .replace(/^\.+|\.+$/g, '') // trim leading/trailing dots
        .replace(/\.+/g, '.')      // collapse multiple dots
        .replace(/\-+/g, '-')      // collapse multiple hyphens
        .replace(/[-.]+$/g, '');   // trim any trailing separators
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

/**
 * Reconcile activeSeqIdx when seq count changes
 * - If newCount is 0, return null
 * - If prevIdx is null or <0, return 0
 * - Else return min(prevIdx, newCount-1)
 */
export const reconcileActiveSeqIdx = (prevIdx, newCount) => {
    if (!newCount || newCount <= 0) return null;
    if (prevIdx == null || prevIdx < 0) return 0;
    return Math.min(prevIdx, newCount - 1);
};

/**
 * Derive number of sequences from bilnValue (robust to extra dots)
 */
export const deriveSeqCount = (biln) => {
    const t = (biln || '').trim().replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.');
    if (!t) return 0;
    return t.split('.').filter(Boolean).length;
};


// Simple one-letter amino acid validation
const VALID_AA = new Set([
    'A', 'R', 'N', 'D', 'C', 'Q', 'E', 'G', 'H', 'I',
    'L', 'K', 'M', 'F', 'P', 'S', 'T', 'W', 'Y', 'V'
]);

export function parseFastaToBiln(input) {
    // Split lines, ignore '>' headers and blank lines
    const rawLines = input.split(/\r?\n/).map(l => l.trim());
    const seqLines = rawLines.filter(l => l && !l.startsWith('>'));

    if (seqLines.length === 0) {
        throw new Error('No sequence lines found in FASTA input.');
    }
    if (seqLines.length > 10) {
        throw new Error('Maximum of 10 sequences allowed (one per line).');
    }

    const bilnChains = seqLines.map((line, idx) => {
        const chars = line.toUpperCase().replace(/\s+/g, '');
        if (!chars) {
            throw new Error(`Sequence line ${idx + 1} is empty.`);
        }

        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            if (!VALID_AA.has(ch)) {
                throw new Error(`Invalid amino acid '${ch}' at position ${i + 1} of sequence ${idx + 1}.`);
            }
        }

        // Convert to BILN chain: A-F-R-...
        return chars.split('').join('-');
    });

    // Join chains with '.' separator
    return bilnChains.join('.');
}


// Example HELM -> BILN server call (adjust URL to your backend)
export async function convertHelmToBiln(helmString) {

    const resp = await apiFetch(`${API_URL}/core/conversions/helm-to-biln`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: helmString, db_name: DB_NAME }),
    });

    if (!resp.ok) {
        let msg = 'Failed to convert HELM to BILN.';
        try {
            const j = await resp.json();
            if (j?.message) msg = j.message;
        } catch {
            // ignore parse error, keep generic message
        }
        throw new Error(msg);
    }

    const data = await resp.json();
    // Backend returns: { status: "success", data: { biln: "A-A-A" }, meta: {...} }
    const biln = data?.data?.biln;
    if (!biln) {
        throw new Error('Server did not return a BILN sequence.');
    }
    return biln;
}


export function analyzeBiln(biln) {
    const s = (biln || '').trim();
    if (!s) return { committable: true, tokenCount: 0, bondsComplete: true, incompleteBondIds: [] };
    if (/[-.\(,]\s*$/.test(s)) return { committable: false, tokenCount: 0, bondsComplete: false, incompleteBondIds: [] };

    let depth = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth < 0) return { committable: false, tokenCount: 0, bondsComplete: false, incompleteBondIds: [] };
        }
    }
    if (depth !== 0) return { committable: false, tokenCount: 0, bondsComplete: false, incompleteBondIds: [] };

    // Validate that every parenthesis group is a *complete* (int,int).
    // Examples that should NOT be committable:
    //  - A()
    //  - A(1,)
    //  - A(,2)
    //  - A(1,2,3)
    //  - A(foo)
    const parenGroups = s.match(/\([^)]*\)/g) || [];
    for (const grp of parenGroups) {
        if (!/^\(\s*\d+\s*,\s*\d+\s*\)$/.test(grp)) {
            return { committable: false, tokenCount: 0, bondsComplete: false, incompleteBondIds: [] };
        }
    }

    // Bond completeness check: each bondId in (bondId,rgroup) should appear exactly twice
    // (prevents triggering depiction/3D while user has only entered one endpoint).
    const bondCounts = {};
    const bondRegex = /\((\d+)\s*,\s*(\d+)\s*\)/g;
    let match;
    while ((match = bondRegex.exec(s)) !== null) {
        const bondId = match[1];
        bondCounts[bondId] = (bondCounts[bondId] || 0) + 1;
    }
    const incompleteBondIds = Object.entries(bondCounts)
        .filter(([, count]) => count !== 2)
        .map(([bondId]) => bondId);
    const bondsComplete = incompleteBondIds.length === 0;

    const noParen = s.replace(/\([^)]*\)/g, '');
    const tokenCount = noParen.split(/[.-]+/).filter(Boolean).length;
    return { committable: true, tokenCount, bondsComplete, incompleteBondIds };
}