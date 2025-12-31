/**
 * Helpers to format conformer job progress for display.
 */

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toFiniteInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
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

function formatSecondsCompact(value) {
  const n = toFiniteNumber(value);
  if (n == null) return null;

  if (n > 0 && n < 1) return '<1s';
  return formatSeconds(n, { decimals: n < 60 ? 1 : 0 });
}

function normalizeModeLabel(mode) {
  const v = String(mode || '').trim().toLowerCase();
  if (!v) return '';
  if (v === 'coordmap') return 'guided';
  if (v === 'no_coordmap') return 'random';
  return v;
}

function formatAnchorsKeptPct(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const pctFromExplicit = (() => {
    const v = toFiniteNumber(raw.anchors_kept_pct);
    if (v == null) return null;
    return Math.round(Math.max(0, Math.min(1, v)) * 100);
  })();
  if (pctFromExplicit != null) return pctFromExplicit;

  const pctFromInt = toFiniteInteger(raw.mapping_ratio_pct);
  if (pctFromInt != null) return Math.max(0, Math.min(100, pctFromInt));

  const ratio = toFiniteNumber(raw.mapping_ratio);
  if (ratio != null) return Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  return null;
}

function formatEmbeddingMessageFromRaw(raw, { compact } = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const modeLabel = normalizeModeLabel(raw.mode);

  const attemptIndex = toFiniteInteger(raw.attempt_index ?? raw.current);
  const totalAttempts = toFiniteInteger(raw.total_attempts ?? raw.total);
  const attemptPart = attemptIndex && totalAttempts ? `${attemptIndex}/${totalAttempts}` : (attemptIndex ? String(attemptIndex) : '');

  const anchorsPct = formatAnchorsKeptPct(raw);
  const anchorsUsed = toFiniteInteger(raw.anchors_used);
  const anchorsTotal = toFiniteInteger(raw.anchors_total);
  const anchorsCountPart = anchorsUsed != null && anchorsTotal != null && anchorsTotal > 0 ? ` (${anchorsUsed}/${anchorsTotal})` : '';

  const attemptElapsed = toFiniteNumber(raw.attempt_elapsed_s ?? raw.elapsed_s ?? raw.elapsedS ?? raw.elapsed);
  const attemptTimeout = toFiniteNumber(raw.attempt_timeout_s ?? raw.timeout_s ?? raw.timeoutS ?? raw.timeout);
  const totalElapsed = toFiniteNumber(raw.embedding_elapsed_total_s);

  const attemptElapsedTxt = attemptElapsed != null ? formatSecondsCompact(attemptElapsed) : null;
  const attemptTimeoutTxt = attemptTimeout != null ? formatSeconds(attemptTimeout, { decimals: 0 }) : null;
  const totalElapsedTxt = totalElapsed != null ? formatSecondsCompact(totalElapsed) : null;

  const state = String(raw.state || '').trim().toLowerCase();
  const success = typeof raw.success === 'boolean' ? raw.success : null;

  const parts = [];

  // Keep the prefix short for narrow UIs.
  const prefix = compact ? 'Embed' : 'Embedding';
  parts.push(modeLabel && !compact ? `${prefix} (${modeLabel})` : prefix);

  if (attemptPart) parts.push(attemptPart);

  if (anchorsPct != null) {
    const anchorsLabel = compact ? `anchors kept ${anchorsPct}%` : `anchors kept ${anchorsPct}%`;
    parts.push(`· ${anchorsLabel}${anchorsCountPart}`);
  }

  if (attemptElapsedTxt) {
    const time = attemptTimeoutTxt ? `${attemptElapsedTxt}/${attemptTimeoutTxt}` : attemptElapsedTxt;
    parts.push(`— ${time}`);
  }

  if (totalElapsedTxt) {
    parts.push(`(total ${totalElapsedTxt})`);
  }

  if (state === 'finished' && success === false) {
    parts.push('· failed');
  }

  return parts.join(' ');
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
export function formatConformerJobProgressMessage(progress, { compact = false } = {}) {
  if (!progress || typeof progress !== 'object') return null;

  const raw = progress.raw;
  const stage = String(progress.stage ?? raw?.stage ?? '').trim().toLowerCase();
  const message = progress.message != null ? String(progress.message) : '';

  // Special-case: embedding can run up to a timeout (RDKit EmbedMolecule/EmbedMultipleConfs).
  if (stage === 'embedding') {
    const fromRaw = formatEmbeddingMessageFromRaw(raw, { compact });
    if (fromRaw) return fromRaw;

    // Backward compatibility: if backend hasn't been updated to the new raw fields,
    // fall back to the legacy timeout-derived suffix and/or message.
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
