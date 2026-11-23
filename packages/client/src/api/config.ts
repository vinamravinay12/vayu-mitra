import { ApiError, requestJson } from './http.js';

/** The project's public Firebase web config. */
export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly messagingSenderId: string;
}

/** What the browser needs to start. */
export interface ClientConfig {
  readonly auth: 'firebase' | 'none';
  readonly firebase: FirebaseWebConfig | null;
  readonly vapidKey: string | null;
}

const WEB_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId', 'messagingSenderId'] as const;

/** True for a plain object. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The Firebase web config, if the value is one. */
function readFirebase(value: unknown): FirebaseWebConfig | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !WEB_KEYS.every((key) => typeof value[key] === 'string'))
    return undefined;
  return value as unknown as FirebaseWebConfig;
}

/**
 * Checked by hand rather than with a schema library: this runs before the
 * first screen, and keeping Zod out of it halves the JavaScript that paint waits for.
 */
export function readConfig(value: unknown): ClientConfig {
  const firebase = isRecord(value) ? readFirebase(value.firebase) : undefined;
  const auth = isRecord(value) ? value.auth : undefined;
  const vapidKey = isRecord(value) ? value.vapidKey : undefined;
  if (
    (auth !== 'firebase' && auth !== 'none') ||
    firebase === undefined ||
    (typeof vapidKey !== 'string' && vapidKey !== null)
  ) {
    throw new ApiError('The app settings came back incomplete. Please try again.');
  }
  return { auth, firebase, vapidKey };
}

/** Reads the start-up config; it needs no sign-in. */
export async function fetchConfig(): Promise<ClientConfig> {
  return readConfig(await requestJson('/api/config', () => Promise.resolve(null)));
}
