import type { FirebaseApp } from 'firebase/app';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createApi } from '../api/api.js';
import { installFakeServer } from '../test-utils/fake-server.js';
import { usePush } from './use-push.js';

const push = vi.hoisted(() => ({
  enablePush: vi.fn(
    (
      _app: unknown,
      _key: string,
      callbacks: { onRegistered: (id: string) => void; onUnregistered: (id: string) => void },
    ) => {
      callbacks.onRegistered('fid-1');
      callbacks.onUnregistered('fid-0');
      return Promise.resolve('enabled');
    },
  ),
  disablePush: vi.fn(() => Promise.resolve()),
}));

vi.mock('../push/push.js', () => push);

const api = createApi(() => Promise.resolve(null));
const app = {} as FirebaseApp;

describe('usePush', () => {
  it('reports installation ids to the server as they come and go', async () => {
    const server = installFakeServer();
    const onHousehold = vi.fn();
    const { result } = renderHook(() => usePush(app, 'vapid', api, onHousehold));
    expect(result.current.available).toBe(true);
    expect(await result.current.enable()).toBe('enabled');
    await vi.waitFor(() => {
      expect(onHousehold).toHaveBeenCalledTimes(2);
    });
    expect(
      server.requests.map((request) => `${request.method} ${JSON.stringify(request.body)}`),
    ).toEqual(['POST {"id":"fid-1"}', 'DELETE {"id":"fid-0"}']);
    await result.current.disable();
    expect(push.disablePush).toHaveBeenCalledWith(app);
  });

  it('is unavailable without Firebase or a Web Push key', async () => {
    const { result } = renderHook(() => usePush(null, null, api, vi.fn()));
    expect(result.current.available).toBe(false);
    expect(await result.current.enable()).toBe('unsupported');
    await result.current.disable();
    const keyless = renderHook(() => usePush(app, null, api, vi.fn())).result;
    expect(await keyless.current.enable()).toBe('unsupported');
    expect(push.disablePush).not.toHaveBeenCalled();
  });
});
