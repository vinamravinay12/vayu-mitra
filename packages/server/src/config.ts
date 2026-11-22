import {
  loadFirebase,
  loadScheduler,
  present,
  type FirebaseSettings,
  type SchedulerSettings,
} from './firebase-config.js';

/** Where air data and place search come from. */
export type AirDataMode = 'live' | 'fixture';

/**
 * `firebase`: every personal route needs a verified Google sign-in.
 * `none`: development only; everyone shares one local household.
 */
export type AuthMode = 'firebase' | 'none';

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
  readonly firebase: FirebaseSettings | null;
  readonly authMode: AuthMode;
  readonly scheduler: SchedulerSettings | null;
  /** AI requests one client may make per minute. Parallel browser tests share one address. */
  readonly aiRequestsPerMinute: number;
}

/** AI requests per client per minute unless configured: enough for a family, not for a script. */
export const DEFAULT_AI_REQUESTS_PER_MINUTE = 10;

/**
 * Gemini 3.5 Flash-Lite first: in probing with the real extraction schema it
 * answered in 0.9–1.8 s while 3.6 and 3.8 Flash were overloaded (503s and 30 s
 * timeouts). The Flash-Lite models behind it take over when it is busy or
 * rate-limited, rather than the family seeing an error.
 */
export const DEFAULT_MODELS: readonly string[] = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
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

/** A whole number within [0, max], or the fallback. */
const parseInteger = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};

/**
 * Reads configuration from the environment.
 *
 * A missing key, fixture air data and no sign-in are tolerated in development
 * so the app runs end to end offline, but refused in production: a deployed
 * assistant with made-up air, or one household shared by every visitor, would
 * misrepresent what it is.
 */
export function loadConfig(env: Env): ServerConfig {
  const geminiApiKey = orNull(env.GEMINI_API_KEY);
  const airDataMode: AirDataMode = env.AIR_DATA_MODE === 'fixture' ? 'fixture' : 'live';
  const firebase = loadFirebase(env);
  if (env.NODE_ENV === 'production') {
    refuseUnsafeProduction(geminiApiKey, airDataMode, firebase);
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
    firebase,
    authMode: firebase === null ? 'none' : 'firebase',
    scheduler: loadScheduler(env),
    aiRequestsPerMinute: Math.max(
      1,
      parseInteger(env.AI_REQUESTS_PER_MINUTE, DEFAULT_AI_REQUESTS_PER_MINUTE, 1000),
    ),
  };
}

/** The trimmed value, or null when it is missing or blank. */
const orNull = (value: string | undefined): string | null => present(value) ?? null;

/** What production must have. */
function refuseUnsafeProduction(
  geminiApiKey: string | null,
  airDataMode: AirDataMode,
  firebase: FirebaseSettings | null,
): void {
  if (geminiApiKey === null) {
    throw new Error('GEMINI_API_KEY is required in production');
  }
  if (airDataMode === 'fixture') {
    throw new Error('AIR_DATA_MODE=fixture is not allowed in production');
  }
  if (firebase === null) {
    throw new Error('FIREBASE_PROJECT_ID is required in production');
  }
}
