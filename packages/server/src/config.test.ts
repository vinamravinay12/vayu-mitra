import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS, DEFAULT_PORT, loadConfig, parseModels } from './config.js';
import { loadPush, loadScheduler, loadSessionSecret } from './settings.js';

const SECRET = 'a-session-secret-of-at-least-32-chars';

const PRODUCTION = {
  NODE_ENV: 'production',
  GEMINI_API_KEY: 'key',
  SESSION_SECRET: SECRET,
  STORE: 'firestore',
};

const VAPID = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:a@b.test',
};

describe('loadConfig', () => {
  it('runs offline in development without a key', () => {
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
    });
  });

  it('refuses to start in production without a key', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('GEMINI_API_KEY is required');
    expect(() => loadConfig({ NODE_ENV: 'production', GEMINI_API_KEY: '   ' })).toThrow();
  });

  it('allows fixture air data only outside production', () => {
    expect(loadConfig({ AIR_DATA_MODE: 'fixture' }).airDataMode).toBe('fixture');
    expect(() => loadConfig({ ...PRODUCTION, AIR_DATA_MODE: 'fixture' })).toThrow(
      'AIR_DATA_MODE=fixture is not allowed',
    );
  });

  it('reads every setting from the environment', () => {
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

  it('lists everything production is missing', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      'In production: GEMINI_API_KEY is required; SESSION_SECRET is required; STORE=firestore is required',
    );
  });

  it('reads the sign-in rate limit', () => {
    expect(loadConfig({ AUTH_REQUESTS_PER_MINUTE: '30' }).authRequestsPerMinute).toBe(30);
    expect(loadConfig({ AUTH_REQUESTS_PER_MINUTE: '0' }).authRequestsPerMinute).toBe(1);
  });

  it('reads the AI rate limit, never below one request a minute', () => {
    expect(loadConfig({ AI_REQUESTS_PER_MINUTE: '600' }).aiRequestsPerMinute).toBe(600);
    expect(loadConfig({ AI_REQUESTS_PER_MINUTE: '0' }).aiRequestsPerMinute).toBe(1);
    expect(loadConfig({ AI_REQUESTS_PER_MINUTE: '5000' }).aiRequestsPerMinute).toBe(10);
  });

  it('falls back to defaults for invalid numbers', () => {
    expect(loadConfig({ PORT: '0' }).port).toBe(DEFAULT_PORT);
    expect(loadConfig({ PORT: '70000' }).port).toBe(DEFAULT_PORT);
    expect(loadConfig({ PORT: 'abc' }).port).toBe(DEFAULT_PORT);
    expect(loadConfig({ TRUST_PROXY_HOPS: '-1' }).trustProxyHops).toBe(1);
  });
});

describe('DEFAULT_MODELS', () => {
  it('prefers Gemini 3.8 Flash, then 3.6 Flash, with 3.5 Flash-Lite as the last resort', () => {
    expect(DEFAULT_MODELS).toEqual([
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
    ]);
  });
});

describe('parseModels', () => {
  it('uses the defaults, a preferred first model, or a full list', () => {
    expect(parseModels({})).toEqual(DEFAULT_MODELS);
    expect(parseModels({ GEMINI_MODEL: 'gemini-x' })).toEqual(['gemini-x', ...DEFAULT_MODELS]);
    expect(parseModels({ GEMINI_MODEL: 'gemini-3.5-flash-lite' })).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
    ]);
    expect(parseModels({ GEMINI_MODELS: ' a, ,b ' })).toEqual(['a', 'b']);
    expect(parseModels({ GEMINI_MODELS: ' , ' })).toEqual(DEFAULT_MODELS);
  });
});

describe('loadSessionSecret', () => {
  it('is off when unset and refuses a short secret', () => {
    expect(loadSessionSecret({})).toBeNull();
    expect(loadSessionSecret({ SESSION_SECRET: ` ${SECRET} ` })).toBe(SECRET);
    expect(() => loadSessionSecret({ SESSION_SECRET: 'short' })).toThrow('at least 32 characters');
  });
});

describe('loadPush', () => {
  it('needs all three VAPID values or none', () => {
    expect(loadPush({})).toBeNull();
    expect(loadPush(VAPID)).toEqual({
      publicKey: 'pub',
      privateKey: 'priv',
      subject: 'mailto:a@b.test',
    });
    expect(() => loadPush({ VAPID_PUBLIC_KEY: 'pub' })).toThrow('together');
    expect(() => loadPush({ ...VAPID, VAPID_SUBJECT: ' ' })).toThrow('together');
  });
});

describe('loadScheduler', () => {
  it('needs both values or neither', () => {
    expect(loadScheduler({})).toBeNull();
    expect(
      loadScheduler({ SCHEDULER_AUDIENCE: 'https://vayu.test', SCHEDULER_SERVICE_ACCOUNT: 'sa@x' }),
    ).toEqual({ audience: 'https://vayu.test', serviceAccountEmail: 'sa@x' });
    expect(() => loadScheduler({ SCHEDULER_AUDIENCE: 'https://vayu.test' })).toThrow('both');
  });
});
