import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMPTY_MEMORY } from '@vayu/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UpstreamError } from './air/fetch-json.js';
import { createApp, describeBodyError } from './app.js';
import { API_CSP, appCsp } from './security/security-headers.js';
import { fakeVerifier, FIREBASE_ENV, testApp } from './test-utils/app.js';
import { DELHI } from './test-utils/deps.js';

const failingAir = (error: Error) => ({
  report: () => Promise.reject(error),
  places: () => Promise.reject(error),
});

describe('public routes', () => {
  it('reports Gemini mode and runs on the wall clock by default', async () => {
    const llm = { generate: () => Promise.reject(new Error('unused')) };
    const { now: _clock, ...withoutClock } = testApp({ llm }).deps;
    const app = createApp(withoutClock);
    expect((await request(app).get('/api/health')).body.mode).toBe('gemini');
    const created = Date.parse(String((await request(app).get('/api/me')).body.updatedAt));
    expect(Math.abs(created - Date.now())).toBeLessThan(60_000);
  });

  it('reports health and the client config without secrets', async () => {
    const { app } = testApp();
    const health = await request(app).get('/api/health');
    expect(health.body).toEqual({
      status: 'ok',
      mode: 'offline',
      airData: 'fixture',
      stations: { cpcb: false, waqi: false },
      auth: 'none',
      alerts: false,
    });
    expect((await request(app).get('/api/config')).body).toEqual({
      auth: 'none',
      firebase: null,
      vapidKey: null,
    });
    const firebase = testApp({ verifyIdToken: fakeVerifier }, FIREBASE_ENV).app;
    const config = await request(firebase).get('/api/config');
    expect(config.body).toMatchObject({
      auth: 'firebase',
      firebase: { projectId: 'vayu-test' },
      vapidKey: 'vapid',
    });
    expect(health.headers['content-security-policy']).toBe(API_CSP);
  });

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

describe('the family record', () => {
  it('starts empty, takes each kind of change and hides device ids', async () => {
    const { app } = testApp();
    const fresh = await request(app).get('/api/me');
    expect(fresh.body).toMatchObject({ memory: EMPTY_MEMORY, place: null, pushEnabled: false });
    expect(fresh.headers['cache-control']).toBe('no-store');
    const memory = { ...EMPTY_MEMORY, home: [{ kind: 'home', id: 'home:car', feature: 'car' }] };
    expect((await request(app).put('/api/me/memory').send(memory)).body.memory).toEqual(memory);
    expect((await request(app).put('/api/me/place').send(DELHI)).body.place).toEqual(DELHI);
    const alerts = { enabled: true, threshold: 'poor', quietStart: '22:00', quietEnd: '06:00' };
    expect((await request(app).put('/api/me/alerts').send(alerts)).body.alerts).toEqual(alerts);
    expect((await request(app).put('/api/me/alerts').send({ enabled: 'yes' })).status).toBe(400);
  });

  it('registers devices once each, keeps the newest five, and removes them', async () => {
    const { app, deps } = testApp();
    for (const id of ['a', 'b', 'a', 'c', 'd', 'e', 'f']) {
      await request(app).post('/api/me/push-id').send({ id });
    }
    expect((await deps.store.get('local-household'))?.pushIds).toEqual(['a', 'c', 'd', 'e', 'f']);
    const removed = await request(app).delete('/api/me/push-id').send({ id: 'f' });
    expect(removed.body.pushEnabled).toBe(true);
    expect((await deps.store.get('local-household'))?.pushIds).not.toContain('f');
  });

  it('deletes everything', async () => {
    const { app, deps } = testApp();
    await request(app).put('/api/me/place').send(DELHI);
    expect((await request(app).delete('/api/me')).status).toBe(204);
    expect(await deps.store.get('local-household')).toBeNull();
  });
});

describe('sign-in', () => {
  const { app } = testApp({ verifyIdToken: fakeVerifier }, FIREBASE_ENV);

  it('requires a valid token on personal routes only', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
    expect((await request(app).get('/api/me').set('authorization', 'Bearer nope')).status).toBe(
      401,
    );
    expect((await request(app).get('/api/me').set('authorization', 'Basic token-u1')).status).toBe(
      401,
    );
    expect(
      (
        await request(app)
          .get('/api/me')
          .set('authorization', `Bearer token-${'x'.repeat(5000)}`)
      ).status,
    ).toBe(401);
    expect((await request(app).post('/api/chat').send({})).status).toBe(401);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('keeps each family’s record to itself', async () => {
    await request(app).put('/api/me/place').set('authorization', 'Bearer token-asha').send(DELHI);
    const asha = await request(app).get('/api/me').set('authorization', 'Bearer token-asha');
    const ravi = await request(app).get('/api/me').set('authorization', 'Bearer token-ravi');
    expect(asha.body.place).toEqual(DELHI);
    expect(ravi.body.place).toBeNull();
  });

  it('opens the CSP and opener policy only for Google sign-in', async () => {
    const page = await request(app).get('/');
    expect(page.headers['content-security-policy']).toBe(appCsp('vayu-test.firebaseapp.com'));
    expect(page.headers['content-security-policy']).toContain(
      'frame-src https://vayu-test.firebaseapp.com',
    );
    expect(page.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    const plain = await request(testApp().app).get('/');
    expect(plain.headers['content-security-policy']).toBe(appCsp(null));
    expect(plain.headers['content-security-policy']).toContain("frame-src 'none'");
    expect(plain.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(plain.headers['permissions-policy']).toContain('geolocation=(self)');
  });
});

describe('POST /api/chat', () => {
  it('answers a message and validates the request', async () => {
    const { app } = testApp();
    const reply = await request(app)
      .post('/api/chat')
      .send({ message: 'Can I go for a walk?', place: DELHI, history: [] });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ source: 'engine', advice: { activity: 'walk' } });
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(
      (await request(app).post('/api/chat').send({ message: '', place: DELHI, history: [] }))
        .status,
    ).toBe(400);
  });

  it('answers 502 when the air is unavailable and 500 for bugs', async () => {
    const send = (air: ReturnType<typeof failingAir>) =>
      request(testApp({ air }).app)
        .post('/api/chat')
        .send({ message: 'walk?', place: DELHI, history: [] });
    expect((await send(failingAir(new UpstreamError('down')))).status).toBe(502);
    expect((await send(failingAir(new Error('bug')))).status).toBe(500);
  });

  it('is rate limited per client', async () => {
    const { app } = testApp({
      rateLimitOptions: { windowMs: 60_000, max: 1, maxClients: 10, now: () => 0 },
    });
    const body = { message: 'walk?', place: DELHI, history: [] };
    expect((await request(app).post('/api/chat').send(body)).status).toBe(200);
    const blocked = await request(app).post('/api/chat').send(body);
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBe('60');
  });
});

describe('POST /api/internal/check-alerts', () => {
  it('does not exist without the scheduler, and hides from anyone but it', async () => {
    expect((await request(testApp().app).post('/api/internal/check-alerts')).status).toBe(404);
    const { app } = testApp({ verifyScheduler: (token) => Promise.resolve(token === 'oidc-ok') });
    expect((await request(app).post('/api/internal/check-alerts')).status).toBe(404);
    expect(
      (await request(app).post('/api/internal/check-alerts').set('authorization', 'Bearer forged'))
        .status,
    ).toBe(404);
    const run = await request(app)
      .post('/api/internal/check-alerts')
      .set('authorization', 'Bearer oidc-ok');
    expect(run.body).toEqual({ checked: 0, sent: 0, skipped: 0, failed: 0 });
  });
});

describe('errors and static files', () => {
  it('answers malformed and oversized bodies and unknown routes', async () => {
    const { app } = testApp();
    const malformed = await request(app)
      .post('/api/chat')
      .set('content-type', 'application/json')
      .send('{');
    expect(malformed.status).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/chat')
          .send({ message: 'x'.repeat(40_000) })
      ).status,
    ).toBe(413);
    expect((await request(app).get('/api/nope')).status).toBe(404);
    expect((await request(app).get('/nope')).status).toBe(404);
  });

  it('serves the client with the app CSP and immutable assets', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vayu-client-'));
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>Vayu</title>');
    writeFileSync(join(root, 'assets', 'app-abc.js'), 'export {};');
    const { app } = testApp({}, { STATIC_DIR: root });
    const page = await request(app).get('/chat');
    expect(page.status).toBe(200);
    expect(page.headers['cache-control']).toBe('no-cache');
    expect((await request(app).get('/assets/app-abc.js')).headers['cache-control']).toContain(
      'immutable',
    );
    expect((await request(app).get('/assets/missing.js')).status).toBe(404);
    expect((await request(app).post('/chat')).status).toBe(404);
  });

  it('allows a configured origin and answers preflight', async () => {
    const { app } = testApp({}, { ALLOWED_ORIGIN: 'https://example.test' });
    const preflight = await request(app).options('/api/chat');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('https://example.test');
    expect(preflight.headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
  });

  it('classifies framework errors', () => {
    expect(describeBodyError(null)).toBeUndefined();
    expect(describeBodyError({ status: 404 })).toEqual({ status: 404, message: 'Not found.' });
    expect(describeBodyError({ type: 'other', status: 500 })).toBeUndefined();
  });
});
