import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/** How long a sign-in lasts on a device. */
export const SESSION_DAYS = 30;

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60_000;

/** The cookie name. `__Host-` makes browsers insist on Secure, Path=/ and no Domain. */
export const SESSION_COOKIE = '__Host-vayu_session';

/** What a session token says: whose it is, which sign-in generation, until when. */
const claimsSchema = z.object({
  uid: z.string().min(1).max(80),
  v: z.number().int().min(0),
  exp: z.number(),
});

export type SessionClaims = z.infer<typeof claimsSchema>;

/**
 * Signed session tokens: `claims.signature`, HMAC-SHA256 over the claims with
 * a secret only the server holds. They cannot be forged or edited; the account
 * store also checks the generation, so deleting an account ends its sessions.
 */
export function createSessions(secret: string, now: () => Date) {
  const sign = (payload: string): Buffer => createHmac('sha256', secret).update(payload).digest();
  return {
    issue(uid: string, version: number): string {
      const payload = Buffer.from(
        JSON.stringify({ uid, v: version, exp: now().getTime() + SESSION_MS }),
      ).toString('base64url');
      return `${payload}.${sign(payload).toString('base64url')}`;
    },
    read(token: string): SessionClaims | null {
      const [payload, signature] = token.split('.');
      if (payload === undefined || signature === undefined) return null;
      const given = Buffer.from(signature, 'base64url');
      const expected = sign(payload);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
      let decoded: unknown;
      try {
        decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      } catch {
        return null;
      }
      const claims = claimsSchema.safeParse(decoded);
      return claims.success && claims.data.exp > now().getTime() ? claims.data : null;
    },
  };
}

export type Sessions = ReturnType<typeof createSessions>;

/** The session cookie's value in a Cookie header, or null. */
export function sessionCookie(header: string | undefined): string | null {
  for (const part of (header ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) {
      const token = value.join('=');
      return token.length > 0 && token.length <= 1024 ? token : null;
    }
  }
  return null;
}

/** The Set-Cookie value that stores a session: HttpOnly so page scripts can never read it. */
export const setSessionCookie = (token: string): string =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${String(SESSION_MS / 1000)}`;

/** The Set-Cookie value that removes the session. */
export const clearSessionCookie = (): string =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
