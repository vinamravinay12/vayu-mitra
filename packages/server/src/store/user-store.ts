import { describeCause, logEvent } from '../logging/log.js';
import { userRecordSchema, type UserRecord } from './user-record.js';

/** The few document operations the store needs, so Firestore and memory are interchangeable. */
export interface DocumentCollection {
  get(id: string): Promise<unknown>;
  set(id: string, data: unknown): Promise<void>;
  delete(id: string): Promise<void>;
  /** Documents whose field (a dotted path) equals the value. */
  whereEquals(field: string, value: unknown): Promise<readonly { id: string; data: unknown }[]>;
}

/** Families' records, keyed by Firebase user id. */
export interface UserStore {
  get(uid: string): Promise<UserRecord | null>;
  put(uid: string, record: UserRecord): Promise<void>;
  delete(uid: string): Promise<void>;
  /** Everyone with alerts switched on. */
  alertSubscribers(): Promise<readonly { uid: string; record: UserRecord }[]>;
}

/** A stored document that no longer fits the schema is treated as absent, and logged. */
function validate(id: string, data: unknown): UserRecord | null {
  if (data === undefined) {
    return null;
  }
  const parsed = userRecordSchema.safeParse(data);
  if (!parsed.success) {
    logEvent('WARNING', 'stored user record failed validation', {
      cause: describeCause(parsed.error),
      idLength: id.length,
    });
    return null;
  }
  return parsed.data;
}

/** Validates everything read back, so the rest of the server can trust it. */
export function createUserStore(collection: DocumentCollection): UserStore {
  return {
    async get(uid) {
      return validate(uid, await collection.get(uid));
    },
    async put(uid, record) {
      await collection.set(uid, userRecordSchema.parse(record));
    },
    delete: (uid) => collection.delete(uid),
    async alertSubscribers() {
      const documents = await collection.whereEquals('alerts.enabled', true);
      return documents.flatMap(({ id, data }) => {
        const record = validate(id, data);
        return record === null ? [] : [{ uid: id, record }];
      });
    },
  };
}

/** Reads a dotted path such as `alerts.enabled`. */
const readPath = (data: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      data,
    );

/** An in-process collection, for development and tests. Data lives only as long as the process. */
export function createMemoryCollection(): DocumentCollection {
  const documents = new Map<string, unknown>();
  return {
    get: (id) => Promise.resolve(structuredClone(documents.get(id))),
    set(id, data) {
      documents.set(id, structuredClone(data));
      return Promise.resolve();
    },
    delete(id) {
      documents.delete(id);
      return Promise.resolve();
    },
    whereEquals: (field, value) =>
      Promise.resolve(
        [...documents]
          .filter(([, data]) => readPath(data, field) === value)
          .map(([id, data]) => ({ id, data: structuredClone(data) })),
      ),
  };
}
