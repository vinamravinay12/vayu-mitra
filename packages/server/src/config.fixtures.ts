/** Config-test data: production settings and Web Push keys. */

/** A session-signing key long enough to be accepted. */
export const SECRET = 'a-session-secret-of-at-least-32-chars';

/** Everything production requires, set. */
export const PRODUCTION = {
  NODE_ENV: 'production',
  GEMINI_API_KEY: 'key',
  SESSION_SECRET: SECRET,
  STORE: 'firestore',
};

/** A complete set of Web Push keys. */
export const VAPID = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:a@b.test',
};
