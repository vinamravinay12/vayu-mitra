import { describe, expect, it } from 'vitest';
import { DADI, makeReport, NOW, PAPA } from '../test-utils/fixtures.js';
import { activityAdviceSchema } from './advice-schema.js';
import {
  adviseActivity,
  cleanestWindow,
  plannedHour,
  sensitivePeople,
  type AdviceInput,
} from './advise-activity.js';

/** 10:00 … 21:00 today, then tomorrow from 22:00 on. */
const DAY = [180, 160, 140, 120, 110, 130, 170, 220, 260, 300, 320, 340, 360, 380];

const input = (overrides: Partial<AdviceInput> = {}): AdviceInput => ({
  activity: 'walk',
  report: makeReport(DAY),
  now: NOW,
  people: [PAPA],
  home: [],
  time: null,
  minutes: null,
  ...overrides,
});

describe('sensitivePeople', () => {
  it('names the old, the young and anyone with a condition', () => {
    const child = { ...PAPA, id: 'c', label: 'Aarav', ageGroup: 'child' as const };
    const pregnant = { ...PAPA, id: 'p', label: 'Meera', conditions: ['pregnancy' as const] };
    expect(sensitivePeople([DADI, PAPA, child, pregnant])).toEqual(['Dadi', 'Aarav', 'Meera']);
  });
});

describe('plannedHour', () => {
  const report = makeReport(Array.from({ length: 30 }, (_unused, index) => 100 + index));
  it('is now without a time, else the next occurrence of it', () => {
    expect(plannedHour(report, null, NOW).time).toBe('2026-11-22T10:00');
    expect(plannedHour(report, '18:30', NOW).time).toBe('2026-11-22T18:00');
    expect(plannedHour(report, '06:30', NOW).time).toBe('2026-11-23T06:00');
    expect(plannedHour(report, '10:45', NOW).time).toBe('2026-11-22T10:00');
  });
  it('falls back to now when the outlook is too short', () => {
    expect(plannedHour(makeReport([100, 120]), '18:00', NOW).time).toBe('2026-11-22T10:00');
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

describe('adviseActivity', () => {
  it('says go when the planned hour is fine', () => {
    const advice = adviseActivity(input({ report: makeReport([150, 140]) }));
    expect(advice.verdict).toBe('go');
    expect(advice.bestWindow).toEqual({ time: '2026-11-22T11:00', aqi: 140, category: 'moderate' });
    expect(advice.tips).toEqual(['ease-off', 'avoid-traffic']);
  });

  it('shifts to a cleaner window when one is good enough', () => {
    const advice = adviseActivity(input({ report: makeReport([250, 230, 190, 180]) }));
    expect(advice.verdict).toBe('shift');
    expect(advice.bestWindow?.time).toBe('2026-11-22T13:00');
  });

  it('allows care when nothing is good but now is tolerable', () => {
    const advice = adviseActivity(input({ report: makeReport([250, 260]) }));
    expect(advice.verdict).toBe('care');
    expect(advice.tips).toContain('get-n95');
  });

  it('shifts with care, or skips, when the air stays bad', () => {
    expect(adviseActivity(input({ report: makeReport([350, 280]) })).verdict).toBe('shift');
    const skip = adviseActivity(input({ report: makeReport([380, 360]) }));
    expect(skip.verdict).toBe('skip');
    expect(skip.indoorAlternative).toMatch(/indoors/);
  });

  it('lowers the bar for sensitive people and vigorous activity', () => {
    const report = makeReport([150, 160]);
    const dadi = adviseActivity(
      input({ report, people: [DADI], home: ['n95-masks', 'air-purifier'] }),
    );
    expect(dadi.verdict).toBe('care');
    expect(dadi.sensitiveFor).toEqual(['Dadi']);
    expect(dadi.tips).toEqual(['wear-n95', 'ease-off', 'avoid-traffic', 'carry-inhaler']);
    expect(adviseActivity(input({ report, activity: 'run' })).verdict).toBe('care');
    expect(
      adviseActivity(input({ report: makeReport([40]), people: [DADI], activity: 'run' })).verdict,
    ).toBe('go');
  });

  it('treats airing the home as never needing care: open in a clean hour or keep shut', () => {
    const open = adviseActivity(
      input({ activity: 'open-windows', people: [DADI], report: makeReport([250, 150]) }),
    );
    expect(open.verdict).toBe('shift');
    expect(open.sensitiveFor).toEqual([]);
    const shut = adviseActivity(
      input({ activity: 'open-windows', report: makeReport([250, 260]), home: ['air-purifier'] }),
    );
    expect(shut.verdict).toBe('skip');
    expect(shut.tips).toEqual(['run-purifier']);
    expect(
      adviseActivity(input({ activity: 'open-windows', report: makeReport([320]) })).tips,
    ).toEqual(['keep-windows-shut']);
  });

  it('adds recirculation for a school run by car in poor air', () => {
    const advice = adviseActivity(
      input({ activity: 'school-run', home: ['car'], report: makeReport([250]) }),
    );
    expect(advice.tips).toContain('recirculate');
    expect(advice.bestWindow).toBeNull();
  });

  it('has no better window when the outlook is shorter than the activity', () => {
    const advice = adviseActivity(input({ minutes: 180, report: makeReport([320, 100]) }));
    expect(advice.bestWindow).toBeNull();
    expect(advice.verdict).toBe('skip');
  });

  it('uses the routine length for the window and produces valid advice', () => {
    const advice = adviseActivity(input({ minutes: 120, time: '12:00' }));
    expect(advice.planned.time).toBe('2026-11-22T12:00');
    expect(advice.bestWindow?.time).toBe('2026-11-22T13:00');
    expect(activityAdviceSchema.safeParse(advice).success).toBe(true);
  });
});
