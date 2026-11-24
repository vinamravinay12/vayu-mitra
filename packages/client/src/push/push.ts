import { SERVICE_WORKER_URL, workerScript } from './worker-script.js';

/** How turning alerts on went. */
export type PushOutcome = 'enabled' | 'denied' | 'unsupported';

/** A push subscription as the server stores it (`PushSubscription.toJSON()`). */
export interface PushSubscriptionJson {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}

/** A base64url VAPID key as the bytes `pushManager.subscribe` wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** The subscription's endpoint and keys, or null if the browser gave an incomplete one. */
function toJson(subscription: PushSubscription): PushSubscriptionJson | null {
  const { endpoint, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  return endpoint === undefined || p256dh === undefined || auth === undefined
    ? null
    : { endpoint, keys: { p256dh, auth } };
}

/**
 * Subscribes this browser to Web Push with the server's VAPID key and hands
 * the subscription to `save`. Asks for notification permission first, and
 * only when the family switches alerts on.
 */
export async function enablePush(
  vapidKey: string,
  save: (subscription: PushSubscriptionJson) => Promise<unknown>,
): Promise<PushOutcome> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    return 'denied';
  }
  const registration = await navigator.serviceWorker.register(workerScript());
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(vapidKey),
  });
  const json = toJson(subscription);
  if (json === null) return 'unsupported';
  await save(json);
  return 'enabled';
}

/** Unsubscribes this browser and tells the server which endpoint went away. */
export async function disablePush(forget: (endpoint: string) => Promise<unknown>): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription === undefined || subscription === null) return;
  await subscription.unsubscribe();
  await forget(subscription.endpoint);
}
