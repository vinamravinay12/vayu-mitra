import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AUTH_ENV, signUp, testApp } from './test-utils/app.js';
import { DELHI } from './test-utils/deps.js';

describe('accounts', () => {
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
});

describe('accounts', () => {
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
});

describe('accounts', () => {
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
});
