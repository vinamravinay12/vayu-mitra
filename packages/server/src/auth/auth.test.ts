import { describe, expect, it } from 'vitest';
import { createMemoryCollection } from '../store/user-store.js';
import { NOW } from '../test-utils/fake-llm.js';
import { createAccountStore, emailKey, normalizeEmail } from './accounts.js';
import { decoyHash, hashPassword, SCRYPT, verifyPassword } from './passwords.js';
import {
  clearSessionCookie,
  createSessions,
  SESSION_COOKIE,
  sessionCookie,
  setSessionCookie,
} from './sessions.js';
import { SECRET, signed } from './auth.fixtures.js';

describe('passwords', () => {
  it('hashes with a fresh salt and verifies only the right password', async () => {
    const first = await hashPassword('correct horse battery');
    const second = await hashPassword('correct horse battery');
    expect(first.startsWith(`scrypt$${String(SCRYPT.N)}$8$1$`)).toBe(true);
    expect(first.split('$')).toHaveLength(6);
    expect(first).not.toBe(second);
    expect(await verifyPassword('correct horse battery', first)).toBe(true);
    expect(await verifyPassword('correct horse batterY', first)).toBe(false);
  });

  it('treats equivalent Unicode spellings alike and never matches a malformed hash', async () => {
    const hash = await hashPassword('café-password');
    expect(await verifyPassword('café-password', hash)).toBe(true);
    expect(await verifyPassword('x', 'bcrypt$whatever')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$1')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$3$8$1$c2FsdA$aGFzaA')).toBe(false);
    expect(await verifyPassword('anything', await decoyHash)).toBe(false);
  });
});

describe('sessions', () => {
  it('round-trips claims and rejects edits, other keys and expiry', () => {
    const sessions = createSessions(SECRET, NOW);
    const token = sessions.issue('u1', 2);
    expect(sessions.read(token)).toMatchObject({ uid: 'u1', v: 2 });
    const [payload = '', signature = ''] = token.split('.');
    const edited = Buffer.from(JSON.stringify({ uid: 'u2', v: 2, exp: 9e15 })).toString(
      'base64url',
    );
    expect(sessions.read(`${edited}.${signature}`)).toBeNull();
    expect(sessions.read(`${payload}.short`)).toBeNull();
    expect(sessions.read('no-dot')).toBeNull();
    expect(createSessions(`${SECRET}-other`, NOW).read(token)).toBeNull();
    const later = () => new Date('2026-12-23T00:00:00Z');
    expect(createSessions(SECRET, later).read(token)).toBeNull();
  });

  it('refuses a validly signed token whose claims do not parse', () => {
    const sessions = createSessions(SECRET, NOW);
    expect(sessions.read(signed(Buffer.from('not json').toString('base64url')))).toBeNull();
    expect(sessions.read(signed(Buffer.from('{"uid":1}').toString('base64url')))).toBeNull();
  });

  it('reads and writes the cookie', () => {
    expect(sessionCookie(`a=1; ${SESSION_COOKIE}=abc.def; b=2`)).toBe('abc.def');
    expect(sessionCookie(`${SESSION_COOKIE}=`)).toBeNull();
    expect(sessionCookie(`${SESSION_COOKIE}=${'x'.repeat(2000)}`)).toBeNull();
    expect(sessionCookie(undefined)).toBeNull();
    expect(setSessionCookie('t')).toContain('HttpOnly; Secure; SameSite=Strict');
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('account store', () => {
  const store = () =>
    createAccountStore(
      { accounts: createMemoryCollection(), emails: createMemoryCollection() },
      NOW,
      () => 'u1',
    );
  it('registers once per email, case-insensitively', async () => {
    const accounts = store();
    expect(await accounts.register('Asha@Example.test', 'correct horse battery')).toEqual({
      uid: 'u1',
      email: 'asha@example.test',
      version: 0,
    });
    expect(await accounts.register('asha@example.TEST ', 'another password')).toBe('taken');
    expect(normalizeEmail(' A@B.C ')).toBe('a@b.c');
    expect(emailKey('A@b.c')).toBe(emailKey('a@B.c '));
  });
});
