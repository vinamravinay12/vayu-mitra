import request from 'supertest';
import type { Express } from 'express';
import { createApp, type AppDependencies } from '../app.js';
import { createAccountStore } from '../auth/accounts.js';
import { loadConfig } from '../config.js';
import { createLogMessenger } from '../push/messenger.js';
import { createMemoryCollection } from '../store/user-store.js';
import type { PushSubscriptionJson } from '../validation/request-schemas.js';
import { testDeps } from './deps.js';

/** Turns sign-in on, with a test-only signing key. */
export const AUTH_ENV = { SESSION_SECRET: 'test-session-secret-that-is-long-enough' };

/** A browser push subscription on Chrome's push service. */
export const subscription = (name: string): PushSubscriptionJson => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${name}`,
  keys: { p256dh: `p256dh-${name}`, auth: `auth-${name}` },
});

/** The app over fixture air, in-memory stores and no model, with any part replaced. */
export function testApp(
  overrides: Partial<AppDependencies> = {},
  env: Record<string, string> = {},
) {
  const deps = testDeps();
  const config = loadConfig({ AIR_DATA_MODE: 'fixture', ...env });
  const dependencies: AppDependencies = {
    config,
    llm: null,
    air: deps.air,
    store: deps.store,
    accounts:
      config.authMode === 'none'
        ? null
        : createAccountStore(
            { accounts: createMemoryCollection(), emails: createMemoryCollection() },
            deps.now,
          ),
    messenger: createLogMessenger(),
    verifyScheduler: null,
    now: deps.now,
    ...overrides,
  };
  return { app: createApp(dependencies), deps: dependencies };
}

/** Signs up and returns the Cookie header that carries the new session. */
export async function signUp(
  app: Express,
  email: string,
  password = 'correct horse battery',
): Promise<string> {
  const response = await request(app).post('/api/auth/register').send({ email, password });
  const [cookie = ''] = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  return cookie.split(';')[0] ?? '';
}
