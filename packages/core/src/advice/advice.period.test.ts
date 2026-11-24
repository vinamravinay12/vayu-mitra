import { describe, expect, it } from 'vitest';
import { DADI, makeReport } from '../test-utils/fixtures.js';
import { adviseActivity, cleanestWindow } from './advise-activity.js';
import { DAY, input } from './advice.fixtures.js';

describe('advice for a part of the day', () => {
  /** Today 10:00–23:00, then tomorrow 00:00–21:00: a bad morning, a clean afternoon. */
  const DAYS = [
    ...[250, 240, 230, 220, 230, 250, 280, 300, 320, 340, 350, 360, 370, 380],
    ...[390, 380, 360, 340, 320, 300, 280, 250, 220, 200, 180, 150, 120, 90, 80, 85, 110, 160],
    ...[220, 260, 300, 320],
  ];
  const report = makeReport(DAYS);
  it('answers "run tomorrow morning" about the morning, and points to the cleaner afternoon', () => {
    const advice = adviseActivity(
      input({ report, activity: 'run', day: 'tomorrow', period: 'morning' }),
    );
    expect(advice.planned).toEqual({ time: '2026-11-23T11:00', aqi: 150, category: 'moderate' });
    expect(advice.bestWindow?.time).toBe('2026-11-23T14:00');
    expect(advice.verdict).toBe('shift');
  });
  it('takes the next occurrence of a part of the day when no day is given', () => {
    expect(adviseActivity(input({ report, period: 'evening' })).planned.time).toBe(
      '2026-11-22T17:00',
    );
    // At 10 am, this morning still has an hour to go.
    expect(adviseActivity(input({ report, period: 'morning' })).planned.time).toBe(
      '2026-11-22T11:00',
    );
    // Night is outside daylight, but asked for, so it is planned within the night.
    expect(adviseActivity(input({ report, period: 'night', minutes: 30 })).planned.time).toBe(
      '2026-11-22T21:00',
    );
  });
});

describe('advice for a part of the day', () => {
  /** Today 10:00–23:00, then tomorrow 00:00–21:00: a bad morning, a clean afternoon. */
  const DAYS = [
    ...[250, 240, 230, 220, 230, 250, 280, 300, 320, 340, 350, 360, 370, 380],
    ...[390, 380, 360, 340, 320, 300, 280, 250, 220, 200, 180, 150, 120, 90, 80, 85, 110, 160],
    ...[220, 260, 300, 320],
  ];
  const report = makeReport(DAYS);
  it('uses the first hour of a part of the day too short for the activity', () => {
    const advice = adviseActivity(input({ report, period: 'night', minutes: 240 }));
    expect(advice.planned.time).toBe('2026-11-22T21:00');
  });
  it('falls back to the usual plan when the outlook does not reach that part of the day', () => {
    const short = makeReport([250, 240]);
    expect(adviseActivity(input({ report: short, period: 'morning' })).planned.time).toBe(
      '2026-11-22T11:00',
    );
    expect(adviseActivity(input({ report: short, period: 'evening' })).planned.time).toBe(
      '2026-11-22T10:00',
    );
  });
});

describe('a car trip', () => {
  it('is fine in poorer air than a walk, with cabin and stop precautions', () => {
    const poor = makeReport([250, 260]);
    expect(adviseActivity(input({ report: poor })).verdict).toBe('care');
    const car = adviseActivity(input({ report: poor, activity: 'car-trip', people: [DADI] }));
    expect(car.verdict).toBe('care');
    expect(car.tips).toEqual(['recirculate', 'avoid-rush-hour', 'mask-for-stops', 'carry-inhaler']);
    const healthy = adviseActivity(input({ report: poor, activity: 'car-trip' }));
    expect(healthy.verdict).toBe('go');
    expect(healthy.tips).not.toContain('ease-off');
    expect(adviseActivity(input({ report: makeReport([40]), activity: 'car-trip' })).tips).toEqual(
      [],
    );
  });
});

describe('cleanestWindow', () => {
  it('finds the lowest daylight run and skips night hours', () => {
    expect(cleanestWindow(makeReport(DAY).hours, 1)?.time).toBe('2026-11-22T14:00');
    expect(cleanestWindow(makeReport(DAY).hours, 2)?.time).toBe('2026-11-22T13:00');
    // A run that would end after 20:00 is not offered.
    expect(
      cleanestWindow(
        makeReport([300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 10]).hours,
        1,
      )?.aqi,
    ).toBe(300);
    expect(cleanestWindow(makeReport([100]).hours, 2)).toBeNull();
  });
});
