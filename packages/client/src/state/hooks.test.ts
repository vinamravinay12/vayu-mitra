import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createApi } from '../api/api.js';
import { installFakeServer } from '../test-utils/fake-server.js';
import { DELHI } from '../test-utils/fixtures.js';
import { AIR_REFRESH_MS, useAir } from './use-air.js';
import { useChat } from './use-chat.js';
import { useHousehold } from './use-household.js';
import { messageOf, useStartup } from './use-startup.js';

const api = createApi();

describe('useAir', () => {
  it('waits for a place, then refreshes on a timer until unmounted', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const server = installFakeServer();
      const idle = renderHook(() => useAir(api, null));
      expect(idle.result.current.status).toBe('idle');
      const { result, unmount } = renderHook(() => useAir(api, DELHI));
      await vi.waitFor(() => {
        expect(result.current.status).toBe('ready');
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AIR_REFRESH_MS);
      });
      expect(server.requests.filter((request) => request.path === '/api/air')).toHaveLength(2);
      server.failures.set('GET /api/air', 502);
      unmount();
      await vi.advanceTimersByTimeAsync(AIR_REFRESH_MS);
      expect(server.requests.filter((request) => request.path === '/api/air')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores an answer that arrives after the place changed', () => {
    installFakeServer();
    const { result, rerender, unmount } = renderHook(({ place }) => useAir(api, place), {
      initialProps: { place: DELHI },
    });
    rerender({ place: { ...DELHI, name: 'Elsewhere' } });
    unmount();
    expect(result.current.status).toBe('loading');
  });

  it('drops an error that arrives after unmount', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/air', 502);
    const { result, unmount } = renderHook(() => useAir(api, DELHI));
    unmount();
    await Promise.resolve();
    expect(result.current.status).toBe('loading');
  });
});

describe('useChat', () => {
  it('ignores empty messages, a missing place, and sends while one is pending', async () => {
    const server = installFakeServer();
    const onReply = vi.fn();
    const noPlace = renderHook(() => useChat(api, null, onReply));
    act(() => {
      noPlace.result.current.send('walk?');
    });
    const { result } = renderHook(() => useChat(api, DELHI, onReply));
    act(() => {
      result.current.send('   ');
    });
    act(() => {
      result.current.send('walk?');
    });
    act(() => {
      result.current.send('and run?');
    });
    await vi.waitFor(() => {
      expect(onReply).toHaveBeenCalledTimes(1);
    });
    expect(server.requests.filter((request) => request.path === '/api/chat')).toHaveLength(1);
  });
});

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
