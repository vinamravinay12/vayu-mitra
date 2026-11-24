import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Password hashing with scrypt, which is memory-hard: guessing at scale needs
 * memory, not just cores. Parameters are stored with each hash, so they can be
 * raised later without breaking existing accounts.
 */
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keyLength: 32, saltLength: 16 } as const;

/** scrypt needs 128 · N · r bytes; allow that plus headroom. */
const MAX_MEMORY = 128 * SCRYPT.N * SCRYPT.r * 2;

/** How long a key to derive, and scrypt's cost parameters. */
interface KeySpec {
  readonly length: number;
  readonly options: ScryptOptions;
}

/**
 * The key for a password, normalised so equivalent Unicode spellings match.
 * scrypt is wrapped by hand: Node's typings omit its options overload from `promisify`.
 */
const derive = (password: string, salt: Buffer, { length, options }: KeySpec): Promise<Buffer> =>
  promisify((done: (error: Error | null, key: Buffer) => void) => {
    scrypt(password.normalize('NFKC'), salt, length, options, done);
  })();

/** `scrypt$N$r$p$salt$hash`, salt and hash base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT.saltLength);
  const { N, r, p, keyLength } = SCRYPT;
  const key = await derive(password, salt, {
    length: keyLength,
    options: { N, r, p, maxmem: MAX_MEMORY },
  });
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

/** Whether the password matches a stored hash, compared in constant time. A malformed hash never matches. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || salt === undefined || hash === undefined) {
    return false;
  }
  const expected = Buffer.from(hash, 'base64url');
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEMORY };
  try {
    const key = await derive(password, Buffer.from(salt, 'base64url'), {
      length: expected.length,
      options,
    });
    return timingSafeEqual(key, expected);
  } catch {
    // Parameters scrypt refuses (a corrupted record) are a failed sign-in, not a crash.
    return false;
  }
}

/**
 * A real hash of nothing in particular, checked when an email is unknown, so
 * a wrong email takes as long as a wrong password and cannot be told apart.
 */
export const decoyHash = hashPassword('vayu-mitra-decoy-password');
