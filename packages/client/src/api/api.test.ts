import { EMPTY_MEMORY } from '@vayu/core';
import { describe, expect, it, vi } from 'vitest';
import { installFakeServer } from '../test-utils/fake-server.js';
import { DELHI, PASSWORD_CONFIG } from '../test-utils/fixtures.js';
import { createApi } from './api.js';
import { fetchConfig, fetchSession, readConfig, readSession, signIn, signOut } from './config.js';
import { ApiError, expectShape, requestJson } from './http.js';

const api = createApi();
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/x',
  keys: { p256dh: 'p', auth: 'a' },
};

describe('requestJson', () => {
  it('sends same-origin credentials and JSON, and reads 204 as null', async () => {
    const server = installFakeServer();
    await api.saveMemory(EMPTY_MEMORY);
    expect(server.requests.at(-1)).toMatchObject({
      method: 'PUT',
      credentials: 'same-origin',
      body: EMPTY_MEMORY,
    });
    await api.deleteEverything();
    expect(server.requests.at(-1)?.method).toBe('DELETE');
  });

  it('turns network failures and error answers into readable errors', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/me', 'network');
    await expect(api.me()).rejects.toThrow('We could not reach Vayu Mitra');
    server.failures.set('GET /api/me', 503);
    await expect(api.me()).rejects.toMatchObject({ message: 'Failed with 503.', status: 503 });
  });

  it('falls back to a generic message when the error body is not usable', async () => {
    const answer = (body: string) => {
      vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: 500 })));
      return requestJson('/api/x');
    };
    await expect(answer('not json')).rejects.toThrow('Something went wrong');
    await expect(answer('{"error":7}')).rejects.toThrow('Something went wrong');
    await expect(answer('null')).rejects.toThrow('Something went wrong');
  });

  it('refuses answers of the wrong shape', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"places":"no"}', { status: 200 })));
    await expect(api.searchPlaces('x')).rejects.toThrow('The place search came back incomplete');
    expect(() => expectShape({ safeParse: () => ({ success: false }) }, 1, 'thing')).toThrow(
      ApiError,
    );
  });
});

describe('createApi', () => {
  it('calls every route the app uses', async () => {
    const server = installFakeServer();
    expect(await api.searchPlaces('Delhi')).toEqual([DELHI]);
    expect((await api.air(DELHI)).station?.name).toBe('ITO, Delhi - CPCB');
    expect((await api.savePlace(DELHI)).place).toEqual(DELHI);
    expect((await api.addPushSubscription(subscription)).pushEnabled).toBe(true);
    expect(server.requests.at(-1)?.body).toEqual(subscription);
    expect((await api.removePushSubscription(subscription.endpoint)).pushEnabled).toBe(false);
    expect(server.requests.at(-1)?.body).toEqual({ endpoint: subscription.endpoint });
    expect((await api.saveAlerts(server.household.alerts)).alerts).toEqual(server.household.alerts);
    expect((await api.chat({ message: 'walk?', place: DELHI, history: [] })).advice?.activity).toBe(
      'walk',
    );
  });
});

describe('config and accounts', () => {
  it('reads the config and the session', async () => {
    installFakeServer({ config: PASSWORD_CONFIG });
    expect(await fetchConfig()).toEqual(PASSWORD_CONFIG);
    expect(await fetchSession()).toEqual({ signedIn: false, email: null });
    expect(readConfig({ auth: 'none', vapidKey: null }).auth).toBe('none');
    expect(readSession({ signedIn: true, email: 'a@b.test' }).email).toBe('a@b.test');
  });

  it('signs up, signs out, signs in, and reports a wrong password', async () => {
    const server = installFakeServer({ config: PASSWORD_CONFIG });
    expect(await signIn('register', 'a@b.test', 'long password')).toEqual({ email: 'a@b.test' });
    await signOut();
    expect(server.email).toBeNull();
    await expect(signIn('login', 'a@b.test', 'wrong password')).rejects.toThrow('do not match');
    expect((await signIn('login', 'a@b.test', 'long password')).email).toBe('a@b.test');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('null', { status: 200 })));
    await expect(signIn('login', 'a@b.test', 'long password')).rejects.toThrow(
      'sign-in came back incomplete',
    );
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 200 })));
    await expect(signIn('login', 'a@b.test', 'long password')).rejects.toThrow(
      'sign-in came back incomplete',
    );
  });

  it('refuses malformed config and session answers', () => {
    for (const bad of [
      null,
      'config',
      { auth: 'magic', vapidKey: null },
      { auth: 'none', vapidKey: 3 },
    ]) {
      expect(() => readConfig(bad)).toThrow('app settings came back incomplete');
    }
    for (const bad of [null, { signedIn: 'yes', email: null }, { signedIn: true, email: 3 }]) {
      expect(() => readSession(bad)).toThrow('sign-in status came back incomplete');
    }
  });
});
