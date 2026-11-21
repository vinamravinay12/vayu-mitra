import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { airSnapshot, DELHI } from '../test-utils/fixtures.js';
import { useAir } from './use-air.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A fetch that answers only when told to. */
function deferredFetch() {
  let answer: (response: Response) => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const pending = new Promise<Response>((resolve, reject) => {
    answer = resolve;
    fail = reject;
  });
  return {
    fetch: () => pending,
    answer: (body: unknown) => {
      answer(new Response(JSON.stringify(body)));
    },
    fail,
    pending,
  };
}

describe('useAir', () => {
  it('ignores a forecast that arrives after the view has gone', async () => {
    const deferred = deferredFetch();
    vi.stubGlobal('fetch', deferred.fetch);
    const { result, unmount } = renderHook(() => useAir(DELHI));
    unmount();
    deferred.answer(airSnapshot());
    await deferred.pending;
    await Promise.resolve();
    expect(result.current.air.status).toBe('loading');
  });

  it('ignores a failure that arrives after the view has gone', async () => {
    const deferred = deferredFetch();
    vi.stubGlobal('fetch', deferred.fetch);
    const { result, unmount } = renderHook(() => useAir(DELHI));
    unmount();
    deferred.fail(new TypeError('offline'));
    await deferred.pending.catch(() => undefined);
    await Promise.resolve();
    expect(result.current.air.status).toBe('loading');
  });
});
