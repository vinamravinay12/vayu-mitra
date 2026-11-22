import { describe, expect, it } from 'vitest';
import { NOW } from '../test-utils/fake-llm.js';
import { newUserRecord, publicView } from './user-record.js';
import { createMemoryCollection, createUserStore } from './user-store.js';

describe('user store', () => {
  it('round-trips a record, isolated from later mutation', async () => {
    const store = createUserStore(createMemoryCollection());
    const record = newUserRecord(NOW());
    await store.put('u1', record);
    const read = await store.get('u1');
    expect(read).toEqual(record);
    expect(read).not.toBe(record);
    expect(await store.get('nobody')).toBeNull();
    await store.delete('u1');
    expect(await store.get('u1')).toBeNull();
  });

  it('refuses to write an invalid record and ignores a corrupt one', async () => {
    const collection = createMemoryCollection();
    const store = createUserStore(collection);
    await expect(
      store.put('u1', { ...newUserRecord(NOW()), pushIds: ['x', 'x', 'x', 'x', 'x', 'x'] }),
    ).rejects.toThrow();
    await collection.set('u2', { memory: 'garbage' });
    expect(await store.get('u2')).toBeNull();
  });

  it('lists only valid records with alerts on', async () => {
    const collection = createMemoryCollection();
    const store = createUserStore(collection);
    const on = {
      ...newUserRecord(NOW()),
      alerts: { ...newUserRecord(NOW()).alerts, enabled: true },
    };
    await store.put('on', on);
    await store.put('off', newUserRecord(NOW()));
    await collection.set('corrupt', { alerts: { enabled: true } });
    await collection.set('scalar', 7);
    expect(await store.alertSubscribers()).toEqual([{ uid: 'on', record: on }]);
  });

  it('never shows device ids to the browser', () => {
    const view = publicView({ ...newUserRecord(NOW()), pushIds: ['fid-1'] });
    expect(view).not.toHaveProperty('pushIds');
    expect(view.pushEnabled).toBe(true);
  });
});
