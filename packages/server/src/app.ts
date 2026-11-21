import compression from 'compression';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { AirService } from './air/air-service.js';
import { createTtlCache } from './cache/ttl-cache.js';
import type { CoachSummary } from './coach/engine-summary.js';
import type { ServerConfig } from './config.js';
import type { ExtractedProfile } from './extract/extract-profile.js';
import { describeCause, logEvent } from './logging/log.js';
import type { LlmClient } from './llm/llm-client.js';
import { airRouter } from './routes/air.js';
import { coachRouter } from './routes/coach.js';
import { extractRouter } from './routes/extract.js';
import { healthRouter } from './routes/health.js';
import {
  AI_RATE_LIMIT,
  DATA_RATE_LIMIT,
  rateLimit,
  type RateLimitOptions,
} from './security/rate-limit.js';
import { securityHeaders } from './security/security-headers.js';
import { serveClient } from './static/serve-client.js';

/** A profile and a question are a few kilobytes at most. */
const BODY_LIMIT = '16kb';

const CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 15 * 60_000;

export interface AppDependencies {
  readonly llm: LlmClient;
  readonly air: AirService;
  readonly config: ServerConfig;
  readonly mode: 'gemini' | 'offline';
  readonly now?: () => Date;
  /** Limits for the AI routes; the data routes use a looser limit of their own. */
  readonly rateLimitOptions?: RateLimitOptions;
}

const KNOWN_ERRORS: Readonly<Record<string, { status: number; message: string }>> = {
  'entity.parse.failed': { status: 400, message: 'Request body must be valid JSON.' },
  'entity.too.large': { status: 413, message: 'Request is too large.' },
};

/**
 * Errors the framework raises on purpose — a body that will not parse, a
 * missing static file — carry a type or a 4xx status. Anything else is a bug.
 */
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

/** JSON 404 for any route that does not exist. */
const notFound = (_request: Request, response: Response): void => {
  response.status(404).json({ error: 'Not found.' });
};

/** Last-resort handler: known request errors get their status; anything else is logged and answered with a generic 500. */
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
  // Never surface an internal message: it can leak configuration detail.
  response.status(known?.status ?? 500).json({ error: known?.message ?? 'Something went wrong.' });
}

/**
 * Builds the Express app. Every dependency is passed in, so tests run it with
 * a fake model and fixture air. Middleware order matters: headers, then
 * compression and the body cap, then rate limits, routes, static files and
 * the sanitised error handler last.
 */
export function createApp({
  llm,
  air,
  config,
  mode,
  now = () => new Date(),
  rateLimitOptions,
}: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(securityHeaders(config.allowedOrigin));
  app.use(compression());
  app.use('/api', express.json({ limit: BODY_LIMIT }));
  const aiLimiter = rateLimit(
    rateLimitOptions ?? { ...AI_RATE_LIMIT, max: config.aiRequestsPerMinute },
  );
  const dataLimiter = rateLimit(rateLimitOptions ?? DATA_RATE_LIMIT);
  for (const path of ['/api/extract', '/api/coach', '/api/ask']) {
    app.use(path, aiLimiter);
  }
  app.use(['/api/places', '/api/air'], dataLimiter);
  app.use('/api', healthRouter(mode, config.airDataMode));
  app.use(
    '/api',
    extractRouter({ llm, cache: createTtlCache<ExtractedProfile>(CACHE_ENTRIES, CACHE_TTL_MS) }),
  );
  app.use('/api', airRouter(air));
  app.use(
    '/api',
    coachRouter(
      { llm, air, cache: createTtlCache<CoachSummary>(CACHE_ENTRIES, CACHE_TTL_MS) },
      now,
    ),
  );
  app.use('/api', notFound);
  if (config.staticDir !== null) {
    app.use(serveClient(config.staticDir));
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
