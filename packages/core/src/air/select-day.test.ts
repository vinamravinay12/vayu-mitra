import { describe, expect, it } from 'vitest';
import { makeSnapshot } from '../test-utils/fixtures.js';
import { coversDate, localClock, nextDate, selectDay } from './select-day.js';

describe('localClock', () => {
  it('shifts UTC to the forecast location', () => {
    expect(localClock(new Date('2026-11-21T20:00:00Z'), 19_800)).toEqual({
      date: '2026-11-22',
      hour: 1,
    });
    expect(localClock(new Date('2026-11-21T04:30:00Z'), 0)).toEqual({
      date: '2026-11-21',
      hour: 4,
    });
  });
});

describe('nextDate', () => {
  it('rolls over months and years', () => {
    expect(nextDate('2026-11-30')).toBe('2026-12-01');
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
  });
});

describe('selectDay', () => {
  it('returns 24 hours for a covered date', () => {
    const snapshot = makeSnapshot('2026-11-21', 100, 200);
    const day = selectDay(snapshot, '2026-11-22');
    expect(day.date).toBe('2026-11-22');
    expect(day.pm25).toHaveLength(24);
    expect(day.pm25[14]).toBeLessThan(day.pm25[2] ?? 0);
    expect(coversDate(snapshot, '2026-11-23')).toBe(false);
  });

  it('falls back to the first day when the date is not covered', () => {
    expect(selectDay(makeSnapshot('2026-11-21'), '2027-01-01').date).toBe('2026-11-21');
  });

  it('fills missing hours from the nearest known hour', () => {
    const snapshot = makeSnapshot('2026-11-21');
    const gappy = {
      ...snapshot,
      hours: snapshot.hours.filter((hour) => !hour.time.endsWith('T05:00')),
    };
    const day = selectDay(gappy, '2026-11-21');
    expect(day.pm25[5]).toBe(day.pm25[4]);
  });

  it('copes with a day that has a single known hour', () => {
    const snapshot = makeSnapshot('2026-11-21');
    const lonely = { ...snapshot, hours: snapshot.hours.slice(0, 1) };
    expect(
      selectDay(lonely, '2026-11-21').pm25.every((value) => value === lonely.hours[0]?.pm25),
    ).toBe(true);
    expect(
      selectDay({ ...snapshot, hours: [] }, '2026-11-21').pm25.every((value) => value === 0),
    ).toBe(true);
  });
});
