import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { useConformerJob } from '../useConformerJob';

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function TestComponent() {
  const job = useConformerJob({ dbName: 'pepedit', ownerId: null, baseUrlOverride: '' });

  return (
    <div>
      <button
        onClick={() =>
          job.start({
            biln: 'A-A',
            ssConstraints: null,
            embedParams: { use_random_coords: true, timeout: 50 },
          })
        }
      >
        start
      </button>
      <button onClick={() => job.cancel()}>cancel</button>

      <div data-testid="state">{job.state}</div>
      <div data-testid="jobId">{job.jobId || ''}</div>
      <div data-testid="progress">{job.progressMessage || ''}</div>
      <div data-testid="pdb">{job.resultRef?.properties?.PDB || ''}</div>
      <div data-testid="errorType">{job.errorType || ''}</div>
      <div data-testid="error">{job.error || ''}</div>
    </div>
  );
}

describe('useConformerJob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function flushMicrotasks() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  async function flushUntil(predicate, { max = 20 } = {}) {
    for (let i = 0; i < max; i++) {
      if (predicate()) return true;
      await flushMicrotasks();
    }
    return predicate();
  }

  it('polls and exposes progress updates (component-level assertion)', async () => {
    const fetchMock = global.fetch;

    fetchMock
      // startConformerJob
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'success',
            data: { job_id: 'job-1', status_url: '/api/core/molecules/conformer_jobs/job-1', cancel_url: '/api/core/molecules/conformer_jobs/job-1/cancel' },
          },
          { status: 202 },
        ),
      )
      // getConformerJob (queued)
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { job_id: 'job-1', state: 'queued', progress: null, result_ref: null, error: null },
        }),
      )
      // getConformerJob (running)
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: {
            job_id: 'job-1',
            state: 'running',
            progress: { stage: 'embedding', message: 'Embedding (12/75, ratio=0.8, seed=123456)', raw: { current: 12, total: 75, mapping_ratio: 0.8 } },
            result_ref: null,
            error: null,
          },
        }),
      )
      // getConformerJob (success)
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: {
            job_id: 'job-1',
            state: 'success',
            progress: { stage: 'success', message: 'Done' },
            result_ref: { properties: { PDB: 'PDBDATA', SDF: 'SDFDATA', SMILES: 'C', BILN: 'A-A' } },
            error: null,
          },
        }),
      );

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('start'));
    });

    // allow start + immediate GET to resolve (but do not run timers)
    await flushMicrotasks();
    await flushMicrotasks();

    expect(screen.getByTestId('state').textContent).toMatch(/queued|running|success/);

    // next poll (queued interval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await flushUntil(() => (screen.getByTestId('progress').textContent || '').includes('Embedding'));

    expect(screen.getByTestId('progress').textContent).toContain('Embedding');

    // next poll (running interval)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    await flushUntil(() => screen.getByTestId('state').textContent === 'success');

    expect(screen.getByTestId('state').textContent).toBe('success');
    expect(screen.getByTestId('pdb').textContent).toBe('PDBDATA');

    const callsAfterSuccess = fetchMock.mock.calls.length;

    // ensure polling stops after terminal state
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(fetchMock.mock.calls.length).toBe(callsAfterSuccess);
  });

  it.skip('supports cancel and transitions to canceled when backend reports it', async () => {
    const fetchMock = global.fetch;

    fetchMock
      // start
      .mockResolvedValueOnce(
        jsonResponse(
          { status: 'success', data: { job_id: 'job-2', status_url: '/api/core/molecules/conformer_jobs/job-2', cancel_url: '/api/core/molecules/conformer_jobs/job-2/cancel' } },
          { status: 202 },
        ),
      )
      // initial status: running
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { job_id: 'job-2', state: 'running', progress: { stage: 'embedding', message: 'Embedding…' }, result_ref: null, error: null },
        }),
      )
      // cancel
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: { job_id: 'job-2' } }))
      // status after cancel
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { job_id: 'job-2', state: 'canceled', progress: { stage: 'canceled', message: 'Canceled' }, result_ref: null, error: null },
        }),
      );

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('start'));
    });

    await flushUntil(() => screen.getByTestId('jobId').textContent === 'job-2');

    await act(async () => {
      fireEvent.click(screen.getByText('cancel'));
    });

    await flushUntil(() => screen.getByTestId('state').textContent === 'canceled');

    expect(screen.getByTestId('state').textContent).toBe('canceled');
  });

  it('treats backend job failure as job errorType', async () => {
    const fetchMock = global.fetch;

    fetchMock
      // start
      .mockResolvedValueOnce(
        jsonResponse(
          { status: 'success', data: { job_id: 'job-3' } },
          { status: 202 },
        ),
      )
      // failed status
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { job_id: 'job-3', state: 'failed', progress: { stage: 'failed', message: 'Failed' }, result_ref: null, error: { message: 'No conformer found' } },
        }),
      );

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('start'));
    });

    await flushMicrotasks();
    await flushMicrotasks();

    expect(screen.getByTestId('state').textContent).toBe('failed');
    expect(screen.getByTestId('errorType').textContent).toBe('job');
    expect(screen.getByTestId('error').textContent).toContain('No conformer found');
  });

  it('treats fetch errors as network errorType', async () => {
    const fetchMock = global.fetch;

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { status: 'success', data: { job_id: 'job-4' } },
          { status: 202 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('Network down'));

    render(<TestComponent />);

    await act(async () => {
      fireEvent.click(screen.getByText('start'));
    });

    await flushMicrotasks();
    await flushMicrotasks();

    expect(screen.getByTestId('errorType').textContent).toBe('network');
    expect(screen.getByTestId('error').textContent).toContain('Network');
  });
});
