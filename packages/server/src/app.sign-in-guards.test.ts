/** Tests of the sign-in guards: the per-account throttle and signing out on the server. */
import request from 'supertest';
import { expect, it } from 'vitest';
import { AUTH_ENV, signUp, testApp } from './test-utils/app.js';

/** One sign-in attempt for Asha. */
const login = (app: Parameters<typeof request>[0], password: string) =>
  request(app).post('/api/auth/login').send({ email: 'asha@example.test', password });

it('sign-in guards: locks an account after five wrong passwords, even for the right one', async () => {
  const { app } = testApp({}, { ...AUTH_ENV, AUTH_REQUESTS_PER_MINUTE: '100' });
  await signUp(app, 'asha@example.test');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    expect((await login(app, 'wrong password!')).status).toBe(401);
  }
  const locked = await login(app, 'correct horse battery');
  expect(locked.status).toBe(429);
  expect(locked.body.error).toBe(
    'Too many wrong passwords for this account. Try again in 15 minutes.',
  );
  await signUp(app, 'ravi@example.test');
  const other = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ravi@example.test', password: 'correct horse battery' });
  expect(other.status).toBe(200);
});

it('sign-in guards: a correct password clears the wrong ones before it', async () => {
  const { app } = testApp({}, { ...AUTH_ENV, AUTH_REQUESTS_PER_MINUTE: '100' });
  await signUp(app, 'asha@example.test');
  for (let attempt = 0; attempt < 4; attempt += 1) await login(app, 'wrong password!');
  expect((await login(app, 'correct horse battery')).status).toBe(200);
  for (let attempt = 0; attempt < 4; attempt += 1) await login(app, 'wrong password!');
  expect((await login(app, 'correct horse battery')).status).toBe(200);
});

it('sign-in guards: signing out ends the session on the server, so a copied cookie stops working', async () => {
  const { app } = testApp({}, AUTH_ENV);
  const asha = await signUp(app, 'asha@example.test');
  expect((await request(app).get('/api/me').set('cookie', asha)).status).toBe(200);
  expect((await request(app).post('/api/auth/logout').set('cookie', asha)).status).toBe(204);
  expect((await request(app).get('/api/me').set('cookie', asha)).status).toBe(401);
  const again = await login(app, 'correct horse battery');
  const cookie = ((again.headers['set-cookie'] as unknown as string[])[0] ?? '').split(';')[0];
  expect(
    (
      await request(app)
        .get('/api/me')
        .set('cookie', cookie ?? '')
    ).status,
  ).toBe(200);
});
