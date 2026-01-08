import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// Mutable mock job state that our mocked hook will read.
let mockJob;

vi.mock('../useOwnerId', () => ({
  useOwnerId: () => null,
}));

vi.mock('../useConformerJob', () => ({
  useConformerJob: () => mockJob,
}));

import { useGenerate3D } from '../useGenerate3D';

function TestComponent() {
  const gen = useGenerate3D('');
  const pdb = gen?.result?.pdb || gen?.result?.PDB || '';
  return <div data-testid="pdb">{pdb}</div>;
}

describe('useGenerate3D', () => {
  afterEach(() => {
    cleanup();
  });

  it('preserves last successful result when job is canceled', () => {
    mockJob = {
      jobId: 'job-1',
      state: 'success',
      progress: null,
      progressMessage: null,
      mappingMessage: null,
      mappingRaw: null,
      progressLog: null,
      resultRef: { properties: { PDB: 'PDBDATA' } },
      error: null,
      errorType: '',
      isActive: false,
      isStarting: false,
      isCanceling: false,
      start: vi.fn(),
      cancel: vi.fn(),
      retry: vi.fn(),
      clear: vi.fn(),
    };

    const { getByTestId, rerender } = render(<TestComponent />);
    expect(getByTestId('pdb').textContent).toBe('PDBDATA');

    // Simulate cancel after a previous success.
    mockJob = { ...mockJob, state: 'canceled' };
    rerender(<TestComponent />);

    // Should keep showing the last success PDB.
    expect(getByTestId('pdb').textContent).toBe('PDBDATA');
  });
});
