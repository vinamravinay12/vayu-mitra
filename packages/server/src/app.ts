/** The Express app: middleware in order, then the routes, static files and errors. */
import compression from 'compression';
import express, { type Express } from 'express';
import type { AirService } from './air/air-service.js';
import type { AccountStore } from './auth/accounts.js';
import { requireUser, type SchedulerVerifier, type SessionResolver } from './auth/require-user.js';
import { createSessions } from './auth/sessions.js';
import type { ServerConfig } from './config.js';
import type { LlmClient } from './llm/llm-client.js';
import type { Messenger } from './push/messenger.js';
import { airRouter } from './routes/air.js';
import { authRouter } from './routes/auth.js';
import { chatRouter } from './routes/chat.js';
import { configRouter } from './routes/config.js';
import { errorHandler, notFound } from './routes/errors.js';
import { healthRouter } from './routes/health.js';
import { internalRouter } from './routes/internal.js';
import { meRouter } from './routes/me.js';
import { AI_RATE_LIMIT, rateLimit, type RateLimitOptions } from './security/rate-limit.js';
import { admission } from './security/admission.js';
import { securityHeaders } from './security/security-headers.js';
import { serveClient } from './static/serve-client.js';
import type { UserStore } from './store/user-store.js';

/** A message, a few turns of history and the memory are a few kilobytes at most. */
const BODY_LIMIT = '32kb';

/** Everything the app is built from, so tests pass fakes. */
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
 * cap, rate limits, public routes, then sign-in for personal routes, static
 * files, errors last.
 */
export function createApp(deps: AppDependencies): Express {
  const now = deps.now ?? (() => new Date());
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', deps.config.trustProxyHops);
  app.use(securityHeaders(deps.config.allowedOrigin));
  app.use(compression());
  app.use('/api', admission(deps.config.allowedOrigin));
  app.use('/api', express.json({ limit: BODY_LIMIT }));
  rateLimits(app, deps);
  mountRoutes(app, deps, now);
  if (deps.config.staticDir !== null) {
    app.use(serveClient(deps.config.staticDir));
  }
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

/** The API: public routes, the scheduler's route when set up, then the signed-in ones. */
function mountRoutes(app: Express, deps: AppDependencies, now: () => Date): void {
  const { config, llm, air, store } = deps;
  const { signIn, resolve } = sessionResolver(deps, now);
  app.use('/api', healthRouter(llm === null ? 'offline' : 'gemini', config));
  app.use('/api', configRouter(config));
  app.use('/api', airRouter(air));
  app.use('/api', authRouter({ mode: config.authMode, resolve, signIn }));
  if (deps.verifyScheduler !== null) {
    const job = { air, store, messenger: deps.messenger, now };
    app.use('/api', internalRouter(job, deps.verifyScheduler));
  }
  app.use(['/api/me', '/api/chat'], requireUser(config.authMode, resolve));
  const deleteAccount = async (uid: string): Promise<void> => {
    await deps.accounts?.delete(uid);
  };
  app.use('/api', meRouter(store, now, deleteAccount));
  app.use('/api', chatRouter({ llm, air, store, now }));
  app.use('/api', notFound);
}
