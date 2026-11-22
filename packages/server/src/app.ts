import compression from 'compression';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { AirService } from './air/air-service.js';
import { requireUser } from './auth/require-user.js';
import type { IdTokenVerifier, SchedulerVerifier } from './auth/verifiers.js';
import type { ServerConfig } from './config.js';
import type { LlmClient } from './llm/llm-client.js';
import { describeCause, logEvent } from './logging/log.js';
import type { Messenger } from './push/messenger.js';
import { airRouter } from './routes/air.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { healthRouter } from './routes/health.js';
import { internalRouter } from './routes/internal.js';
import { meRouter } from './routes/me.js';
import {
  AI_RATE_LIMIT,
  DATA_RATE_LIMIT,
  rateLimit,
  type RateLimitOptions,
} from './security/rate-limit.js';
import { securityHeaders } from './security/security-headers.js';
import { serveClient } from './static/serve-client.js';
import type { UserStore } from './store/user-store.js';

/** A message, a few turns of history and the memory are a few kilobytes at most. */
const BODY_LIMIT = '32kb';

export interface AppDependencies {
  readonly config: ServerConfig;
  /** Null when there is no Gemini key: the engine answers in its own words. */
  readonly llm: LlmClient | null;
  readonly air: AirService;
  readonly store: UserStore;
  readonly messenger: Messenger;
  /** Null when sign-in is off. */
  readonly verifyIdToken: IdTokenVerifier | null;
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
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { type, status } = error as { type?: unknown; status?: unknown };
  const known = typeof type === 'string' ? KNOWN_ERRORS[type] : undefined;
  if (known !== undefined) {
    return known;
  }
  return status === 404 ? { status: 404, message: 'Not found.' } : undefined;
}

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

/**
 * Builds the Express app. Every dependency is passed in, so tests run it with
 * fakes. Order matters: headers, compression and the body cap, rate limits,
 * public routes, then sign-in for personal routes, static files, errors last.
 */
export function createApp(deps: AppDependencies): Express {
  const { config, llm, air, store } = deps;
  const now = deps.now ?? (() => new Date());
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(securityHeaders(config.allowedOrigin, config.firebase?.web.authDomain ?? null));
  app.use(compression());
  app.use('/api', express.json({ limit: BODY_LIMIT }));
  app.use(
    '/api/chat',
    rateLimit(deps.rateLimitOptions ?? { ...AI_RATE_LIMIT, max: config.aiRequestsPerMinute }),
  );
  app.use(
    ['/api/places', '/api/air', '/api/me'],
    rateLimit(deps.rateLimitOptions ?? DATA_RATE_LIMIT),
  );
  app.use('/api', healthRouter(llm === null ? 'offline' : 'gemini', config));
  app.use('/api', configRouter(config));
  app.use('/api', airRouter(air));
  if (deps.verifyScheduler !== null) {
    app.use(
      '/api',
      internalRouter({ air, store, messenger: deps.messenger, now }, deps.verifyScheduler),
    );
  }
  const signedIn = requireUser(config.authMode, deps.verifyIdToken);
  app.use(['/api/me', '/api/chat'], signedIn);
  app.use('/api', meRouter(store, now));
  app.use('/api', chatRouter({ llm, air, store, now }));
  app.use('/api', notFound);
  if (config.staticDir !== null) {
    app.use(serveClient(config.staticDir));
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
