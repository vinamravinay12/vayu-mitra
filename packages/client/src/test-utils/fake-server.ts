import { vi } from 'vitest';
import { route } from './fake-routes.js';
import { json, type FakeServer } from './fake-state.js';
import { emptyHousehold, LOCAL_CONFIG } from './fixtures.js';

export type { FakeServer } from './fake-state.js';

/** Installs the fake as `fetch` for one test. */
export function installFakeServer(
  overrides: Partial<Pick<FakeServer, 'household' | 'config' | 'email'>> = {},
): FakeServer {
  const server: FakeServer = {
    household: emptyHousehold(),
    config: LOCAL_CONFIG,
    email: null,
    accounts: new Map(),
    understood: [],
    failures: new Map(),
    requests: [],
    ...overrides,
  };
  vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = input.split('?')[0] ?? input;
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    server.requests.push({ method, path, body, credentials: init.credentials ?? null });
    const failure = server.failures.get(`${method} ${path}`);
    if (failure === 'network') return Promise.reject(new TypeError('Failed to fetch'));
    if (failure !== undefined)
      return Promise.resolve(json(failure, { error: `Failed with ${String(failure)}.` }));
    return Promise.resolve(route(server, { method, path, body }));
  });
  return server;
}
