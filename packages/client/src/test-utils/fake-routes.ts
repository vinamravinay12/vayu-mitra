/** The fake server’s routes, answering as the real API would. */
import type { ChatRequest } from '@vayu/core';
import type { Household } from '../api/api.js';
import { chat } from './fake-chat.js';
import { json, type FakeServer } from './fake-state.js';
import { DELHI, emptyHousehold, makeReport } from './fixtures.js';

/** What the fake was asked: the method, the path without its query, and the parsed body. */
interface FakeRequest {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** Sign-in routes, answered from the fake's accounts. */
function authRoutes(server: FakeServer, body: unknown): Record<string, () => Response> {
  const { email = '', password = '' } = (body ?? {}) as { email?: string; password?: string };
  return {
    'GET /api/auth/session': () =>
      json(
        200,
        server.config.auth === 'none'
          ? { signedIn: true, email: null }
          : { signedIn: server.email !== null, email: server.email },
      ),
    'POST /api/auth/register': () => {
      if (server.accounts.has(email))
        return json(409, { error: 'That email already has an account. Sign in instead.' });
      server.accounts.set(email, password);
      server.email = email;
      return json(201, { email });
    },
    'POST /api/auth/login': () => {
      if (server.accounts.get(email) !== password)
        return json(401, { error: 'That email and password do not match an account.' });
      server.email = email;
      return json(200, { email });
    },
    'POST /api/auth/logout': () => {
      server.email = null;
      return json(204, null);
    },
  };
}

/** The household routes, which change the fake's record. */
function householdRoutes(server: FakeServer, body: unknown): Record<string, () => Response> {
  const update = (patch: Partial<Household>): Response => {
    server.household = { ...server.household, ...patch };
    return json(200, server.household);
  };
  return {
    'GET /api/me': () => json(200, server.household),
    'PUT /api/me/memory': () => update({ memory: body as Household['memory'] }),
    'PUT /api/me/place': () => update({ place: body as Household['place'] }),
    'PUT /api/me/alerts': () => update({ alerts: body as Household['alerts'] }),
    'POST /api/me/push-subscription': () => update({ pushEnabled: true }),
    'DELETE /api/me/push-subscription': () => update({ pushEnabled: false }),
    'DELETE /api/me': () => {
      server.household = emptyHousehold();
      server.email = null;
      return json(204, null);
    },
  };
}

/** Answers one request the way the real server would. */
export function route(server: FakeServer, { method, path, body }: FakeRequest): Response {
  const routes: Record<string, () => Response> = {
    'GET /api/config': () => json(200, server.config),
    ...authRoutes(server, body),
    ...householdRoutes(server, body),
    'GET /api/places': () => json(200, { places: [DELHI] }),
    'GET /api/air': () => json(200, makeReport()),
    'POST /api/chat': () => json(200, chat(server, body as ChatRequest)),
  };
  return (routes[`${method} ${path}`] ?? (() => json(404, { error: 'Not found.' })))();
}
