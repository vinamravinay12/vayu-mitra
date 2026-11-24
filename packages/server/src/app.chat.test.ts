/** Tests of accounts, POST /api/chat, POST /api/internal/check-alerts and errors and static files. */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UpstreamError } from './air/fetch-json.js';
import { APP_CSP } from './security/security-headers.js';
import { testApp } from './test-utils/app.js';
import { DELHI } from './test-utils/deps.js';
import { failingAir } from './app.fixtures.js';

describe('accounts', () => {
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
});

describe('POST /api/chat', () => {
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
});
