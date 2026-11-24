/** Tests of loadConfig. */
import { expect, it } from 'vitest';
import { DEFAULT_MODELS, DEFAULT_PORT, loadConfig } from './config.js';
import { PRODUCTION } from './config.fixtures.js';

it('loadConfig: runs offline in development without a key', () => {
  expect(loadConfig({})).toEqual({
    port: DEFAULT_PORT,
    geminiApiKey: null,
    models: DEFAULT_MODELS,
    allowedOrigin: 'same-origin',
    trustProxyHops: 1,
    staticDir: null,
    airDataMode: 'live',
    dataGovInApiKey: null,
    waqiToken: null,
    sessionSecret: null,
    authMode: 'none',
    store: 'memory',
    push: null,
    scheduler: null,
    aiRequestsPerMinute: 10,
    authRequestsPerMinute: 10,
    dataRequestsPerMinute: 60,
  });
});

it('loadConfig: refuses to start in production without a key', () => {
  expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('GEMINI_API_KEY is required');
  expect(() => loadConfig({ NODE_ENV: 'production', GEMINI_API_KEY: '   ' })).toThrow();
});

it('loadConfig: allows fixture air data only outside production', () => {
  expect(loadConfig({ AIR_DATA_MODE: 'fixture' }).airDataMode).toBe('fixture');
  expect(() => loadConfig({ ...PRODUCTION, AIR_DATA_MODE: 'fixture' })).toThrow(
    'AIR_DATA_MODE=fixture is not allowed',
  );
});

it('loadConfig: reads every setting from the environment', () => {
  expect(
    loadConfig({
      ...PRODUCTION,
      GEMINI_API_KEY: ' key ',
      PORT: '9000',
      DATA_GOV_IN_API_KEY: ' cpcb ',
      WAQI_TOKEN: 'waqi',
      ALLOWED_ORIGIN: 'https://example.test',
      TRUST_PROXY_HOPS: '2',
      STATIC_DIR: '/srv/client',
    }),
  ).toMatchObject({
    geminiApiKey: 'key',
    port: 9000,
    allowedOrigin: 'https://example.test',
    trustProxyHops: 2,
    staticDir: '/srv/client',
    dataGovInApiKey: 'cpcb',
    waqiToken: 'waqi',
    authMode: 'password',
    store: 'firestore',
  });
});
