/**
 * Helpers to format conformer job progress for display.
 */

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatSeconds(value, { decimals } = {}) {
  const n = toFiniteNumber(value);
  if (n == null) return null;

  const d = typeof decimals === 'number' ? Math.max(0, Math.min(3, decimals)) : 1;
  // Avoid "-0.0".
  const fixed = Math.max(0, n).toFixed(d);

  // Trim trailing ".0" when decimals===1 but value is an integer-ish.
  if (d > 0 && fixed.endsWith(`.${'0'.repeat(d)}`)) {
    return `${fixed.slice(0, -1 - d)}s`;
  }

  return `${fixed}s`;
}

function formatEmbeddingTimeoutSuffix(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const timeoutS = toFiniteNumber(raw.timeout_s ?? raw.timeoutS ?? raw.timeout);
  const elapsedS = toFiniteNumber(raw.elapsed_s ?? raw.elapsedS ?? raw.elapsed);
  if (timeoutS == null || elapsedS == null || timeoutS <= 0) return null;

  const remainingS = toFiniteNumber(raw.remaining_s ?? raw.remainingS ?? raw.remaining) ?? Math.max(0, timeoutS - elapsedS);
  const ratio = toFiniteNumber(raw.timeout_ratio ?? raw.timeoutRatio) ?? (elapsedS / timeoutS);
  const pct = Number.isFinite(ratio) ? Math.max(0, Math.min(100, Math.round(ratio * 100))) : null;

  const elapsedTxt = formatSeconds(elapsedS, { decimals: 1 });
  const timeoutTxt = formatSeconds(timeoutS, { decimals: 0 });
  const remainingTxt = formatSeconds(remainingS, { decimals: 1 });

  if (!elapsedTxt || !timeoutTxt) return null;

  const parts = [`${elapsedTxt} / ${timeoutTxt}`];
  if (pct != null) parts.push(`(${pct}%)`);
  if (remainingTxt) parts.push(`remaining ${remainingTxt}`);

  return parts.join(' ');
}

/**
 * Returns a user-facing progress string, or null if none is available.
 *
 * Expected progress shape:
 *  { stage?: string, message?: string, raw?: any }
 */
export function formatConformerJobProgressMessage(progress) {
  if (!progress || typeof progress !== 'object') return null;

  const raw = progress.raw;
  const stage = String(progress.stage ?? raw?.stage ?? '').trim().toLowerCase();
  const message = progress.message != null ? String(progress.message) : '';

  // Special-case: embedding can run up to a timeout (RDKit EmbedMolecule/EmbedMultipleConfs).
  if (stage === 'embedding') {
    const suffix = formatEmbeddingTimeoutSuffix(raw);
    if (suffix) {
      if (message) return `${message} — ${suffix}`;
      const mode = raw?.mode ? String(raw.mode).trim() : '';
      const prefix = mode ? `Embedding (${mode})` : 'Embedding';
      return `${prefix} — ${suffix}`;
    }
  }

  return message || null;
}
