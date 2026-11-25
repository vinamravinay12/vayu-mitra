/** Tests of account store. */
import { expect, it } from 'vitest';
import { createMemoryCollection } from '../store/user-store.js';
import { NOW } from '../test-utils/fake-llm.js';
import { createAccountStore } from './accounts.js';

const store = () =>
  createAccountStore(
    { accounts: createMemoryCollection(), emails: createMemoryCollection() },
    NOW,
    () => 'u1',
  );

it('account store: authenticates, checks session generations, and deletes', async () => {
  const accounts = store();
  await accounts.register('asha@example.test', 'correct horse battery');
  expect(await accounts.authenticate('ASHA@example.test', 'correct horse battery')).toMatchObject({
    uid: 'u1',
  });
  expect(await accounts.authenticate('asha@example.test', 'wrong password')).toBeNull();
  expect(await accounts.authenticate('nobody@example.test', 'correct horse battery')).toBeNull();
  expect(await accounts.session('u1', 0)).toMatchObject({ email: 'asha@example.test' });
  expect(await accounts.session('u1', 1)).toBeNull();
  await accounts.delete('u1');
  expect(await accounts.session('u1', 0)).toBeNull();
  await accounts.delete('u1');
});

it('account store: passes on storage failures other than a taken email', async () => {
  const emails = createMemoryCollection();
  emails.create = () => Promise.reject(new Error('firestore down'));
  const accounts = createAccountStore({ accounts: createMemoryCollection(), emails }, NOW);
  await expect(accounts.register('a@b.test', 'correct horse battery')).rejects.toThrow(
    'firestore down',
  );
});

it('account store: ending sessions moves the generation on, and ignores a missing account', async () => {
  const accounts = store();
  await accounts.register('asha@example.test', 'correct horse battery');
  await accounts.endSessions('u1');
  expect(await accounts.session('u1', 0)).toBeNull();
  expect(await accounts.session('u1', 1)).toMatchObject({ uid: 'u1' });
  await accounts.endSessions('missing');
  expect(await accounts.session('missing', 0)).toBeNull();
});
