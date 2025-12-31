import { describe, it, expect } from 'vitest';

import { formatConformerJobProgressMessage } from '../conformerJobProgress';

describe('formatConformerJobProgressMessage', () => {
  it('appends elapsed/timeout info for embedding stage when raw has timeout fields', () => {
    const msg = formatConformerJobProgressMessage({
      stage: 'embedding',
      message: 'Embedding attempt 1 with mapping ratio 1.0...',
      raw: {
        stage: 'embedding',
        mode: 'coordmap',
        timeout_s: 50.0,
        elapsed_s: 12.792651950992877,
        remaining_s: 37.20734804900712,
        timeout_ratio: 0.25585303901985754,
      },
    });

    expect(msg).toContain('Embedding attempt 1');
    expect(msg).toContain('12.8s / 50s');
    expect(msg).toContain('(26%)');
    expect(msg).toContain('remaining 37.2s');
  });

  it('builds a message even when backend message is missing (embedding stage)', () => {
    const msg = formatConformerJobProgressMessage({
      stage: 'embedding',
      message: null,
      raw: {
        mode: 'coordmap',
        timeout_s: 50,
        elapsed_s: 2.000286092996248,
        remaining_s: 47.99971390700375,
        timeout_ratio: 0.04000572185992496,
      },
    });

    expect(msg).toContain('Embedding (coordmap)');
    expect(msg).toContain('2s / 50s');
    expect(msg).toContain('(4%)');
  });

  it('returns null when no message is available and not embedding timeout', () => {
    expect(formatConformerJobProgressMessage({ stage: 'running', message: '', raw: {} })).toBe(null);
  });
});
