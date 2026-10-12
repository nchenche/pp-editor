function firstNonEmptyString(...values) {
    for (const v of values) {
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

/**
 * Resolve the BILN of a conformer job from one or more job-like documents
 * (list item, job detail, locally stored inputs), in priority order.
 *
 * The backend does not put BILN in `result_ref.properties`; it is only available
 * in the submitted inputs (`inputs.payload.biln`). Result/top-level fields are still
 * checked first so a backend that adds them later takes precedence.
 *
 * @param {...(object|null|undefined)} sources
 * @returns {string}
 */
export function getConformerJobBiln(...sources) {
    for (const src of sources) {
        if (!src || typeof src !== 'object') continue;
        const biln = firstNonEmptyString(
            src.result_ref?.properties?.BILN,
            src.result_ref?.properties?.biln,
            src.biln,
            src.properties?.BILN,
            src.inputs?.payload?.biln,
        );
        if (biln) return biln;
    }
    return '';
}
