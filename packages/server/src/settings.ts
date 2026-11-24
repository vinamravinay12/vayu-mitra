/** Push and scheduler settings, read from the environment. */

/** Web Push (VAPID) keys. The public key is shared with browsers; the private key is a secret. */
export interface PushSettings {
  readonly publicKey: string;
  readonly privateKey: string;
  /** Contact the push services can reach: `mailto:` or an https URL. */
  readonly subject: string;
}

/** Cloud Scheduler calls the alert check with a Google-signed OIDC token for this identity. */
export interface SchedulerSettings {
  readonly audience: string;
  readonly serviceAccountEmail: string;
}

type Env = Readonly<Record<string, string | undefined>>;

/** Shortest session-signing secret accepted: 32 characters, e.g. `openssl rand -base64 48`. */
const MIN_SESSION_SECRET_LENGTH = 32;

/** The trimmed value, or undefined when it is missing or blank. */
export const present = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
};

/** The key that signs session cookies, or null for no sign-in (development only). */
export function loadSessionSecret(env: Env): string | null {
  const secret = present(env.SESSION_SECRET);
  if (secret !== undefined && secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${String(MIN_SESSION_SECRET_LENGTH)} characters`,
    );
  }
  return secret ?? null;
}

/** VAPID keys, or null when alerts are not set up. All three or none. */
export function loadPush(env: Env): PushSettings | null {
  const publicKey = present(env.VAPID_PUBLIC_KEY);
  const privateKey = present(env.VAPID_PRIVATE_KEY);
  const subject = present(env.VAPID_SUBJECT);
  if (publicKey === undefined && privateKey === undefined && subject === undefined) {
    return null;
  }
  if (publicKey === undefined || privateKey === undefined || subject === undefined) {
    throw new Error('Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT together, or none');
  }
  return { publicKey, privateKey, subject };
}

/** The scheduler identity, or null when the alert job is not set up. Both values or neither. */
export function loadScheduler(env: Env): SchedulerSettings | null {
  const audience = present(env.SCHEDULER_AUDIENCE);
  const serviceAccountEmail = present(env.SCHEDULER_SERVICE_ACCOUNT);
  if (audience === undefined && serviceAccountEmail === undefined) {
    return null;
  }
  if (audience === undefined || serviceAccountEmail === undefined) {
    throw new Error('Set both SCHEDULER_AUDIENCE and SCHEDULER_SERVICE_ACCOUNT, or neither');
  }
  return { audience, serviceAccountEmail };
}
