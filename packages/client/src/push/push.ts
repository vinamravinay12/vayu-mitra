import type { FirebaseApp } from 'firebase/app';

/** How turning alerts on went. */
export type PushOutcome = 'enabled' | 'denied' | 'unsupported';

/** Where the browser reports this device's push id to, and its removal. */
export interface PushCallbacks {
  readonly onRegistered: (id: string) => void;
  readonly onUnregistered: (id: string) => void;
}

/** The app's own service worker, which shows alerts while the tab is closed. */
export const SERVICE_WORKER_URL = '/push-sw.js';

/**
 * Registers this browser for alerts with Firebase Cloud Messaging, by its
 * Firebase Installation ID. Asks for notification permission first, and only
 * when the family switches alerts on.
 */
export async function enablePush(
  app: FirebaseApp,
  vapidKey: string,
  callbacks: PushCallbacks,
): Promise<PushOutcome> {
  const messaging = await import('firebase/messaging');
  if (!(await messaging.isSupported()) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    return 'denied';
  }
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  const instance = messaging.getMessaging(app);
  messaging.onRegistered(instance, callbacks.onRegistered);
  messaging.onUnregistered(instance, callbacks.onUnregistered);
  await messaging.register(instance, { vapidKey, serviceWorkerRegistration: registration });
  return 'enabled';
}

/** Stops alerts on this browser; the unregister callback tells the server. */
export async function disablePush(app: FirebaseApp): Promise<void> {
  const messaging = await import('firebase/messaging');
  await messaging.unregister(messaging.getMessaging(app));
}
