/**
 * Firebase settings. The web config (API key, app id and so on) identifies the
 * project to browsers and is public by design; it is served to the client at
 * runtime from these variables rather than committed. Access is enforced by
 * the server verifying each ID token, not by keeping these values secret.
 */
export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly messagingSenderId: string;
}

export interface FirebaseSettings {
  readonly projectId: string;
  readonly web: FirebaseWebConfig;
  /** Web Push key pair's public key; without it, background alerts are off. */
  readonly vapidKey: string | null;
}

/** Cloud Scheduler calls the alert check with a Google-signed OIDC token for this identity. */
export interface SchedulerSettings {
  readonly audience: string;
  readonly serviceAccountEmail: string;
}

type Env = Readonly<Record<string, string | undefined>>;

/** The trimmed value, or undefined when it is missing or blank. */
export const present = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
};

const REQUIRED_WEB_KEYS = [
  'FIREBASE_WEB_API_KEY',
  'FIREBASE_APP_ID',
  'FIREBASE_MESSAGING_SENDER_ID',
] as const;

/** Every key's value, or an error naming the missing ones. */
function requireAll<K extends string>(env: Env, keys: readonly K[]): Record<K, string> {
  const missing = keys.filter((key) => present(env[key]) === undefined);
  if (missing.length > 0) {
    throw new Error(`FIREBASE_PROJECT_ID is set but ${missing.join(', ')} is missing`);
  }
  return Object.fromEntries(keys.map((key) => [key, String(present(env[key]))])) as Record<
    K,
    string
  >;
}

/**
 * Firebase is on when FIREBASE_PROJECT_ID is set. A half-configured project is
 * an error at startup, not a sign-in button that fails in the family's hands.
 */
export function loadFirebase(env: Env): FirebaseSettings | null {
  const projectId = present(env.FIREBASE_PROJECT_ID);
  if (projectId === undefined) {
    return null;
  }
  const web = requireAll(env, REQUIRED_WEB_KEYS);
  return {
    projectId,
    web: {
      apiKey: web.FIREBASE_WEB_API_KEY,
      authDomain: present(env.FIREBASE_AUTH_DOMAIN) ?? `${projectId}.firebaseapp.com`,
      projectId,
      appId: web.FIREBASE_APP_ID,
      messagingSenderId: web.FIREBASE_MESSAGING_SENDER_ID,
    },
    vapidKey: present(env.FIREBASE_VAPID_KEY) ?? null,
  };
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
