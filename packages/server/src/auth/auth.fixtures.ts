/** Auth-test data: a session-signing key. */
import { createHmac } from 'node:crypto';

/** A session-signing key long enough to be accepted. */
export const SECRET = 'a-session-secret-of-at-least-32-chars';

/** A token signed with the real secret around an arbitrary payload. */
export const signed = (payload: string): string =>
  `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`;
