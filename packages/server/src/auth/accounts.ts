/** Email-and-password accounts in two collections, with each email unique. */
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AlreadyExistsError, type DocumentCollection } from '../store/user-store.js';
import { decoyHash, hashPassword, verifyPassword } from './passwords.js';

/** One account. The email is kept only to sign in with; nothing is sent to it. */
const accountSchema = z.object({
  email: z.string(),
  passwordHash: z.string(),
  /** Bumped to end every session at once. */
  sessionVersion: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

/** The emails index's documents: which account an email belongs to. */
const emailEntrySchema = z.object({ uid: z.string() });

/** Emails are compared lower-cased and trimmed. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** The index key for an email: a hash, so the index never lists addresses in its ids. */
export const emailKey = (email: string): string =>
  createHash('sha256').update(normalizeEmail(email)).digest('hex');

/** A signed-in account as the rest of the server sees it. */
export interface AccountSession {
  readonly uid: string;
  readonly email: string;
  readonly version: number;
}

/** The two collections accounts live in. */
export interface AccountCollections {
  readonly accounts: DocumentCollection;
  readonly emails: DocumentCollection;
}

/** What every account operation works with: the collections, the clock and an id source. */
interface Context extends AccountCollections {
  readonly now: () => Date;
  readonly newId: () => string;
}

/** The stored account, or null when it is missing or does not parse. */
async function readAccount({ accounts }: Context, uid: string) {
  const parsed = accountSchema.safeParse(await accounts.get(uid));
  return parsed.success ? parsed.data : null;
}

/** A new account, or `taken` when the email is in use. */
async function register(
  context: Context,
  email: string,
  password: string,
): Promise<AccountSession | 'taken'> {
  const uid = context.newId();
  const passwordHash = await hashPassword(password);
  try {
    await context.emails.create(emailKey(email), { uid });
  } catch (cause) {
    if (cause instanceof AlreadyExistsError) return 'taken';
    throw cause;
  }
  const record = {
    email: normalizeEmail(email),
    passwordHash,
    sessionVersion: 0,
    createdAt: context.now().toISOString(),
  };
  await context.accounts.set(uid, record);
  return { uid, email: record.email, version: 0 };
}

/** The account for a correct email and password, or null; the same time either way. */
async function authenticate(
  context: Context,
  email: string,
  password: string,
): Promise<AccountSession | null> {
  const entry = emailEntrySchema.safeParse(await context.emails.get(emailKey(email)));
  const found = entry.success ? await readAccount(context, entry.data.uid) : null;
  const matches = await verifyPassword(password, found?.passwordHash ?? (await decoyHash));
  return found !== null && entry.success && matches
    ? { uid: entry.data.uid, email: found.email, version: found.sessionVersion }
    : null;
}

/** The account a session belongs to, if it still exists and the session is current. */
async function session(context: Context, uid: string, version: number) {
  const found = await readAccount(context, uid);
  return found !== null && found.sessionVersion === version
    ? { uid, email: found.email, version }
    : null;
}

/** Removes the account and its email, which ends every session. */
async function remove(context: Context, uid: string): Promise<void> {
  const found = await readAccount(context, uid);
  if (found !== null) await context.emails.delete(emailKey(found.email));
  await context.accounts.delete(uid);
}

/**
 * Accounts in two collections: `accounts/{uid}` and an index
 * `account-emails/{sha256(email)}` whose create-if-absent makes each email
 * unique even when two sign-ups race.
 */
export function createAccountStore(
  collections: AccountCollections,
  now: () => Date,
  newId: () => string = randomUUID,
) {
  const context: Context = { ...collections, now, newId };
  return {
    register: (email: string, password: string) => register(context, email, password),
    authenticate: (email: string, password: string) => authenticate(context, email, password),
    session: (uid: string, version: number): Promise<AccountSession | null> =>
      session(context, uid, version),
    delete: (uid: string) => remove(context, uid),
  };
}

/** The account operations the routes use. */
export type AccountStore = ReturnType<typeof createAccountStore>;
