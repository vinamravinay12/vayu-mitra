/** Tests of useStartup and useHousehold. */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installFakeServer } from '../test-utils/fake-server.js';
import { DELHI } from '../test-utils/fixtures.js';
import { useHousehold } from './use-household.js';
import { messageOf, useStartup } from './use-startup.js';
import { api } from './hooks.fixtures.js';

describe('useStartup', () => {
  it('ignores answers that arrive after unmount', async () => {
    const server = installFakeServer();
    const { result, unmount } = renderHook(() => useStartup());
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(result.current.startup.status).toBe('loading');
    server.failures.set('GET /api/config', 500);
    const failing = renderHook(() => useStartup());
    failing.unmount();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(failing.result.current.startup.status).toBe('loading');
  });

  it('records signing in only once ready', async () => {
    installFakeServer();
    const { result } = renderHook(() => useStartup());
    act(() => {
      result.current.setSignedIn('early@b.test', true);
    });
    expect(result.current.startup.status).toBe('loading');
    await vi.waitFor(() => {
      expect(result.current.startup.status).toBe('ready');
    });
  });

  it('words unknown failures generically', () => {
    expect(messageOf(new TypeError('x'))).toBe('Something went wrong. Please try again.');
    expect(messageOf('x')).toBe('Something went wrong. Please try again.');
  });
});

describe('useHousehold', () => {
  it('saves a change made before the record has loaded, then shows the server’s copy', async () => {
    const server = installFakeServer();
    const { result } = renderHook(() => useHousehold(api));
    act(() => {
      result.current.setPlace(DELHI);
    });
    await vi.waitFor(() => {
      expect(result.current.household?.place).toEqual(DELHI);
    });
    expect(server.household.place).toEqual(DELHI);
  });
});
