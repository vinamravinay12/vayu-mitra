import { EMPTY_MEMORY } from '@vayu/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AUTH_ENV, subscription, testApp } from './test-utils/app.js';
import { DELHI } from './test-utils/deps.js';

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
});

describe('the family record', () => {
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
});

describe('the family record', () => {
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
});
