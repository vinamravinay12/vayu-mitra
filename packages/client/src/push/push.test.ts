/** Tests of keyBytes, enablePush and disablePush. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { disablePush, enablePush, keyBytes } from './push.js';
import { SERVICE_WORKER_URL } from './worker-script.js';

const JSON_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/x',
  keys: { p256dh: 'p', auth: 'a' },
};

/** A browser with service workers, Push and the given permission answer. */
function browser(
  permission: NotificationPermission,
  subscriptionJson: unknown = JSON_SUBSCRIPTION,
) {
  const unsubscribe = vi.fn(() => Promise.resolve(true));
  const subscription = {
    endpoint: JSON_SUBSCRIPTION.endpoint,
    toJSON: () => subscriptionJson,
    unsubscribe,
  };
  const pushManager = {
    subscribe: vi.fn(() => Promise.resolve(subscription)),
    getSubscription: vi.fn(() => Promise.resolve(subscription)),
  };
  const register = vi.fn(() => Promise.resolve({ pushManager }));
  const getRegistration = vi.fn(() => Promise.resolve({ pushManager }));
  vi.stubGlobal('Notification', { requestPermission: () => Promise.resolve(permission) });
  vi.stubGlobal('PushManager', Object);
  vi.stubGlobal('navigator', { serviceWorker: { register, getRegistration } });
  return { register, pushManager, unsubscribe, getRegistration };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('keyBytes', () => {
  it('decodes base64url without padding', () => {
    expect([...keyBytes('AQID')]).toEqual([1, 2, 3]);
    expect([...keyBytes('-_8')]).toEqual([251, 255]);
  });
});

describe('enablePush', () => {
  it('asks permission, registers the worker, subscribes with the VAPID key and saves it', async () => {
    const { register, pushManager } = browser('granted');
    const save = vi.fn(() => Promise.resolve());
    expect(await enablePush('AQID', save)).toBe('enabled');
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL);
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: keyBytes('AQID'),
    });
    expect(save).toHaveBeenCalledWith(JSON_SUBSCRIPTION);
  });

  it('reports a refusal, a browser without push, or an incomplete subscription', async () => {
    const save = vi.fn(() => Promise.resolve());
    browser('denied');
    expect(await enablePush('AQID', save)).toBe('denied');
    browser('granted', { endpoint: 'https://fcm.googleapis.com/x', keys: {} });
    expect(await enablePush('AQID', save)).toBe('unsupported');
    browser('granted', {});
    expect(await enablePush('AQID', save)).toBe('unsupported');
    vi.stubGlobal('navigator', {});
    expect(await enablePush('AQID', save)).toBe('unsupported');
    expect(save).not.toHaveBeenCalled();
  });
});

describe('disablePush', () => {
  it('unsubscribes and tells the server, or does nothing without a subscription', async () => {
    const { unsubscribe, pushManager, getRegistration } = browser('granted');
    const forget = vi.fn(() => Promise.resolve());
    await disablePush(forget);
    expect(unsubscribe).toHaveBeenCalled();
    expect(forget).toHaveBeenCalledWith(JSON_SUBSCRIPTION.endpoint);
    pushManager.getSubscription.mockResolvedValueOnce(null as never);
    await disablePush(forget);
    getRegistration.mockResolvedValueOnce(undefined as never);
    await disablePush(forget);
    expect(forget).toHaveBeenCalledTimes(1);
  });
});
