import { createApp, type AppDependencies } from '../app.js';
import { loadConfig } from '../config.js';
import { createLogMessenger } from '../push/messenger.js';
import { testDeps } from './deps.js';

/** Firebase settings for a project that does not exist; tokens are checked by a fake. */
export const FIREBASE_ENV = {
  FIREBASE_PROJECT_ID: 'vayu-test',
  FIREBASE_WEB_API_KEY: 'web-key',
  FIREBASE_APP_ID: '1:2:web:3',
  FIREBASE_MESSAGING_SENDER_ID: '2',
  FIREBASE_VAPID_KEY: 'vapid',
};

/** Accepts tokens of the form `token-<uid>`. */
export const fakeVerifier = (token: string) =>
  token.startsWith('token-')
    ? Promise.resolve({ uid: token.slice(6) })
    : Promise.reject(new Error('invalid token'));

/** The app over fixture air, an in-memory store and no model, with any part replaced. */
export function testApp(
  overrides: Partial<AppDependencies> = {},
  env: Record<string, string> = {},
) {
  const deps = testDeps();
  const dependencies: AppDependencies = {
    config: loadConfig({ AIR_DATA_MODE: 'fixture', ...env }),
    llm: null,
    air: deps.air,
    store: deps.store,
    messenger: createLogMessenger(),
    verifyIdToken: null,
    verifyScheduler: null,
    now: deps.now,
    ...overrides,
  };
  return { app: createApp(dependencies), deps: dependencies };
}
