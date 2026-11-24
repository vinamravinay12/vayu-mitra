import { EMPTY_MEMORY } from '@vayu/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { stripInvisible } from '../guard/strip-invisible.js';
import { refusalFor } from './admission.js';
import { testApp } from '../test-utils/app.js';
import { DELHI } from '../test-utils/deps.js';

const CHAT = { message: 'Can I go for a walk?', place: DELHI, history: [] };

describe('admission of writes', () => {
  const { app } = testApp({}, { ALLOWED_ORIGIN: 'https://partner.example.test' });

  it('refuses writes another site starts', async () => {
    const crossSite = await request(app)
      .post('/api/chat')
      .set('sec-fetch-site', 'cross-site')
      .send(CHAT);
    expect(crossSite.status).toBe(403);
    expect(crossSite.body).toEqual({ error: 'Requests from other sites are not accepted.' });
    const foreignOrigin = await request(app)
      .post('/api/chat')
      .set('origin', 'https://evil.example.test')
      .send(CHAT);
    expect(foreignOrigin.status).toBe(403);
    const nullOrigin = await request(app).post('/api/chat').set('origin', 'null').send(CHAT);
    expect(nullOrigin.status).toBe(403);
  });

  it('admits our own pages, the one allowed origin, and clients that send neither header', async () => {
    const own = await request(app)
      .post('/api/chat')
      .set('sec-fetch-site', 'same-origin')
      .set('host', 'vayu.example.test')
      .set('origin', 'http://vayu.example.test')
      .send(CHAT);
    expect(own.status).toBe(200);
    const typed = await request(app).post('/api/chat').set('sec-fetch-site', 'none').send(CHAT);
    expect(typed.status).toBe(200);
    const partner = await request(app)
      .post('/api/chat')
      .set('origin', 'https://partner.example.test')
      .send(CHAT);
    expect(partner.status).toBe(200);
    expect((await request(app).post('/api/chat').send(CHAT)).status).toBe(200);
  });

  it('accepts only JSON bodies, and bodiless writes and reads as they are', async () => {
    const form = await request(app)
      .post('/api/chat')
      .set('content-type', 'application/x-www-form-urlencoded')
      .send('message=hi');
    expect(form.status).toBe(415);
    expect(form.body).toEqual({ error: 'Send the request as JSON.' });
    expect((await request(app).delete('/api/me')).status).toBe(204);
    const crossSiteRead = await request(app).get('/api/health').set('sec-fetch-site', 'cross-site');
    expect(crossSiteRead.status).toBe(200);
  });
});

describe('refusalFor', () => {
  /** A request-shaped object with the given headers; `is` answers as Express does. */
  const fake = (headers: Record<string, string>) =>
    ({
      protocol: 'https',
      get: (name: string) => headers[name],
      is: (type: string) => (headers['content-type'] === type ? type : false),
    }) as unknown as Parameters<typeof refusalFor>[0];

  it('judges a chunked body by its type, and a body without a host header against an empty origin', () => {
    expect(
      refusalFor(
        fake({ 'transfer-encoding': 'chunked', 'content-type': 'text/plain' }),
        'same-origin',
      ),
    ).toMatchObject({ status: 415 });
    expect(
      refusalFor(
        fake({ 'transfer-encoding': 'chunked', 'content-type': 'application/json' }),
        'same-origin',
      ),
    ).toBeNull();
    expect(refusalFor(fake({ origin: 'https://' }), 'same-origin')).toBeNull();
  });
});

describe('strict request schemas', () => {
  const { app } = testApp();

  it('refuse fields the server does not know', async () => {
    expect(
      (
        await request(app)
          .post('/api/chat')
          .send({ ...CHAT, admin: true })
      ).status,
    ).toBe(400);
    const place = { ...DELHI, trusted: true };
    expect((await request(app).put('/api/me/place').send(place)).status).toBe(400);
    const memory = { ...EMPTY_MEMORY, extra: [] };
    expect((await request(app).put('/api/me/memory').send(memory)).status).toBe(400);
  });
});

describe('invisible characters', () => {
  it('are removed before the model or any check reads the text', () => {
    expect(stripInvisible('wa\u200Blk\u202E at 6\uFEFF\u{E0041}')).toBe('walk at 6');
    expect(stripInvisible('दादी walk')).toBe('दादी walk');
  });

  it('leave a message of nothing but invisible characters empty, which is refused', async () => {
    const { app } = testApp();
    const hidden = { ...CHAT, message: '\u200B\u200C\u2060' };
    expect((await request(app).post('/api/chat').send(hidden)).status).toBe(400);
    const marked = {
      ...CHAT,
      message: 'Can I go for a \u200Bwalk?',
      history: [{ role: 'user' as const, text: 'earlier\u202E question' }],
    };
    const reply = await request(app).post('/api/chat').send(marked);
    expect(reply.body.advice.activity).toBe('walk');
  });
});

describe('browser hardening headers', () => {
  it('isolates the page, forbids HTML sinks and switches off unused features', async () => {
    const page = await request(testApp().app).get('/');
    expect(page.headers['content-security-policy']).toContain(
      "require-trusted-types-for 'script'; trusted-types 'none'",
    );
    expect(page.headers['cross-origin-embedder-policy']).toBe('require-corp');
    expect(page.headers['strict-transport-security']).toContain('preload');
    const features = String(page.headers['permissions-policy']).split(', ');
    expect(features).toHaveLength(19);
    expect(features.filter((feature) => !feature.endsWith('=()'))).toEqual(['geolocation=(self)']);
  });
});
