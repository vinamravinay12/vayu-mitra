import { z } from 'zod';

/** Accepted lengths, in characters, for free text from the browser. */
export const TEXT_LIMITS = { placeQueryMin: 2, placeQueryMax: 80 } as const;

export const placesQuerySchema = z.object({
  q: z.string().trim().min(TEXT_LIMITS.placeQueryMin).max(TEXT_LIMITS.placeQueryMax),
});

/** Query-string coordinates arrive as text. */
export const airQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/**
 * The push services browsers use: Chrome and Edge (FCM), Firefox, Safari,
 * Windows. The server sends to a subscription's endpoint, so only these are
 * accepted; anything else could point the server at an internal address.
 */
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  '.push.apple.com',
  '.notify.windows.com',
] as const;

/** True for an https URL on a known push service. */
function isPushServiceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      PUSH_SERVICE_HOSTS.some((host) =>
        host.startsWith('.') ? url.hostname.endsWith(host) : url.hostname === host,
      )
    );
  } catch {
    return false;
  }
}

/** A browser's push subscription, as `PushSubscription.toJSON()` gives it. */
export const pushSubscriptionSchema = z.strictObject({
  endpoint: z.string().max(1024).refine(isPushServiceUrl, 'Not a known push service'),
  keys: z.strictObject({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(64),
  }),
});

/** Removing a subscription needs only its endpoint. */
export const pushEndpointSchema = z.strictObject({ endpoint: z.string().max(1024) });

/** Email and password, for both signing up and signing in. */
export const credentialsSchema = z.strictObject({
  // Trimmed first: phone keyboards often add a trailing space.
  email: z.string().trim().max(254).pipe(z.email()),
  password: z.string().min(10).max(128),
});

export type PushSubscriptionJson = z.infer<typeof pushSubscriptionSchema>;
