import { describe, it, expect } from 'vitest';

import { formatConformerJobProgressMessage } from '../conformerJobProgress';

describe('formatConformerJobProgressMessage', () => {
  it('formats embedding progress using raw attempt/anchors/timing fields', () => {
    const msg = formatConformerJobProgressMessage({
      stage: 'embedding',
      message: null,
      raw: {
        stage: 'embedding',
        mode: 'coordmap',
        state: 'running',
        attempt_index: 6,
        total_attempts: 50,
        anchors_kept_pct: 0.8,
        anchors_used: 32,
        anchors_total: 40,
        attempt_timeout_s: 50.0,
        attempt_elapsed_s: 12.792651950992877,
        embedding_elapsed_total_s: 12.792651950992877,
      },
    });

    expect(msg).toContain('Embedding (guided)');
    expect(msg).toContain('6/50');
    expect(msg).toContain('anchors kept 80% (32/40)');
    expect(msg).toContain('12.8s/50s');
    expect(msg).toContain('(total 12.8s)');
  });

  it('builds a message even when backend message is missing (embedding stage)', () => {
    const msg = formatConformerJobProgressMessage({
      stage: 'embedding',
      message: null,
      raw: {
        mode: 'coordmap',
        state: 'running',
        attempt_index: 1,
        total_attempts: 10,
        mapping_ratio_pct: 40,
        attempt_timeout_s: 50,
        attempt_elapsed_s: 0.2,
        embedding_elapsed_total_s: 2.000286092996248,
      },
    });

    expect(msg).toContain('Embedding (guided)');
    expect(msg).toContain('1/10');
    expect(msg).toContain('anchors kept 40%');
    expect(msg).toContain('<1s/50s');
    expect(msg).toContain('(total 2s)');
  });

  it('returns null when no message is available and not embedding timeout', () => {
    expect(formatConformerJobProgressMessage({ stage: 'running', message: '', raw: {} })).toBe(null);
  });
});
