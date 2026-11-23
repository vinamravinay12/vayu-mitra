import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createApi } from '../api/api.js';
import { installFakeServer } from '../test-utils/fake-server.js';
import { usePush } from './use-push.js';

const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/x',
  keys: { p256dh: 'p', auth: 'a' },
};

const push = vi.hoisted(() => ({
  enablePush: vi.fn(async (_key: string, save: (subscription: unknown) => Promise<unknown>) => {
    await save({
      endpoint: 'https://fcm.googleapis.com/fcm/send/x',
      keys: { p256dh: 'p', auth: 'a' },
    });
    return 'enabled';
  }),
  disablePush: vi.fn(async (forget: (endpoint: string) => Promise<unknown>) => {
    await forget('https://fcm.googleapis.com/fcm/send/x');
  }),
}));

vi.mock('../push/push.js', () => push);

const api = createApi();

describe('usePush', () => {
  it('saves the subscription on the server, and removes it', async () => {
    const server = installFakeServer();
    const onHousehold = vi.fn();
    const { result } = renderHook(() => usePush('vapid', api, onHousehold));
    expect(result.current.available).toBe(true);
    expect(await result.current.enable()).toBe('enabled');
    await result.current.disable();
    expect(onHousehold).toHaveBeenCalledTimes(2);
    expect(server.requests.map((request) => [request.method, request.body])).toEqual([
      ['POST', SUBSCRIPTION],
      ['DELETE', { endpoint: SUBSCRIPTION.endpoint }],
    ]);
  });

  it('is unavailable without a Web Push key', async () => {
    const { result } = renderHook(() => usePush(null, api, vi.fn()));
    expect(result.current.available).toBe(false);
    expect(await result.current.enable()).toBe('unsupported');
  });
});
