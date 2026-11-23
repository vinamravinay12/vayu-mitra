import type { FirebaseApp } from 'firebase/app';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { disablePush, enablePush, SERVICE_WORKER_URL } from './push.js';

const messaging = vi.hoisted(() => ({
  isSupported: vi.fn(() => Promise.resolve(true)),
  getMessaging: vi.fn(() => ({ messaging: true })),
  onRegistered: vi.fn(),
  onUnregistered: vi.fn(),
  register: vi.fn(() => Promise.resolve()),
  unregister: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/messaging', () => messaging);

const app = {} as FirebaseApp;
const callbacks = { onRegistered: vi.fn(), onUnregistered: vi.fn() };
const registration = { scope: '/' };
const registerWorker = vi.fn(() => Promise.resolve(registration));

/** Stubs notification permission and the service worker container. */
function browser(permission: NotificationPermission, withWorker = true): void {
  vi.stubGlobal('Notification', { requestPermission: () => Promise.resolve(permission) });
  if (withWorker) {
    vi.stubGlobal('navigator', { serviceWorker: { register: registerWorker } });
  } else {
    vi.stubGlobal('navigator', {});
  }
}

describe('enablePush', () => {
  beforeEach(() => {
    messaging.isSupported.mockResolvedValue(true);
  });

  it('asks permission, registers the worker and the FID callbacks', async () => {
    browser('granted');
    expect(await enablePush(app, 'vapid', callbacks)).toBe('enabled');
    expect(registerWorker).toHaveBeenCalledWith(SERVICE_WORKER_URL);
    expect(messaging.onRegistered).toHaveBeenCalledWith(
      { messaging: true },
      callbacks.onRegistered,
    );
    expect(messaging.register).toHaveBeenCalledWith(
      { messaging: true },
      { vapidKey: 'vapid', serviceWorkerRegistration: registration },
    );
  });

  it('reports a refusal or an unsupported browser', async () => {
    browser('denied');
    expect(await enablePush(app, 'vapid', callbacks)).toBe('denied');
    browser('granted', false);
    expect(await enablePush(app, 'vapid', callbacks)).toBe('unsupported');
    messaging.isSupported.mockResolvedValue(false);
    browser('granted');
    expect(await enablePush(app, 'vapid', callbacks)).toBe('unsupported');
  });
});

describe('disablePush', () => {
  it('unregisters this installation', async () => {
    await disablePush(app);
    expect(messaging.unregister).toHaveBeenCalledWith({ messaging: true });
  });
});
