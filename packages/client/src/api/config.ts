import { ApiError, requestJson } from './http.js';

/** What the browser needs to start. */
export interface ClientConfig {
  /** `password`: email-and-password accounts. `none`: development, one local household. */
  readonly auth: 'password' | 'none';
  /** The Web Push public key; null when alerts are not set up. */
  readonly vapidKey: string | null;
}

/** Who is signed in. */
export interface Session {
  readonly signedIn: boolean;
  /** Null with sign-in off. */
  readonly email: string | null;
}

/** True for a plain object. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The answer, or an ApiError naming what came back incomplete. */
function check<T>(valid: boolean, value: T, what: string): T {
  if (!valid) throw new ApiError(`The ${what} came back incomplete. Please try again.`);
  return value;
}

/**
 * Checked by hand rather than with a schema library: these run before the
 * first screen, and keeping Zod out of them halves the JavaScript that paint waits for.
 */
export function readConfig(value: unknown): ClientConfig {
  const config = isRecord(value) ? value : {};
  const { auth, vapidKey } = config;
  const valid =
    (auth === 'password' || auth === 'none') && (typeof vapidKey === 'string' || vapidKey === null);
  return check(valid, { auth, vapidKey } as ClientConfig, 'app settings');
}

/** A session answer, checked by hand for the same reason. */
export function readSession(value: unknown): Session {
  const session = isRecord(value) ? value : {};
  const { signedIn, email } = session;
  const valid = typeof signedIn === 'boolean' && (typeof email === 'string' || email === null);
  return check(valid, { signedIn, email } as Session, 'sign-in status');
}

/** Reads the start-up config. */
export async function fetchConfig(): Promise<ClientConfig> {
  return readConfig(await requestJson('/api/config'));
}

/** Who is signed in on this browser, from the session cookie. */
export async function fetchSession(): Promise<Session> {
  return readSession(await requestJson('/api/auth/session'));
}

/** Signs in, or creates an account and signs in; the server sets the cookie. */
export async function signIn(
  mode: 'login' | 'register',
  email: string,
  password: string,
): Promise<{ readonly email: string }> {
  const answer = await requestJson(`/api/auth/${mode}`, {
    method: 'POST',
    body: { email, password },
  });
  const signedInEmail = isRecord(answer) ? answer.email : undefined;
  return check(typeof signedInEmail === 'string', { email: String(signedInEmail) }, 'sign-in');
}

/** Signs out on this browser. */
export async function signOut(): Promise<void> {
  await requestJson('/api/auth/logout', { method: 'POST' });
}
