/**
 * Substitution (Liskov) check: every DocumentCollection, the in-memory one and
 * the Firestore adapter, honours one contract, and the stores built on them
 * behave the same on either.
 */
import { describe, expect, it } from 'vitest';
import { createAccountStore } from '../auth/accounts.js';
import { firestoreCollection } from '../gcp/bindings.js';
import { fakeFirestoreCollection } from '../test-utils/fake-firestore.js';
import { NOW } from '../test-utils/fake-llm.js';
import { newUserRecord } from './user-record.js';
import {
  AlreadyExistsError,
  createMemoryCollection,
  createUserStore,
  type DocumentCollection,
} from './user-store.js';

/** Each implementation, made fresh for every test. */
const COLLECTIONS: [string, () => DocumentCollection][] = [
  ['in memory', createMemoryCollection],
  ['Firestore', () => firestoreCollection(fakeFirestoreCollection())],
];

describe.each(COLLECTIONS)('a document collection (%s)', (_name, make) => {
  it('reads back a copy of what was written, and nothing once deleted', async () => {
    const collection = make();
    expect(await collection.get('a')).toBeUndefined();
    const written = { name: 'Dadi', alerts: { enabled: true } };
    await collection.set('a', written);
    const read = await collection.get('a');
    expect(read).toEqual(written);
    expect(read).not.toBe(written);
    await collection.delete('a');
    expect(await collection.get('a')).toBeUndefined();
  });

  it('creates only when absent, and finds documents by a dotted field', async () => {
    const collection = make();
    await collection.create('a', { alerts: { enabled: true } });
    await expect(collection.create('a', {})).rejects.toBeInstanceOf(AlreadyExistsError);
    await collection.set('b', { alerts: { enabled: false } });
    expect(await collection.whereEquals('alerts.enabled', true)).toEqual([
      { id: 'a', data: { alerts: { enabled: true } } },
    ]);
  });
});

describe.each(COLLECTIONS)('the stores built on it (%s)', (_name, make) => {
  it('keep a family’s record and find those with alerts on', async () => {
    const store = createUserStore(make());
    const record = {
      ...newUserRecord(NOW()),
      alerts: { ...newUserRecord(NOW()).alerts, enabled: true },
    };
    await store.put('u1', record);
    expect(await store.get('u1')).toEqual(record);
    expect(await store.alertSubscribers()).toEqual([{ uid: 'u1', record }]);
  });

  it('register each email once and sign it in', async () => {
    const accounts = createAccountStore({ accounts: make(), emails: make() }, NOW, () => 'u1');
    expect(await accounts.register('Asha@Example.test', 'correct horse battery')).toMatchObject({
      uid: 'u1',
    });
    expect(await accounts.register('asha@example.test', 'another password!')).toBe('taken');
    expect(await accounts.authenticate('asha@example.test', 'correct horse battery')).toMatchObject(
      { email: 'asha@example.test' },
    );
  });
});
