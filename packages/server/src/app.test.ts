import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMPTY_MEMORY } from '@vayu/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UpstreamError } from './air/fetch-json.js';
import { createApp, describeBodyError } from './app.js';
import { API_CSP, APP_CSP } from './security/security-headers.js';
import { AUTH_ENV, signUp, subscription, testApp } from './test-utils/app.js';
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
      store: 'memory',
      push: false,
      alerts: false,
    });
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
    for (const name of ['a', 'b', 'a', 'c', 'd', 'e', 'f']) {
      await request(app).post('/api/me/push-subscription').send(subscription(name));
    }
    const endpoints = async () =>
      ((await deps.store.get('local-household'))?.pushSubscriptions ?? []).map((s) =>
        s.endpoint.slice(-1),
      );
    expect(await endpoints()).toEqual(['a', 'c', 'd', 'e', 'f']);
    const removed = await request(app)
      .delete('/api/me/push-subscription')
      .send({ endpoint: subscription('f').endpoint });
    expect(removed.body.pushEnabled).toBe(true);
    expect(await endpoints()).not.toContain('f');
  });

  it('refuses push endpoints outside the known push services', async () => {
    const { app } = testApp();
    for (const endpoint of [
      'http://fcm.googleapis.com/x',
      'https://169.254.169.254/latest',
      'https://evil.test/fcm.googleapis.com',
      'not a url',
    ]) {
      const response = await request(app)
        .post('/api/me/push-subscription')
        .send({ ...subscription('a'), endpoint });
      expect(response.status).toBe(400);
    }
  });

  it('deletes everything', async () => {
    const { app, deps } = testApp();
    await request(app).put('/api/me/place').send(DELHI);
    expect((await request(app).delete('/api/me')).status).toBe(204);
    expect(await deps.store.get('local-household')).toBeNull();
  });
});

describe('accounts', () => {
  it('signs up, signs in and out, with an HttpOnly Secure SameSite cookie', async () => {
    const { app } = testApp({}, AUTH_ENV);
    const registered = await request(app)
      .post('/api/auth/register')
      .send({ email: ' Asha@Example.test ', password: 'correct horse battery' });
    expect(registered.status).toBe(201);
    expect(registered.body).toEqual({ email: 'asha@example.test' });
    const [cookie = ''] = registered.headers['set-cookie'] as unknown as string[];
    expect(cookie).toMatch(
      /^__Host-vayu_session=[\w-]+\.[\w-]+; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000$/,
    );
    const session = cookie.split(';')[0] ?? '';
    expect((await request(app).get('/api/auth/session').set('cookie', session)).body).toEqual({
      signedIn: true,
      email: 'asha@example.test',
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.test', password: 'correct horse battery' });
    expect(login.status).toBe(200);
    const logout = await request(app).post('/api/auth/logout');
    expect(logout.status).toBe(204);
    expect((logout.headers['set-cookie'] as unknown as string[])[0]).toContain('Max-Age=0');
  });

  it('refuses a taken email, bad input, and wrong credentials alike', async () => {
    const { app } = testApp({}, AUTH_ENV);
    await signUp(app, 'asha@example.test');
    const again = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ASHA@example.test', password: 'another long one' });
    expect(again.status).toBe(409);
    expect(
      (await request(app).post('/api/auth/register').send({ email: 'asha', password: 'short' }))
        .status,
    ).toBe(400);
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.test', password: 'wrong password!' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.test', password: 'wrong password!' });
    const malformed = await request(app).post('/api/auth/login').send({ email: 'x' });
    for (const response of [wrongPassword, unknownEmail, malformed]) {
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('That email and password do not match an account.');
    }
  });

  it('requires a session on personal routes only', async () => {
    const { app } = testApp({}, AUTH_ENV);
    expect((await request(app).get('/api/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/me').set('cookie', '__Host-vayu_session=forged.token')).status,
    ).toBe(401);
    expect((await request(app).get('/api/me').set('cookie', 'other=1')).status).toBe(401);
    expect((await request(app).post('/api/chat').send({})).status).toBe(401);
    expect((await request(app).get('/api/auth/session')).body).toEqual({
      signedIn: false,
      email: null,
    });
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('keeps each family’s record to itself', async () => {
    const { app } = testApp({}, AUTH_ENV);
    const asha = await signUp(app, 'asha@example.test');
    const ravi = await signUp(app, 'ravi@example.test');
    await request(app).put('/api/me/place').set('cookie', asha).send(DELHI);
    expect((await request(app).get('/api/me').set('cookie', asha)).body.place).toEqual(DELHI);
    expect((await request(app).get('/api/me').set('cookie', ravi)).body.place).toBeNull();
  });

  it('deletes the account with the data, which ends its sessions and frees the email', async () => {
    const { app, deps } = testApp({}, AUTH_ENV);
    const asha = await signUp(app, 'asha@example.test');
    await request(app).put('/api/me/place').set('cookie', asha).send(DELHI);
    const deleted = await request(app).delete('/api/me').set('cookie', asha);
    expect(deleted.status).toBe(204);
    expect((deleted.headers['set-cookie'] as unknown as string[])[0]).toContain('Max-Age=0');
    expect((await request(app).get('/api/me').set('cookie', asha)).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'asha@example.test', password: 'correct horse battery' })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/register')
          .send({ email: 'asha@example.test', password: 'a new password' })
      ).status,
    ).toBe(201);
    expect(deps.accounts).not.toBeNull();
  });

  it('sends one fixed, strict CSP and opener policy', async () => {
    const page = await request(testApp().app).get('/');
    expect(page.headers['content-security-policy']).toBe(APP_CSP);
    expect(page.headers['content-security-policy']).toContain("frame-src 'none'");
    expect(page.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(page.headers['permissions-policy']).toContain('geolocation=(self)');
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
    expect(preflight.headers['access-control-allow-headers']).toBe('Content-Type');
  });

  it('classifies framework errors', () => {
    expect(describeBodyError(null)).toBeUndefined();
    expect(describeBodyError({ status: 404 })).toEqual({ status: 404, message: 'Not found.' });
    expect(describeBodyError({ type: 'other', status: 500 })).toBeUndefined();
  });
});
