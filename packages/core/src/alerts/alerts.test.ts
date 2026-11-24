/** Tests of decideAlert, alertMessage and alertSettingsSchema. */
import { describe, expect, it } from 'vitest';
import { DADI, makeReport, NOW } from '../test-utils/fixtures.js';
import { EMPTY_MEMORY } from '../memory/memory-schema.js';
import {
  alertSettingsSchema,
  DEFAULT_ALERT_SETTINGS,
  INITIAL_ALERT_STATE,
} from './alert-settings.js';
import { ALERT_COOLDOWN_MS, alertMessage, decideAlert } from './decide-alert.js';

const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true };
const veryPoor = makeReport([340]);
const base = {
  settings,
  state: INITIAL_ALERT_STATE,
  report: veryPoor,
  memory: EMPTY_MEMORY,
  placeName: 'Delhi',
  now: NOW,
};

describe('decideAlert', () => {
  it('stays quiet when alerts are off', () => {
    expect(decideAlert({ ...base, settings: DEFAULT_ALERT_SETTINGS })).toMatchObject({
      send: false,
      reason: 'disabled',
    });
  });
  it('alerts once the air reaches the threshold and records it', () => {
    const decision = decideAlert(base);
    expect(decision).toMatchObject({ send: true, title: 'Very poor air in Delhi: AQI 340' });
    expect(decision.state).toEqual({ lastSentAt: NOW.toISOString(), lastSentRank: 4 });
  });
  it('resets below the threshold so the next rise is announced', () => {
    const decision = decideAlert({
      ...base,
      report: makeReport([150]),
      state: { lastSentAt: NOW.toISOString(), lastSentRank: 4 },
    });
    expect(decision).toMatchObject({ send: false, reason: 'below-threshold' });
    expect(decision.state.lastSentRank).toBeNull();
  });
  it('respects quiet hours, including ones that wrap midnight', () => {
    const late = new Date('2026-11-22T17:30:00Z'); // 23:00 IST
    expect(decideAlert({ ...base, now: late })).toMatchObject({ reason: 'quiet-hours' });
    const daytime = { ...settings, quietStart: '09:00', quietEnd: '11:00' };
    expect(decideAlert({ ...base, settings: daytime })).toMatchObject({ reason: 'quiet-hours' });
  });
});

describe('decideAlert', () => {
  it('waits out the cooldown unless the air gets a category worse', () => {
    const sent = { lastSentAt: new Date(NOW.getTime() - 60_000).toISOString(), lastSentRank: 4 };
    expect(decideAlert({ ...base, state: sent })).toMatchObject({ reason: 'cooldown' });
    expect(decideAlert({ ...base, state: sent, report: makeReport([420]) }).send).toBe(true);
    const old = { ...sent, lastSentAt: new Date(NOW.getTime() - ALERT_COOLDOWN_MS).toISOString() };
    expect(decideAlert({ ...base, state: old }).send).toBe(true);
  });
});

describe('alertMessage', () => {
  it('names sensitive people when there are any', () => {
    expect(alertMessage(veryPoor, { ...EMPTY_MEMORY, people: [DADI] }, 'Noida').body).toMatch(
      /^Keep Dadi indoors/,
    );
    expect(alertMessage(veryPoor, EMPTY_MEMORY, 'Noida').body).toMatch(/^Keep outdoor time short/);
  });
});

describe('alertSettingsSchema', () => {
  it('refuses thresholds and times outside the vocabulary', () => {
    expect(alertSettingsSchema.safeParse(settings).success).toBe(true);
    expect(alertSettingsSchema.safeParse({ ...settings, threshold: 'good' }).success).toBe(false);
    expect(alertSettingsSchema.safeParse({ ...settings, quietEnd: '7am' }).success).toBe(false);
  });
});
