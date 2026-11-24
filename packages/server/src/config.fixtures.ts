export const SECRET = 'a-session-secret-of-at-least-32-chars';

export const PRODUCTION = {
  NODE_ENV: 'production',
  GEMINI_API_KEY: 'key',
  SESSION_SECRET: SECRET,
  STORE: 'firestore',
};

export const VAPID = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:a@b.test',
};
