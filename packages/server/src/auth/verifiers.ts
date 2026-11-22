/** Checks a Firebase ID token and returns the user it belongs to; rejects if invalid. */
export type IdTokenVerifier = (idToken: string) => Promise<{ readonly uid: string }>;

/** True only for a Google-signed token issued to the alert scheduler's identity. */
export type SchedulerVerifier = (idToken: string) => Promise<boolean>;

/** The user every request belongs to when sign-in is off (development only). */
export const LOCAL_USER = 'local-household';
