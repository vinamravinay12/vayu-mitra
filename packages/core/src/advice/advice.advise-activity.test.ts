/** Tests of adviseActivity. */
import { expect, it } from 'vitest';
import { DADI, makeReport } from '../test-utils/fixtures.js';
import { activityAdviceSchema } from './advice-schema.js';
import { adviseActivity } from './advise-activity.js';
import { input } from './advice.fixtures.js';

it('adviseActivity: says go when the planned hour is fine', () => {
  const advice = adviseActivity(input({ report: makeReport([150, 140]) }));
  expect(advice.verdict).toBe('go');
  expect(advice.bestWindow).toEqual({ time: '2026-11-22T11:00', aqi: 140, category: 'moderate' });
  expect(advice.tips).toEqual(['ease-off', 'avoid-traffic']);
});

it('adviseActivity: shifts to a cleaner window when one is good enough', () => {
  const advice = adviseActivity(input({ report: makeReport([250, 230, 190, 180]) }));
  expect(advice.verdict).toBe('shift');
  expect(advice.bestWindow?.time).toBe('2026-11-22T13:00');
});

it('adviseActivity: allows care when nothing is good but now is tolerable', () => {
  const advice = adviseActivity(input({ report: makeReport([250, 260]) }));
  expect(advice.verdict).toBe('care');
  expect(advice.tips).toContain('get-n95');
});

it('adviseActivity: shifts with care, or skips, when the air stays bad', () => {
  expect(adviseActivity(input({ report: makeReport([350, 280]) })).verdict).toBe('shift');
  const skip = adviseActivity(input({ report: makeReport([380, 360]) }));
  expect(skip.verdict).toBe('skip');
  expect(skip.indoorAlternative).toMatch(/indoors/);
});

it('adviseActivity: lowers the bar for sensitive people and vigorous activity', () => {
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

it('adviseActivity: treats airing the home as never needing care: open in a clean hour or keep shut', () => {
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

it('adviseActivity: adds recirculation for a school run by car in poor air', () => {
  const advice = adviseActivity(
    input({ activity: 'school-run', home: ['car'], report: makeReport([250]) }),
  );
  expect(advice.tips).toContain('recirculate');
  expect(advice.bestWindow).toBeNull();
});

it('adviseActivity: has no better window when the outlook is shorter than the activity', () => {
  const advice = adviseActivity(input({ minutes: 180, report: makeReport([320, 100]) }));
  expect(advice.bestWindow).toBeNull();
  expect(advice.verdict).toBe('skip');
});

it('adviseActivity: uses the routine length for the window and produces valid advice', () => {
  const advice = adviseActivity(input({ minutes: 120, time: '12:00' }));
  expect(advice.planned.time).toBe('2026-11-22T12:00');
  expect(advice.bestWindow?.time).toBe('2026-11-22T13:00');
  expect(activityAdviceSchema.safeParse(advice).success).toBe(true);
});
