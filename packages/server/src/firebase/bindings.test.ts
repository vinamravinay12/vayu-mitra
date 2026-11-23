import { initializeApp } from 'firebase-admin/app';
import type { CollectionReference } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { OAuth2Client } from 'google-auth-library';
import { describe, expect, it, vi } from 'vitest';
import {
  fcmMessenger,
  firebaseBindings,
  firebaseVerifier,
  firestoreCollection,
  oidcSchedulerVerifier,
} from './bindings.js';

describe('firestoreCollection', () => {
  it('maps document operations onto the collection', async () => {
    const document = {
      get: vi.fn(() => Promise.resolve({ data: () => ({ a: 1 }) })),
      set: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    };
    const query = {
      get: () => Promise.resolve({ docs: [{ id: 'u1', data: () => ({ b: 2 }) }] }),
    };
    const collection = { doc: vi.fn(() => document), where: vi.fn(() => query) };
    const adapter = firestoreCollection(collection as unknown as CollectionReference);
    expect(await adapter.get('u1')).toEqual({ a: 1 });
    await adapter.set('u1', { a: 2 });
    await adapter.delete('u1');
    expect(document.set).toHaveBeenCalledWith({ a: 2 });
    expect(document.delete).toHaveBeenCalled();
    expect(collection.doc).toHaveBeenCalledWith('u1');
    expect(await adapter.whereEquals('alerts.enabled', true)).toEqual([
      { id: 'u1', data: { b: 2 } },
    ]);
    expect(collection.where).toHaveBeenCalledWith('alerts.enabled', '==', true);
  });
});

describe('fcmMessenger', () => {
  it('sends data-only messages to FIDs and reports the stale ones', async () => {
    const sendEachForMulticast = vi.fn(() =>
      Promise.resolve({
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/installation-id-not-registered' } },
          { success: false, error: { code: 'messaging/internal-error' } },
        ],
      }),
    );
    const messenger = fcmMessenger({ sendEachForMulticast } as unknown as Messaging);
    const result = await messenger.send(['a', 'b', 'c'], { title: 'T', body: 'B' });
    expect(result.staleIds).toEqual(['b']);
    expect(sendEachForMulticast).toHaveBeenCalledWith({
      fids: ['a', 'b', 'c'],
      data: { title: 'T', body: 'B', url: '/' },
      webpush: { headers: { Urgency: 'high', TTL: '21600' } },
    });
  });

  it('treats a failure without a code as not stale', async () => {
    const sendEachForMulticast = () =>
      Promise.resolve({ responses: [{ success: false }], successCount: 0, failureCount: 1 });
    const fake = { sendEachForMulticast } as unknown as Messaging;
    const messenger = fcmMessenger(fake);
    expect((await messenger.send(['a'], { title: 'T', body: 'B' })).staleIds).toEqual([]);
  });
});

describe('firebaseVerifier', () => {
  it('returns the uid of a verified token and rejects otherwise', async () => {
    const verifyIdToken = vi.fn((token: string) =>
      token === 'good' ? Promise.resolve({ uid: 'u1' }) : Promise.reject(new Error('bad')),
    );
    const verify = firebaseVerifier({ verifyIdToken } as never);
    expect(await verify('good')).toEqual({ uid: 'u1' });
    await expect(verify('bad')).rejects.toThrow('bad');
  });
});

describe('oidcSchedulerVerifier', () => {
  const settings = { audience: 'https://vayu.test', serviceAccountEmail: 'scheduler@p.iam' };
  const verifyCalls: unknown[] = [];
  const client = (payload: unknown) =>
    ({
      verifyIdToken: (options: unknown) => {
        verifyCalls.push(options);
        return payload instanceof Error
          ? Promise.reject(payload)
          : Promise.resolve({ getPayload: () => payload });
      },
    }) as unknown as OAuth2Client;

  it('accepts only the scheduler account with a verified email, for our audience', async () => {
    const good = client({ email: 'scheduler@p.iam', email_verified: true });
    expect(await oidcSchedulerVerifier(good, settings)('t')).toBe(true);
    expect(verifyCalls.at(-1)).toEqual({ idToken: 't', audience: 'https://vayu.test' });
    expect(
      await oidcSchedulerVerifier(
        client({ email: 'other@p.iam', email_verified: true }),
        settings,
      )('t'),
    ).toBe(false);
    expect(await oidcSchedulerVerifier(client({ email: 'scheduler@p.iam' }), settings)('t')).toBe(
      false,
    );
    expect(await oidcSchedulerVerifier(client(undefined), settings)('t')).toBe(false);
    expect(await oidcSchedulerVerifier(client(new Error('expired')), settings)('t')).toBe(false);
  });
});

describe('firebaseBindings', () => {
  it('builds every adapter for an app without touching the network', () => {
    const bindings = firebaseBindings(initializeApp({ projectId: 'vayu-test' }, 'bindings-test'));
    expect(typeof bindings.users.get).toBe('function');
    expect(typeof bindings.messenger.send).toBe('function');
    expect(typeof bindings.verifyIdToken).toBe('function');
  });
});
