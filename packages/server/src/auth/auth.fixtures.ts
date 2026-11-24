import { createHmac } from 'node:crypto';

export const SECRET = 'a-session-secret-of-at-least-32-chars';

/** A token signed with the real secret around an arbitrary payload. */
export const signed = (payload: string): string =>
  `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`;
