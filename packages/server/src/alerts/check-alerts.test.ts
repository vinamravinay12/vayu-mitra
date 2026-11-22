import { DEFAULT_ALERT_SETTINGS } from '@vayu/core';
import { describe, expect, it, vi } from 'vitest';
import type { Messenger } from '../push/messenger.js';
import { newUserRecord, type UserRecord } from '../store/user-record.js';
import { NOW } from '../test-utils/fake-llm.js';
import { DELHI, testDeps } from '../test-utils/deps.js';
import { checkAlerts } from './check-alerts.js';

const subscribed = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  ...newUserRecord(NOW()),
  place: DELHI,
  alerts: { ...DEFAULT_ALERT_SETTINGS, enabled: true, threshold: 'moderate' },
  pushIds: ['fid-1', 'fid-2'],
  ...overrides,
});

/** A messenger whose `send` is a spy, kept separately so assertions never unbind a method. */
function messenger(staleIds: string[] = []): Messenger & { spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn(() => Promise.resolve({ staleIds }));
  return { send: spy, spy };
}

describe('checkAlerts', () => {
  it('alerts families over their threshold, records it and drops stale devices', async () => {
    const deps = { ...testDeps(), messenger: messenger(['fid-2']) };
    await deps.store.put('u1', subscribed());
    expect(await checkAlerts(deps)).toEqual({ checked: 1, sent: 1, skipped: 0, failed: 0 });
    expect(deps.messenger.spy).toHaveBeenCalledWith(
      ['fid-1', 'fid-2'],
      expect.objectContaining({ title: expect.stringMatching(/air in New Delhi: AQI \d+/) }),
    );
    const saved = await deps.store.get('u1');
    expect(saved?.pushIds).toEqual(['fid-1']);
    expect(saved?.alertState.lastSentAt).toBe(NOW().toISOString());
    // The next run is inside the cooldown, so nothing is sent or saved.
    expect(await checkAlerts(deps)).toMatchObject({ sent: 0, skipped: 1 });
  });

  it('skips families with no place or no devices, and writes only on change', async () => {
    const deps = { ...testDeps(), messenger: messenger() };
    await deps.store.put('nowhere', subscribed({ place: null }));
    await deps.store.put('no-devices', subscribed({ pushIds: [] }));
    await deps.store.put(
      'quiet',
      subscribed({ alerts: { ...DEFAULT_ALERT_SETTINGS, enabled: true, threshold: 'severe' } }),
    );
    const put = vi.spyOn(deps.store, 'put');
    expect(await checkAlerts(deps)).toEqual({ checked: 3, sent: 0, skipped: 3, failed: 0 });
    expect(deps.messenger.spy).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('carries on past one family’s failure', async () => {
    const deps = {
      ...testDeps(),
      messenger: { send: () => Promise.reject(new Error('fcm down')) },
    };
    await deps.store.put('u1', subscribed());
    expect(await checkAlerts(deps)).toEqual({ checked: 1, sent: 0, skipped: 0, failed: 1 });
  });

  it('works through many families in batches', async () => {
    const deps = { ...testDeps(), messenger: messenger() };
    await Promise.all(
      Array.from({ length: 45 }, (_unused, index) =>
        deps.store.put(`u${String(index)}`, subscribed()),
      ),
    );
    expect(await checkAlerts(deps)).toMatchObject({ checked: 45, sent: 45 });
  });
});
