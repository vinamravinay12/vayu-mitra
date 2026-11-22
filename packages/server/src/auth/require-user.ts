import type { NextFunction, Request, Response } from 'express';
import type { AuthMode } from '../config.js';
import { LOCAL_USER, type IdTokenVerifier } from './verifiers.js';

/** Longest bearer token accepted; Firebase ID tokens are about 1 KB. */
const MAX_TOKEN_LENGTH = 4096;

/** The bearer token in an Authorization header, or null. */
export function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header ?? '');
  const token = match?.[1];
  return token === undefined || token.length > MAX_TOKEN_LENGTH ? null : token;
}

/** The signed-in user a request was verified for. Only valid after `requireUser`. */
export const userOf = (response: Response): string => String(response.locals.uid);

/**
 * Personal routes need a verified Firebase ID token. The user id comes only
 * from the verified token, never from the request body, so one family can
 * never read or change another's data. With sign-in off (development) every
 * request is the one local household.
 */
export function requireUser(mode: AuthMode, verify: IdTokenVerifier | null) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (mode === 'none' || verify === null) {
      response.locals.uid = LOCAL_USER;
      next();
      return;
    }
    const token = bearerToken(request.get('authorization'));
    try {
      if (token === null) throw new Error('missing token');
      response.locals.uid = (await verify(token)).uid;
    } catch {
      response.status(401).json({ error: 'Please sign in again to continue.' });
      return;
    }
    next();
  };
}
