/** The per-client rate limits, read from the environment. */

/** AI requests per client per minute unless configured: enough for a family, not for a script. */
const DEFAULT_AI_REQUESTS_PER_MINUTE = 10;

/** Sign-in attempts per client per minute unless configured. */
const DEFAULT_AUTH_REQUESTS_PER_MINUTE = 10;

/** Requests to the cached, cheap data routes per client per minute unless configured. */
const DEFAULT_DATA_REQUESTS_PER_MINUTE = 60;

/** A whole number within [0, max], or the fallback. */
export const parseInteger = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};

/** A per-minute limit from the environment: at least one, at most `max`, else the default. */
const perMinute = (value: string | undefined, fallback: number, max: number): number =>
  Math.max(1, parseInteger(value, fallback, max));

/** The three per-client rate limits: model calls, sign-in attempts and the data routes. */
export function readRateLimits(env: Readonly<Record<string, string | undefined>>) {
  return {
    aiRequestsPerMinute: perMinute(
      env.AI_REQUESTS_PER_MINUTE,
      DEFAULT_AI_REQUESTS_PER_MINUTE,
      1000,
    ),
    authRequestsPerMinute: perMinute(
      env.AUTH_REQUESTS_PER_MINUTE,
      DEFAULT_AUTH_REQUESTS_PER_MINUTE,
      1000,
    ),
    dataRequestsPerMinute: perMinute(
      env.DATA_REQUESTS_PER_MINUTE,
      DEFAULT_DATA_REQUESTS_PER_MINUTE,
      5000,
    ),
  };
}
