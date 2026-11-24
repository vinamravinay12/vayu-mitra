/** What the fake server holds and records, and its JSON responses. */
import type { MemoryChange } from '@vayu/core';
import type { Household } from '../api/api.js';
import type { ClientConfig } from '../api/config.js';

/** A failure a route can be told to give: an HTTP status, or a dropped connection. */
type Failure = number | 'network';

/** What the fake server holds and records, which tests read and set. */
export interface FakeServer {
  household: Household;
  config: ClientConfig;
  /** The signed-in email; null when signed out. Ignored with sign-in off. */
  email: string | null;
  /** Accounts that exist: email → password. */
  accounts: Map<string, string>;
  /** Memory changes the next chat turn applies, standing in for the understand call. */
  understood: MemoryChange[];
  /** Routes ("GET /api/air") that should fail, and how. */
  failures: Map<string, Failure>;
  requests: { method: string; path: string; body: unknown; credentials: string | null }[];
}

/** A JSON response, or an empty one for 204, as the real server sends them. */
export const json = (status: number, body: unknown): Response =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
