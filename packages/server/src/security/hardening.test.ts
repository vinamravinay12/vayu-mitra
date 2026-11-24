import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { refusalFor } from './admission.js';
import { testApp } from '../test-utils/app.js';
import { CHAT } from './hardening.fixtures.js';

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
});

describe('admission of writes', () => {
  const { app } = testApp({}, { ALLOWED_ORIGIN: 'https://partner.example.test' });
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
});

describe('admission of writes', () => {
  const { app } = testApp({}, { ALLOWED_ORIGIN: 'https://partner.example.test' });
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
