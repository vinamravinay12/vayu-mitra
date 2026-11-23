import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIREBASE_WEB } from '../test-utils/fixtures.js';
import { localAuth } from './auth.js';
import { loadFirebaseAuth } from './firebase-auth.js';

const firebaseAuth = vi.hoisted(() => {
  const state = { currentUser: null as null | { getIdToken: () => Promise<string> } };
  return {
    state,
    getAuth: vi.fn(() => state),
    onAuthStateChanged: vi.fn((_auth: unknown, listener: (user: unknown) => void) => {
      listener({ uid: 'u1', displayName: 'Asha' });
      listener(null);
      return () => undefined;
    }),
    signInWithPopup: vi.fn(() => Promise.resolve({})),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(),
  };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn((config: unknown) => ({ config })) }));
vi.mock('firebase/auth', () => firebaseAuth);

describe('localAuth', () => {
  it('is always the local household, with no token', async () => {
    const listener = vi.fn();
    localAuth.onChange(listener)();
    expect(listener).toHaveBeenCalledWith({ uid: 'local-household', name: null });
    await localAuth.signIn();
    await localAuth.signOut();
    expect(await localAuth.token()).toBeNull();
  });
});

describe('loadFirebaseAuth', () => {
  beforeEach(() => {
    firebaseAuth.state.currentUser = null;
  });

  it('wraps Firebase Auth with Google sign-in', async () => {
    const { app, auth } = await loadFirebaseAuth(FIREBASE_WEB);
    expect(app).toEqual({ config: FIREBASE_WEB });
    const users: unknown[] = [];
    auth.onChange((user) => users.push(user));
    expect(users).toEqual([{ uid: 'u1', name: 'Asha' }, null]);
    await auth.signIn();
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
    await auth.signOut();
    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(await auth.token()).toBeNull();
    firebaseAuth.state.currentUser = { getIdToken: () => Promise.resolve('id-token') };
    expect(await auth.token()).toBe('id-token');
  });
});
