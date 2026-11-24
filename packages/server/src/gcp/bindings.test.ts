/** Tests of firestoreCollection, webPushMessenger and oidcSchedulerVerifier. */
import type { CollectionReference } from '@google-cloud/firestore';
import type { OAuth2Client } from 'google-auth-library';
import { describe, expect, it, vi } from 'vitest';
import { AlreadyExistsError } from '../store/user-store.js';
import { subscription } from '../test-utils/app.js';
import { firestoreCollection, oidcSchedulerVerifier, webPushMessenger } from './bindings.js';

describe('firestoreCollection', () => {
  it('maps document operations onto the collection', async () => {
    const document = {
      get: vi.fn(() => Promise.resolve({ data: () => ({ a: 1 }) })),
      set: vi.fn(() => Promise.resolve()),
      create: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    };
    const query = { get: () => Promise.resolve({ docs: [{ id: 'u1', data: () => ({ b: 2 }) }] }) };
    const collection = { doc: vi.fn(() => document), where: vi.fn(() => query) };
    const adapter = firestoreCollection(collection as unknown as CollectionReference);
    expect(await adapter.get('u1')).toEqual({ a: 1 });
    await adapter.set('u1', { a: 2 });
    await adapter.create('u2', { a: 3 });
    await adapter.delete('u1');
    expect(document.set).toHaveBeenCalledWith({ a: 2 });
    expect(document.create).toHaveBeenCalledWith({ a: 3 });
    expect(document.delete).toHaveBeenCalled();
    expect(await adapter.whereEquals('alerts.enabled', true)).toEqual([
      { id: 'u1', data: { b: 2 } },
    ]);
    expect(collection.where).toHaveBeenCalledWith('alerts.enabled', '==', true);
  });
});

describe('firestoreCollection', () => {
  it('turns "already exists" into AlreadyExistsError and passes other failures on', async () => {
    const failing = (error: Error) =>
      firestoreCollection({
        doc: () => ({ create: () => Promise.reject(error) }),
      } as unknown as CollectionReference);
    await expect(
      failing(Object.assign(new Error('exists'), { code: 6 })).create('x', {}),
    ).rejects.toBeInstanceOf(AlreadyExistsError);
    await expect(failing(new Error('unavailable')).create('x', {})).rejects.toThrow('unavailable');
  });
});

describe('webPushMessenger', () => {
  const settings = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:a@b.test' };

  it('sends an encrypted JSON payload to each device and reports the gone ones', async () => {
    const calls: unknown[][] = [];
    const sendNotification = (...args: unknown[]) => {
      calls.push(args);
      const name = (args[0] as { endpoint: string }).endpoint.split('/').at(-1);
      if (name === 'gone') {
        return Promise.reject(Object.assign(new Error('Gone'), { statusCode: 410 }));
      }
      if (name === 'busy') {
        return Promise.reject(Object.assign(new Error('Busy'), { statusCode: 503 }));
      }
      return Promise.resolve({ statusCode: 201, body: '', headers: {} });
    };
    const messenger = webPushMessenger({ sendNotification }, settings);
    const devices = [subscription('ok'), subscription('gone'), subscription('busy')];
    const result = await messenger.send(devices, { title: 'T', body: 'B' });
    expect(result.staleEndpoints).toEqual([subscription('gone').endpoint]);
    expect(calls[0]).toEqual([
      subscription('ok'),
      '{"title":"T","body":"B"}',
      { vapidDetails: settings, TTL: 21_600, urgency: 'high' },
    ]);
  });
});

describe('oidcSchedulerVerifier', () => {
  const settings = { audience: 'https://vayu.test', serviceAccountEmail: 'scheduler@p.iam' };
  const calls: unknown[] = [];
  const client = (payload: unknown) =>
    ({
      verifyIdToken: (options: unknown) => {
        calls.push(options);
        return payload instanceof Error
          ? Promise.reject(payload)
          : Promise.resolve({ getPayload: () => payload });
      },
    }) as unknown as OAuth2Client;
  const verify = (payload: unknown) => oidcSchedulerVerifier(client(payload), settings)('t');

  it('accepts only the scheduler account with a verified email, for our audience', async () => {
    expect(await verify({ email: 'scheduler@p.iam', email_verified: true })).toBe(true);
    expect(calls.at(-1)).toEqual({ idToken: 't', audience: 'https://vayu.test' });
    expect(await verify({ email: 'other@p.iam', email_verified: true })).toBe(false);
    expect(await verify({ email: 'scheduler@p.iam' })).toBe(false);
    expect(await verify(undefined)).toBe(false);
    expect(await verify(new Error('expired'))).toBe(false);
  });
});
