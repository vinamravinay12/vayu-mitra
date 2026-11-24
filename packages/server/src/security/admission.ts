/** Admitting writes only from our own page, and only as JSON. */
import type { NextFunction, Request, Response } from 'express';

/** Methods that change nothing; every other method is a write and is admitted only by the rules below. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/** `Sec-Fetch-Site` values a browser sends for our own pages, or for a typed URL. */
const OWN_SITES: ReadonlySet<string> = new Set(['same-origin', 'none']);

/** Why a write was refused: the status and a message written for people. */
interface Refusal {
  readonly status: 403 | 415;
  readonly error: string;
}

const CROSS_SITE: Refusal = { status: 403, error: 'Requests from other sites are not accepted.' };
const NOT_JSON: Refusal = { status: 415, error: 'Send the request as JSON.' };

/** True when the request carries a body, judged from its headers before reading it. */
const hasBody = (request: Request): boolean =>
  request.get('transfer-encoding') !== undefined || (request.get('content-length') ?? '0') !== '0';

/** The origin this server is reached at, as a browser would write it. */
const ownOrigin = (request: Request): string =>
  `${request.protocol}://${request.get('host') ?? ''}`;

/**
 * The first rule a write breaks, cheapest first, or null to admit it:
 * - `Sec-Fetch-Site`, which page script cannot forge, must say our own site;
 * - `Origin`, when sent, must be our own origin or the one allowed origin;
 * - a body must be JSON, which a cross-site form cannot send without a CORS
 *   preflight that this server never grants.
 * A request with neither header comes from a non-browser client, which holds
 * no one's session cookie, so it is admitted on the JSON rule alone.
 */
export function refusalFor(request: Request, allowedOrigin: string): Refusal | null {
  const site = request.get('sec-fetch-site');
  if (site !== undefined && !OWN_SITES.has(site)) return CROSS_SITE;
  const origin = request.get('origin');
  if (origin !== undefined && origin !== ownOrigin(request) && origin !== allowedOrigin) {
    return CROSS_SITE;
  }
  return hasBody(request) && request.is('application/json') === false ? NOT_JSON : null;
}

/**
 * Admission for every write to the API: the defence against cross-site
 * request forgery that does not depend on the session cookie's SameSite
 * attribute alone. Runs before the body is parsed, so a refused request is
 * never read.
 */
export function admission(allowedOrigin: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const refusal = SAFE_METHODS.has(request.method) ? null : refusalFor(request, allowedOrigin);
    if (refusal === null) {
      next();
      return;
    }
    response.status(refusal.status).json({ error: refusal.error });
  };
}
