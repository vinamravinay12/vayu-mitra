/** Failed sign-ins counted per account, so guessing one password from many addresses still stops. */

/** How many failures an account allows, over how long, and how many accounts it tracks. */
export interface LoginThrottleOptions {
  readonly maxFailures: number;
  readonly windowMs: number;
  /** Bounds memory: guessing at many emails cannot grow the table without limit. */
  readonly maxAccounts: number;
  /** Injected so tests do not depend on the wall clock. */
  readonly now: () => number;
}

/** Five wrong passwords per account per fifteen minutes: plenty for a person, nothing for a script. */
export const LOGIN_THROTTLE: LoginThrottleOptions = {
  maxFailures: 5,
  windowMs: 15 * 60_000,
  maxAccounts: 10_000,
  now: () => Date.now(),
};

/** One account's failures in its current window. */
interface Failures {
  count: number;
  readonly resetAt: number;
}

/**
 * Counts failed sign-ins per account (keyed by the email's hash, never the
 * address). The per-address rate limit cannot stop a guesser who rotates
 * addresses; this does, because the count follows the account. A correct
 * password clears it. Held in memory per instance, like the rate limits.
 */
export function createLoginThrottle(options: LoginThrottleOptions = LOGIN_THROTTLE) {
  const failures = new Map<string, Failures>();
  const live = (key: string): Failures | null => {
    const entry = failures.get(key);
    return entry !== undefined && entry.resetAt > options.now() ? entry : null;
  };
  return {
    /** True while the account has used up its failures for this window. */
    blocked: (key: string): boolean => (live(key)?.count ?? 0) >= options.maxFailures,
    /** Counts one wrong password against the account. */
    fail(key: string): void {
      const entry = live(key);
      if (entry !== null) {
        entry.count += 1;
        return;
      }
      if (failures.size >= options.maxAccounts) {
        const oldest = failures.keys().next();
        if (oldest.done !== true) failures.delete(oldest.value);
      }
      failures.set(key, { count: 1, resetAt: options.now() + options.windowMs });
    },
    /** Forgets the account's failures after a correct password. */
    clear(key: string): void {
      failures.delete(key);
    },
  };
}

/** The throttle the sign-in route consults. */
export type LoginThrottle = ReturnType<typeof createLoginThrottle>;
