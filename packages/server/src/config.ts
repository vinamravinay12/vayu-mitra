/** Server configuration from the environment, refusing unsafe settings in production. */
import {
  loadPush,
  loadScheduler,
  loadSessionSecret,
  present,
  type PushSettings,
  type SchedulerSettings,
} from './settings.js';
import { parseInteger, readRateLimits } from './rate-limit-config.js';

/** Where air data and place search come from. */
export type AirDataMode = 'live' | 'fixture';

/**
 * `password`: every personal route needs a signed-in account (email and password).
 * `none`: development only; everyone shares one local household.
 */
export type AuthMode = 'password' | 'none';

/** Where families' records live: Firestore in production, process memory in development. */
type StoreMode = 'firestore' | 'memory';

/** The server’s configuration, as read from the environment. */
export interface ServerConfig {
  readonly port: number;
  /** Null answers from the engine's own sentences — used by tests and keyless local runs. */
  readonly geminiApiKey: string | null;
  /** Tried in order: a capacity spike on Gemini is per model, so a fallback turns an error into an answer. */
  readonly models: readonly string[];
  readonly allowedOrigin: string;
  /** Proxy hops in front of the app. Cloud Run has exactly one (Google's front end). */
  readonly trustProxyHops: number;
  /** Built client to serve, or null to run as an API only. */
  readonly staticDir: string | null;
  /** `live` calls Open-Meteo, CPCB and WAQI; `fixture` serves fixed winter data for tests and demos. */
  readonly airDataMode: AirDataMode;
  /** data.gov.in key for CPCB's real-time station feed; null skips that feed. */
  readonly dataGovInApiKey: string | null;
  /** WAQI token; null skips that feed. */
  readonly waqiToken: string | null;
  /** Signs session cookies; null only in development, where sign-in is off. */
  readonly sessionSecret: string | null;
  readonly authMode: AuthMode;
  readonly store: StoreMode;
  /** Web Push keys; null turns alerts off. */
  readonly push: PushSettings | null;
  readonly scheduler: SchedulerSettings | null;
  /** AI requests one client may make per minute. Parallel browser tests share one address. */
  readonly aiRequestsPerMinute: number;
  /** Sign-up and sign-in attempts one client may make per minute: the brake on password guessing. */
  readonly authRequestsPerMinute: number;
  readonly dataRequestsPerMinute: number;
}

/**
 * Gemini 3.8 Flash first, then 3.6 Flash, then 3.5 Flash-Lite. The Flash
 * models read and write better; under load they have been seen to answer 503
 * or hang, so each gets 10 s before the next takes over, and Flash-Lite, the
 * fastest, is the last resort rather than the family seeing an error.
 */
export const DEFAULT_MODELS: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];

/** Port used when PORT is unset or invalid (Cloud Run sets it). */
export const DEFAULT_PORT = 8080;

type Env = Readonly<Record<string, string | undefined>>;

/** `GEMINI_MODELS` replaces the list; `GEMINI_MODEL` only moves one model to the front. */
export function parseModels(env: Env): readonly string[] {
  const list = present(env.GEMINI_MODELS)
    ?.split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
  if (list !== undefined && list.length > 0) {
    return list;
  }
  const primary = present(env.GEMINI_MODEL);
  return primary === undefined
    ? DEFAULT_MODELS
    : [primary, ...DEFAULT_MODELS.filter((model) => model !== primary)];
}

/**
 * Reads configuration from the environment.
 *
 * A missing key, fixture air data, no sign-in and in-memory storage are
 * tolerated in development so the app runs end to end offline, but refused in
 * production: made-up air, one household shared by every visitor, or records
 * lost on every restart would misrepresent what it is.
 */
export function loadConfig(env: Env): ServerConfig {
  const geminiApiKey = orNull(env.GEMINI_API_KEY);
  const airDataMode: AirDataMode = env.AIR_DATA_MODE === 'fixture' ? 'fixture' : 'live';
  const sessionSecret = loadSessionSecret(env);
  const store: StoreMode = env.STORE === 'firestore' ? 'firestore' : 'memory';
  if (env.NODE_ENV === 'production') {
    refuseUnsafeProduction({ geminiApiKey, airDataMode, sessionSecret, store });
  }
  const port = parseInteger(env.PORT, DEFAULT_PORT, 65_535);
  return {
    port: port === 0 ? DEFAULT_PORT : port,
    geminiApiKey,
    models: parseModels(env),
    allowedOrigin: present(env.ALLOWED_ORIGIN) ?? 'same-origin',
    trustProxyHops: parseInteger(env.TRUST_PROXY_HOPS, 1, 5),
    staticDir: orNull(env.STATIC_DIR),
    airDataMode,
    dataGovInApiKey: orNull(env.DATA_GOV_IN_API_KEY),
    waqiToken: orNull(env.WAQI_TOKEN),
    sessionSecret,
    authMode: sessionSecret === null ? 'none' : 'password',
    store,
    push: loadPush(env),
    scheduler: loadScheduler(env),
    ...readRateLimits(env),
  };
}

/** The trimmed value, or null when it is missing or blank. */
const orNull = (value: string | undefined): string | null => present(value) ?? null;

/** What production must have: a model, live air, sign-in and durable storage. */
function refuseUnsafeProduction(settings: {
  readonly geminiApiKey: string | null;
  readonly airDataMode: AirDataMode;
  readonly sessionSecret: string | null;
  readonly store: StoreMode;
}): void {
  const problems = [
    settings.geminiApiKey === null ? 'GEMINI_API_KEY is required' : null,
    settings.airDataMode === 'fixture' ? 'AIR_DATA_MODE=fixture is not allowed' : null,
    settings.sessionSecret === null ? 'SESSION_SECRET is required' : null,
    settings.store === 'memory' ? 'STORE=firestore is required' : null,
  ].filter((problem) => problem !== null);
  if (problems.length > 0) {
    throw new Error(`In production: ${problems.join('; ')}`);
  }
}
