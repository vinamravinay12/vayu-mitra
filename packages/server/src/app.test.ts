import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UpstreamError } from './air/fetch-json.js';
import { createApp } from './app.js';
import { API_CSP } from './security/security-headers.js';
import { AUTH_ENV, testApp } from './test-utils/app.js';
import { failingAir } from './app.fixtures.js';

describe('public routes', () => {
  it('reports Gemini mode and runs on the wall clock by default', async () => {
    const llm = { generate: () => Promise.reject(new Error('unused')) };
    const { now: _clock, ...withoutClock } = testApp({ llm }).deps;
    const app = createApp(withoutClock);
    expect((await request(app).get('/api/health')).body.mode).toBe('gemini');
    const created = Date.parse(String((await request(app).get('/api/me')).body.updatedAt));
    expect(Math.abs(created - Date.now())).toBeLessThan(60_000);
  });
});

describe('public routes', () => {
  it('reports health without secrets', async () => {
    const { app } = testApp();
    const health = await request(app).get('/api/health');
    expect(health.body).toEqual({
      status: 'ok',
      mode: 'offline',
      airData: 'fixture',
      stations: { cpcb: false, waqi: false },
      auth: 'none',
      store: 'memory',
      push: false,
      alerts: false,
    });
    expect(health.headers['content-security-policy']).toBe(API_CSP);
  });
});

describe('public routes', () => {
  it('serves the client config, and no sign-in routes while sign-in is off', async () => {
    const { app } = testApp();
    expect((await request(app).get('/api/config')).body).toEqual({ auth: 'none', vapidKey: null });
    expect((await request(app).get('/api/auth/session')).body).toEqual({
      signedIn: true,
      email: null,
    });
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(404);
    const env = {
      ...AUTH_ENV,
      VAPID_PUBLIC_KEY: 'pub',
      VAPID_PRIVATE_KEY: 'priv',
      VAPID_SUBJECT: 'mailto:a@b.test',
    };
    const configured = await request(testApp({}, env).app).get('/api/config');
    expect(configured.body).toEqual({ auth: 'password', vapidKey: 'pub' });
  });
});

describe('public routes', () => {
  it('searches places and serves the air report', async () => {
    const { app } = testApp();
    expect((await request(app).get('/api/places?q=delhi')).body.places[0].name).toBe('New Delhi');
    expect((await request(app).get('/api/places?q=x')).status).toBe(400);
    const air = await request(app).get('/api/air?lat=28.61&lon=77.21');
    expect(air.status).toBe(200);
    expect(air.body.current.basis).toBe('station');
    expect(air.headers['cache-control']).toBe('public, max-age=300');
    expect((await request(app).get('/api/air?lat=abc')).status).toBe(400);
  });
  it('answers 502 when upstream air fails and 500 for anything else', async () => {
    const upstream = testApp({ air: failingAir(new UpstreamError('down')) }).app;
    expect((await request(upstream).get('/api/air?lat=1&lon=1')).status).toBe(502);
    expect((await request(upstream).get('/api/places?q=delhi')).status).toBe(502);
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    expect(
      (await request(testApp({ air: failingAir(timeout) }).app).get('/api/air?lat=1&lon=1')).status,
    ).toBe(502);
    const bug = testApp({ air: failingAir(new Error('bug')) }).app;
    const response = await request(bug).get('/api/places?q=delhi');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Something went wrong.' });
    expect((await request(bug).get('/api/air?lat=1&lon=1')).status).toBe(500);
  });
});
