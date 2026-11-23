import { EMPTY_MEMORY } from '@vayu/core';
import { describe, expect, it, vi } from 'vitest';
import { installFakeServer } from '../test-utils/fake-server.js';
import { DELHI, FIREBASE_CONFIG } from '../test-utils/fixtures.js';
import { createApi } from './api.js';
import { fetchConfig, readConfig } from './config.js';
import { ApiError, expectShape, requestJson } from './http.js';

const withToken = createApi(() => Promise.resolve('id-token'));

describe('requestJson', () => {
  it('sends the token and JSON, and reads 204 as null', async () => {
    const server = installFakeServer();
    await withToken.saveMemory(EMPTY_MEMORY);
    expect(server.requests.at(-1)).toMatchObject({
      method: 'PUT',
      auth: 'Bearer id-token',
      body: EMPTY_MEMORY,
    });
    await withToken.deleteEverything();
    expect(server.requests.at(-1)?.method).toBe('DELETE');
  });

  it('turns network failures and error answers into readable errors', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/me', 'network');
    await expect(withToken.me()).rejects.toThrow('We could not reach Vayu Mitra');
    server.failures.set('GET /api/me', 503);
    await expect(withToken.me()).rejects.toMatchObject({
      message: 'Failed with 503.',
      status: 503,
    });
  });

  it('falls back to a generic message when the error body is not usable', async () => {
    const answer = (body: string) => {
      vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: 500 })));
      return requestJson('/api/x', () => Promise.resolve(null));
    };
    await expect(answer('not json')).rejects.toThrow('Something went wrong');
    await expect(answer('{"error":7}')).rejects.toThrow('Something went wrong');
  });

  it('refuses answers of the wrong shape', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{"places":"no"}', { status: 200 })));
    await expect(withToken.searchPlaces('x')).rejects.toThrow(
      'The place search came back incomplete',
    );
    expect(() => expectShape({ safeParse: () => ({ success: false }) }, 1, 'thing')).toThrow(
      ApiError,
    );
  });
});

describe('createApi', () => {
  it('calls every route the app uses', async () => {
    const server = installFakeServer();
    expect(await withToken.searchPlaces('Delhi')).toEqual([DELHI]);
    expect((await withToken.air(DELHI)).station?.name).toBe('ITO, Delhi - CPCB');
    expect((await withToken.savePlace(DELHI)).place).toEqual(DELHI);
    expect((await withToken.addPushId('fid')).pushEnabled).toBe(true);
    expect((await withToken.removePushId('fid')).pushEnabled).toBe(false);
    expect((await withToken.saveAlerts(server.household.alerts)).alerts).toEqual(
      server.household.alerts,
    );
    expect(
      (await withToken.chat({ message: 'walk?', place: DELHI, history: [] })).advice?.activity,
    ).toBe('walk');
    expect(server.requests.find((request) => request.path === '/api/air')?.auth).toBeNull();
  });
});

describe('readConfig', () => {
  it('accepts both modes', async () => {
    installFakeServer({ config: FIREBASE_CONFIG });
    expect(await fetchConfig()).toEqual(FIREBASE_CONFIG);
    expect(readConfig({ auth: 'none', firebase: null, vapidKey: null }).auth).toBe('none');
  });

  it('refuses anything else', () => {
    for (const bad of [
      null,
      'config',
      { auth: 'magic', firebase: null, vapidKey: null },
      { auth: 'none', firebase: { apiKey: 1 }, vapidKey: null },
      { auth: 'none', firebase: 'x', vapidKey: null },
      { auth: 'none', firebase: null, vapidKey: 3 },
    ]) {
      expect(() => readConfig(bad)).toThrow('app settings came back incomplete');
    }
  });
});
