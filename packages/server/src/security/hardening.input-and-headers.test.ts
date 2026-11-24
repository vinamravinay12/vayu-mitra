/** Tests of strict request schemas, invisible characters and browser hardening headers. */
import { EMPTY_MEMORY } from '@vayu/core';
import request from 'supertest';
import { expect, it } from 'vitest';
import { stripInvisible } from '../guard/strip-invisible.js';
import { testApp } from '../test-utils/app.js';
import { DELHI } from '../test-utils/deps.js';
import { CHAT } from './hardening.fixtures.js';

const { app } = testApp();

it('strict request schemas: refuse fields the server does not know', async () => {
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

it('invisible characters: are removed before the model or any check reads the text', () => {
  expect(stripInvisible('wa\u200Blk\u202E at 6\uFEFF\u{E0041}')).toBe('walk at 6');
  expect(stripInvisible('दादी walk')).toBe('दादी walk');
});

it('invisible characters: leave a message of nothing but invisible characters empty, which is refused', async () => {
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

it('browser hardening headers: isolates the page, forbids HTML sinks and switches off unused features', async () => {
  const page = await request(testApp().app).get('/');
  expect(page.headers['content-security-policy']).toContain(
    "require-trusted-types-for 'script'; trusted-types vayu-push-worker",
  );
  expect(page.headers['cross-origin-embedder-policy']).toBe('require-corp');
  expect(page.headers['strict-transport-security']).toContain('preload');
  const features = String(page.headers['permissions-policy']).split(', ');
  expect(features).toHaveLength(18);
  expect(features.filter((feature) => !feature.endsWith('=()'))).toEqual(['geolocation=(self)']);
});
