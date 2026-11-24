import compression from 'compression';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { AirService } from './air/air-service.js';
import type { AccountStore } from './auth/accounts.js';
import { requireUser, type SchedulerVerifier, type SessionResolver } from './auth/require-user.js';
import { createSessions } from './auth/sessions.js';
import type { ServerConfig } from './config.js';
import type { LlmClient } from './llm/llm-client.js';
import { describeCause, logEvent } from './logging/log.js';
import type { Messenger } from './push/messenger.js';
import { airRouter } from './routes/air.js';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { healthRouter } from './routes/health.js';
import { internalRouter } from './routes/internal.js';
import { meRouter } from './routes/me.js';
import { AI_RATE_LIMIT, rateLimit, type RateLimitOptions } from './security/rate-limit.js';
import { admission } from './security/admission.js';
import { securityHeaders } from './security/security-headers.js';
import { serveClient } from './static/serve-client.js';
import type { UserStore } from './store/user-store.js';
import { fieldOf } from './validation/field-of.js';

/** A message, a few turns of history and the memory are a few kilobytes at most. */
const BODY_LIMIT = '32kb';

export interface AppDependencies {
  readonly config: ServerConfig;
  /** Null when there is no Gemini key: the engine answers in its own words. */
  readonly llm: LlmClient | null;
  readonly air: AirService;
  readonly store: UserStore;
  readonly messenger: Messenger;
  /** Accounts in Firestore (or memory); null only when sign-in is off. */
  readonly accounts: AccountStore | null;
  /** Null when the scheduler is not set up: the alert route does not exist. */
  readonly verifyScheduler: SchedulerVerifier | null;
  readonly now?: () => Date;
  readonly rateLimitOptions?: RateLimitOptions;
}

const KNOWN_ERRORS: Readonly<Record<string, { status: number; message: string }>> = {
  'entity.parse.failed': { status: 400, message: 'Request body must be valid JSON.' },
  'entity.too.large': { status: 413, message: 'Request is too large.' },
};

/** Errors the framework raises on purpose carry a type or a 404; anything else is a bug. */
export function describeBodyError(error: unknown): { status: number; message: string } | undefined {
  const [type, status] = [fieldOf(error, 'type'), fieldOf(error, 'status')];
  const known = typeof type === 'string' ? KNOWN_ERRORS[type] : undefined;
  if (known !== undefined) {
    return known;
  }
  return status === 404 ? { status: 404, message: 'Not found.' } : undefined;
}

/** JSON 404 for any route that does not exist. */
const notFound = (_request: Request, response: Response): void => {
  response.status(404).json({ error: 'Not found.' });
};

/** Last resort: known request errors get their status; anything else is logged and a generic 500. */
function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const known = describeBodyError(error);
  if (known === undefined) {
    logEvent('ERROR', 'unhandled error', { cause: describeCause(error) });
  }
  response.status(known?.status ?? 500).json({ error: known?.message ?? 'Something went wrong.' });
}

/** The account store and session signer, and how a token becomes its live account, when sign-in is on. */
function sessionResolver(deps: AppDependencies, now: () => Date) {
  const { sessionSecret } = deps.config;
  const { accounts } = deps;
  if (sessionSecret === null || accounts === null) {
    return { signIn: null, resolve: null };
  }
  const sessions = createSessions(sessionSecret, now);
  const resolve: SessionResolver = async (token) => {
    const claims = sessions.read(token);
    return claims === null ? null : accounts.session(claims.uid, claims.v);
  };
  return { signIn: { accounts, sessions }, resolve };
}

/** Per-client limits: model calls, sign-in attempts, and the cheap data routes. */
function rateLimits(app: Express, deps: AppDependencies): void {
  const { config, rateLimitOptions } = deps;
  app.use(
    '/api/chat',
    rateLimit(rateLimitOptions ?? { ...AI_RATE_LIMIT, max: config.aiRequestsPerMinute }),
  );
  app.use(
    ['/api/auth/login', '/api/auth/register'],
    rateLimit(rateLimitOptions ?? { ...AI_RATE_LIMIT, max: config.authRequestsPerMinute }),
  );
  app.use(
    ['/api/places', '/api/air', '/api/me'],
    rateLimit(rateLimitOptions ?? { ...AI_RATE_LIMIT, max: config.dataRequestsPerMinute }),
  );
}

/**
 * Builds the Express app. Every dependency is passed in, so tests run it with
 * fakes. Order matters: headers, compression, admission of writes, the body
 * cap, rate limits,
 * public routes, then sign-in for personal routes, static files, errors last.
 */
export function createApp(deps: AppDependencies): Express {
  const { config, llm, air, store } = deps;
  const now = deps.now ?? (() => new Date());
  const { signIn, resolve } = sessionResolver(deps, now);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(securityHeaders(config.allowedOrigin));
  app.use(compression());
  app.use('/api', admission(config.allowedOrigin));
  app.use('/api', express.json({ limit: BODY_LIMIT }));
  rateLimits(app, deps);
  app.use('/api', healthRouter(llm === null ? 'offline' : 'gemini', config));
  app.use('/api', configRouter(config));
  app.use('/api', airRouter(air));
  app.use('/api', authRouter({ mode: config.authMode, resolve, signIn }));
  if (deps.verifyScheduler !== null) {
    app.use(
      '/api',
      internalRouter({ air, store, messenger: deps.messenger, now }, deps.verifyScheduler),
    );
  }
  app.use(['/api/me', '/api/chat'], requireUser(config.authMode, resolve));
  const deleteAccount = async (uid: string): Promise<void> => {
    await deps.accounts?.delete(uid);
  };
  app.use('/api', meRouter(store, now, deleteAccount));
  app.use('/api', chatRouter({ llm, air, store, now }));
  app.use('/api', notFound);
  if (config.staticDir !== null) {
    app.use(serveClient(config.staticDir));
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
