import { createHash } from 'node:crypto';

interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  readonly size: number;
}

/**
 * A bounded, expiring, least-recently-used cache held in memory.
 *
 * Model calls are the slowest and most expensive thing the server does, and the
 * same description is often submitted twice (a double click, a retry after a
 * network blip). Map iteration order is insertion order, so re-inserting on read
 * makes the first key the least recently used one.
 */
export function createTtlCache<V>(
  maxEntries: number,
  ttlMs: number,
  now: () => number = Date.now,
): TtlCache<V> {
  const entries = new Map<string, Entry<V>>();
  return {
    get: (key) => readFresh(entries, key, now()),
    set(key, value) {
      makeRoom(entries, key, maxEntries);
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
    delete(key) {
      entries.delete(key);
    },
    get size() {
      return entries.size;
    },
  };
}

/** The value if present and fresh, moved to the most-recently-used end; expired entries are dropped. */
function readFresh<V>(entries: Map<string, Entry<V>>, key: string, at: number): V | undefined {
  const entry = entries.get(key);
  if (entry === undefined) {
    return undefined;
  }
  entries.delete(key);
  if (entry.expiresAt <= at) {
    return undefined;
  }
  entries.set(key, entry);
  return entry.value;
}

/** Removes the key (it is about to be re-added) and, when full, the least recently used entry. */
function makeRoom<V>(entries: Map<string, Entry<V>>, key: string, maxEntries: number): void {
  entries.delete(key);
  if (entries.size >= maxEntries) {
    const oldest = entries.keys().next();
    if (oldest.done !== true) {
      entries.delete(oldest.value);
    }
  }
}

/** A fixed-length key that never stores the user's text in memory as-is. */
export const cacheKey = (...parts: readonly unknown[]): string =>
  createHash('sha256').update(JSON.stringify(parts)).digest('base64url');
