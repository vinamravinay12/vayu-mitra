import { describe, expect, it } from 'vitest';
import { DADI, makeReport, NOW, PAPA } from '../test-utils/fixtures.js';
import { adviseActivity, dateFor, plannedHour, sensitivePeople } from './advise-activity.js';
import { input } from './advice.fixtures.js';

describe('sensitivePeople', () => {
  it('names the old, the young and anyone with a condition', () => {
    const child = { ...PAPA, id: 'c', label: 'Aarav', ageGroup: 'child' as const };
    const pregnant = { ...PAPA, id: 'p', label: 'Meera', conditions: ['pregnancy' as const] };
    expect(sensitivePeople([DADI, PAPA, child, pregnant])).toEqual(['Dadi', 'Aarav', 'Meera']);
  });
});

describe('plannedHour', () => {
  const report = makeReport(Array.from({ length: 34 }, (_unused, index) => 100 + index));
  it('is now without a time, else that time on the date asked, else its next occurrence', () => {
    expect(plannedHour(report, null, null).time).toBe('2026-11-22T10:00');
    expect(plannedHour(report, '18:30', null).time).toBe('2026-11-22T18:00');
    expect(plannedHour(report, '06:30', null).time).toBe('2026-11-23T06:00');
    expect(plannedHour(report, '10:45', null).time).toBe('2026-11-22T10:00');
    expect(plannedHour(report, '18:00', '2026-11-23').time).toBe('2026-11-23T18:00');
    // 11 pm tomorrow is past the outlook, so the next 11 pm (tonight) it is.
    expect(plannedHour(report, '23:00', '2026-11-23').time).toBe('2026-11-22T23:00');
    expect(plannedHour(report, '06:00', '2026-11-22').time).toBe('2026-11-23T06:00');
    expect(plannedHour(report, '11:00', '2026-11-23').time).toBe('2026-11-23T11:00');
  });
  it('falls back to now when the outlook is too short', () => {
    expect(plannedHour(makeReport([100, 120]), '18:00', null).time).toBe('2026-11-22T10:00');
  });
  it('turns a day into a local date', () => {
    expect(dateFor(report, 'today', NOW)).toBe('2026-11-22');
    expect(dateFor(report, 'tomorrow', NOW)).toBe('2026-11-23');
    expect(dateFor(report, null, NOW)).toBeNull();
  });
});

describe('advice for another day', () => {
  /** Today 10:00–23:00 poor-ish, tomorrow 00:00–19:00 with a clean afternoon. */
  const DAYS = [
    ...[250, 240, 230, 220, 230, 250, 280, 300, 320, 340, 350, 360, 370, 380],
    ...[
      390, 380, 360, 340, 320, 300, 280, 250, 220, 200, 180, 150, 120, 90, 80, 85, 110, 160, 220,
      260,
    ],
  ];
  const report = makeReport(DAYS);

  it('plans tomorrow at its cleanest window when no time is given', () => {
    const advice = adviseActivity(input({ report, day: 'tomorrow', activity: 'car-trip' }));
    expect(advice.planned.time).toBe('2026-11-23T14:00');
    expect(advice.verdict).toBe('go');
    expect(advice.bestWindow).toBeNull();
  });

  it('keeps the cleanest window on the day asked about', () => {
    const advice = adviseActivity(input({ report, day: 'tomorrow', time: '09:00' }));
    expect(advice.planned.time).toBe('2026-11-23T09:00');
    expect(advice.bestWindow?.time.startsWith('2026-11-23')).toBe(true);
    const today = adviseActivity(input({ report, day: 'today', time: '18:00' }));
    expect(today.bestWindow?.time.startsWith('2026-11-22')).toBe(true);
  });

  it('falls back to the time alone when the day has no daylight left in the outlook', () => {
    const short = makeReport([250, 240]);
    const advice = adviseActivity(input({ report: short, day: 'tomorrow' }));
    expect(advice.planned.time).toBe('2026-11-22T10:00');
  });
});
