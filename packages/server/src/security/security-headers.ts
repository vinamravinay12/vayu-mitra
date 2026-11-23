import type { NextFunction, Request, Response } from 'express';

/** The API returns JSON only, so its policy forbids everything. */
export const API_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

/** Hosts the Firebase Auth and Messaging web SDKs talk to. */
const FIREBASE_CONNECT = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://fcmregistrations.googleapis.com',
];

/**
 * The web client's policy: same-origin scripts, styles and API calls, no
 * inline script, no framing. With Firebase on, exactly the hosts Google
 * sign-in and push registration need are added: the sign-in popup's helper
 * script and iframe on the project's auth domain, and the token endpoints.
 */
export function appCsp(authDomain: string | null): string {
  const firebase = authDomain !== null;
  const authOrigin = `https://${authDomain ?? ''}`;
  return [
    "default-src 'self'",
    firebase ? "script-src 'self' https://apis.google.com" : "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    firebase ? `connect-src 'self' ${FIREBASE_CONNECT.join(' ')}` : "connect-src 'self'",
    firebase ? `frame-src ${authOrigin}` : "frame-src 'none'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

const COMMON_HEADERS: readonly (readonly [string, string])[] = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'no-referrer'],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
  ['Origin-Agent-Cluster', '?1'],
  ['X-Permitted-Cross-Domain-Policies', 'none'],
  // Location is the family's own choice, asked for only when they tap "Use my location".
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()'],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains'],
];

/**
 * Security headers for every response.
 *
 * Cross-origin access is off unless an origin is configured: the client is
 * served from the same origin as the API, so no browser needs CORS at all.
 */
export function securityHeaders(allowedOrigin: string, authDomain: string | null) {
  const app = appCsp(authDomain);
  // The Google sign-in popup reports back to its opener; same-origin would cut it off.
  const opener = authDomain === null ? 'same-origin' : 'same-origin-allow-popups';
  return (request: Request, response: Response, next: NextFunction): void => {
    for (const [name, value] of COMMON_HEADERS) {
      response.setHeader(name, value);
    }
    response.setHeader('Cross-Origin-Opener-Policy', opener);
    const isApi = request.path.startsWith('/api');
    response.setHeader('Content-Security-Policy', isApi ? API_CSP : app);
    if (isApi && allowedOrigin !== 'same-origin') {
      response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      response.setHeader('Vary', 'Origin');
    }
    if (isApi && request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  };
}
