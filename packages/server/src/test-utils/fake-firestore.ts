/** An in-memory stand-in for a Firestore collection, behaving as the SDK does for the calls the adapter makes. */
import type { CollectionReference } from '@google-cloud/firestore';

/** Firestore's status code for "document already exists". */
const ALREADY_EXISTS = 6;

/** A field read along a dotted path, as Firestore's `where` reads it. */
const atPath = (data: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined,
      data,
    );

/**
 * A collection that keeps copies, as Firestore does: what is read is never the
 * object that was written. `create` on an existing id fails with code 6.
 */
export function fakeFirestoreCollection(): CollectionReference {
  const documents = new Map<string, unknown>();
  const snapshot = (id: string) => ({ id, data: () => structuredClone(documents.get(id)) });
  const doc = (id: string) => ({
    get: () => Promise.resolve(snapshot(id)),
    set: (data: unknown) => Promise.resolve(void documents.set(id, structuredClone(data))),
    create: (data: unknown) =>
      documents.has(id)
        ? Promise.reject(Object.assign(new Error('ALREADY_EXISTS'), { code: ALREADY_EXISTS }))
        : Promise.resolve(void documents.set(id, structuredClone(data))),
    delete: () => Promise.resolve(void documents.delete(id)),
  });
  const where = (field: string, _operator: '==', value: unknown) => ({
    get: () =>
      Promise.resolve({
        docs: [...documents.keys()]
          .filter((id) => atPath(documents.get(id), field) === value)
          .map(snapshot),
      }),
  });
  return { doc, where } as unknown as CollectionReference;
}
