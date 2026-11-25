/** Tests of the per-account sign-in throttle. */
import { expect, it } from 'vitest';
import { createLoginThrottle, LOGIN_THROTTLE } from './login-throttle.js';

/** A throttle of two failures per second over a clock the test moves. */
const throttle = (clock: { now: number }, maxAccounts = 10) =>
  createLoginThrottle({ maxFailures: 2, windowMs: 1000, maxAccounts, now: () => clock.now });

it('login throttle: blocks an account after its failures and frees it when the window ends', () => {
  const clock = { now: 0 };
  const guard = throttle(clock);
  expect(guard.blocked('a')).toBe(false);
  guard.fail('a');
  expect(guard.blocked('a')).toBe(false);
  guard.fail('a');
  expect(guard.blocked('a')).toBe(true);
  expect(guard.blocked('b')).toBe(false);
  clock.now = 1000;
  expect(guard.blocked('a')).toBe(false);
  guard.fail('a');
  expect(guard.blocked('a')).toBe(false);
});

it('login throttle: forgets an account’s failures after a correct password', () => {
  const guard = throttle({ now: 0 });
  guard.fail('a');
  guard.clear('a');
  guard.fail('a');
  expect(guard.blocked('a')).toBe(false);
});

it('login throttle: drops the oldest account when the table is full', () => {
  const guard = throttle({ now: 0 }, 1);
  guard.fail('a');
  guard.fail('a');
  guard.fail('b');
  expect(guard.blocked('a')).toBe(false);
  createLoginThrottle({ ...LOGIN_THROTTLE, maxAccounts: 0 }).fail('c');
  expect(LOGIN_THROTTLE).toMatchObject({ maxFailures: 5, windowMs: 900_000 });
  expect(LOGIN_THROTTLE.now()).toBeGreaterThan(0);
});
