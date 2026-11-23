import type { NextFunction, Request, Response } from 'express';
import type { AuthMode } from '../config.js';
import type { AccountSession } from './accounts.js';
import { sessionCookie } from './sessions.js';

/** True only for a Google-signed token issued to the alert scheduler's identity. */
export type SchedulerVerifier = (idToken: string) => Promise<boolean>;

/** Finds the live account a session token belongs to, or null. */
export type SessionResolver = (token: string) => Promise<AccountSession | null>;

/** The user every request belongs to when sign-in is off (development only). */
export const LOCAL_USER = 'local-household';

/** Longest bearer token accepted; Google OIDC tokens are about 1 KB. */
const MAX_TOKEN_LENGTH = 4096;

/** The bearer token in an Authorization header, or null. */
export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header ?? '');
  const token = match?.[1];
  return token === undefined || token.length > MAX_TOKEN_LENGTH ? null : token;
}

/** The signed-in user a request was verified for. Only valid after `requireUser`. */
export const userOf = (response: Response): string => String(response.locals.uid);

/** The signed-in account behind a request's session cookie, or null. */
export async function currentAccount(
  request: Request,
  resolve: SessionResolver | null,
): Promise<AccountSession | null> {
  const token = sessionCookie(request.get('cookie'));
  return token === null || resolve === null ? null : resolve(token);
}

/**
 * Personal routes need a signed-in account. The user id comes only from the
 * verified session cookie, never from the request body, so one family can
 * never read or change another's data. With sign-in off (development) every
 * request is the one local household.
 */
export function requireUser(mode: AuthMode, resolve: SessionResolver | null) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (mode === 'none') {
      response.locals.uid = LOCAL_USER;
      next();
      return;
    }
    const account = await currentAccount(request, resolve);
    if (account === null) {
      response.status(401).json({ error: 'Please sign in to continue.' });
      return;
    }
    response.locals.uid = account.uid;
    next();
  };
}
