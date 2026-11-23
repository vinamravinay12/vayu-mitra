import {
  adviseActivity,
  applyChanges,
  describeAdvice,
  describeAir,
  readIntent,
  suggestQuestions,
  type ChatRequest,
  type MemoryChange,
} from '@vayu/core';
import { vi } from 'vitest';
import type { Household } from '../api/api.js';
import type { ClientConfig } from '../api/config.js';
import { DELHI, emptyHousehold, LOCAL_CONFIG, makeReport } from './fixtures.js';

/** A failure a route can be told to give: an HTTP status, or a dropped connection. */
export type Failure = number | 'network';

export interface FakeServer {
  household: Household;
  config: ClientConfig;
  /** Memory changes the next chat turn applies, standing in for the understand call. */
  understood: MemoryChange[];
  /** Routes ("GET /api/air") that should fail, and how. */
  failures: Map<string, Failure>;
  requests: { method: string; path: string; body: unknown; auth: string | null }[];
}

const json = (status: number, body: unknown): Response =>
  status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

/** One chat turn, answered by the real engine over the fixture report. */
function chat(server: FakeServer, request: ChatRequest) {
  const report = makeReport();
  const memory = applyChanges(server.household.memory, server.understood);
  server.understood = [];
  server.household = { ...server.household, memory };
  const intent = readIntent(request.message, memory);
  const now = new Date('2026-11-22T04:30:00Z');
  const advice =
    intent === null
      ? null
      : adviseActivity({ ...intent, report, now, home: memory.home.map((fact) => fact.feature) });
  return {
    reply: advice === null ? describeAir(report) : describeAdvice(advice, report),
    advice,
    memory,
    suggestions: suggestQuestions(memory),
    source: 'engine',
  };
}

/** Answers one request the way the real server would. */
function route(server: FakeServer, method: string, path: string, body: unknown): Response {
  const update = (patch: Partial<Household>): Response => {
    server.household = { ...server.household, ...patch };
    return json(200, server.household);
  };
  const routes: Record<string, () => Response> = {
    'GET /api/config': () => json(200, server.config),
    'GET /api/me': () => json(200, server.household),
    'PUT /api/me/memory': () => update({ memory: body as Household['memory'] }),
    'PUT /api/me/place': () => update({ place: body as Household['place'] }),
    'PUT /api/me/alerts': () => update({ alerts: body as Household['alerts'] }),
    'POST /api/me/push-id': () => update({ pushEnabled: true }),
    'DELETE /api/me/push-id': () => update({ pushEnabled: false }),
    'DELETE /api/me': () => {
      server.household = emptyHousehold();
      return json(204, null);
    },
    'GET /api/places': () => json(200, { places: [DELHI] }),
    'GET /api/air': () => json(200, makeReport()),
    'POST /api/chat': () => json(200, chat(server, body as ChatRequest)),
  };
  return (routes[`${method} ${path}`] ?? (() => json(404, { error: 'Not found.' })))();
}

/** Installs the fake as `fetch` for one test. */
export function installFakeServer(
  overrides: Partial<Pick<FakeServer, 'household' | 'config'>> = {},
): FakeServer {
  const server: FakeServer = {
    household: emptyHousehold(),
    config: LOCAL_CONFIG,
    understood: [],
    failures: new Map(),
    requests: [],
    ...overrides,
  };
  vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = input.split('?')[0] ?? input;
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const headers = (init.headers ?? {}) as Record<string, string>;
    server.requests.push({ method, path, body, auth: headers.Authorization ?? null });
    const failure = server.failures.get(`${method} ${path}`);
    if (failure === 'network') return Promise.reject(new TypeError('Failed to fetch'));
    if (failure !== undefined)
      return Promise.resolve(json(failure, { error: `Failed with ${String(failure)}.` }));
    return Promise.resolve(route(server, method, path, body));
  });
  return server;
}
