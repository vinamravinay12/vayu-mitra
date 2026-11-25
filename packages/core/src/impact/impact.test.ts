/** Tests of the impact estimates: exposure saved by a better hour, low-emission steps and indoor hacks. */
import { expect, it } from 'vitest';
import { adviseActivity } from '../advice/advise-activity.js';
import { input } from '../advice/advice.fixtures.js';
import { describeAdvice } from '../chat/describe.js';
import { DADI, definite, makeReport } from '../test-utils/fixtures.js';
import { EMPTY_MEMORY } from '../memory/memory-schema.js';
import { dose, exposureImpact } from './exposure-impact.js';
import { indoorHacks } from './indoor-hacks.js';
import { lowEmissionSteps } from './low-emission-steps.js';
import { household, reportWithPm25, routine } from './impact.fixtures.js';

it('exposure impact: doses PM2.5 by concentration, breathing and time', () => {
  expect(dose(100, 'light', 60)).toBeCloseTo(72);
  expect(dose(100, 'vigorous', 30)).toBeCloseTo(150);
});

it('exposure impact: says how much less a cleaner hour means, and nothing when it barely differs', () => {
  const [planned, better, close] = reportWithPm25([
    [250, 200],
    [180, 80],
    [245, 195],
  ]).hours;
  const hours = { planned: definite(planned), better: definite(better) };
  expect(exposureImpact(hours, 'light', 30)).toEqual({
    percentLess: 60,
    plannedMicrograms: 72,
    betterMicrograms: 29,
    minutes: 30,
  });
  expect(exposureImpact({ ...hours, better: definite(close) }, 'light', 30)).toBeNull();
  expect(exposureImpact({ ...hours, better: null }, 'light', 30)).toBeNull();
  expect(
    exposureImpact(
      { planned: definite(makeReport([200]).hours[0]), better: hours.better },
      'light',
      30,
    ),
  ).toBeNull();
});

it('exposure impact: rides on shifted advice and is put into words', () => {
  const report = reportWithPm25([
    [250, 200],
    [230, 180],
    [190, 90],
    [180, 80],
  ]);
  const advice = adviseActivity(input({ report, minutes: 60 }));
  expect(advice.verdict).toBe('shift');
  expect(advice.impact).toEqual({
    percentLess: 60,
    plannedMicrograms: 144,
    betterMicrograms: 58,
    minutes: 60,
  });
  expect(describeAdvice(advice, report)).toContain(
    'That means breathing about 60% less PM2.5: roughly 58 µg instead of 144 µg over 60 minutes.',
  );
  expect(adviseActivity(input({ report, activity: 'open-windows' })).impact).toBeNull();
});

it('low-emission steps: swaps a driven commute for the metro, with what it saves per trip', () => {
  const [metro, idling, ...rest] = lowEmissionSteps(
    household([routine('commute', 45), routine('walk', 30)]),
  );
  expect(metro).toMatchObject({
    id: 'metro:routine:commute',
    title: 'Take the metro or a bus for the commute',
    saving: { co2Kg: 2.1, pm25Milligrams: 400, per: 'trip' },
  });
  expect(metro?.detail).toContain('Your 45-minute commute is about 17 km by car.');
  expect(idling).toMatchObject({ id: 'no-idling', saving: { co2Kg: 0.3, per: '10 minutes' } });
  expect(rest.map((step) => step.id)).toEqual(['no-burning', 'clean-heat']);
});

it('low-emission steps: shares the school run, and offers only the common steps without a car', () => {
  const [share] = lowEmissionSteps(household([routine('school-run', 20)]));
  expect(share).toMatchObject({
    id: 'share:routine:school-run',
    title: 'Share the school run with another family',
    saving: { co2Kg: 0.6, pm25Milligrams: 90, per: 'trip' },
  });
  const noCar = lowEmissionSteps(household([routine('commute', 45)], false));
  expect(noCar.map((step) => step.id)).toEqual(['no-burning', 'clean-heat']);
});

it('indoor hacks: puts the purifier, or the clean room, where the most sensitive person is', () => {
  const [withPurifier] = indoorHacks({
    ...EMPTY_MEMORY,
    people: [DADI],
    home: [{ kind: 'home', id: 'home:purifier', feature: 'air-purifier' }],
  });
  expect(withPurifier?.title).toBe('Run the purifier in Dadi’s room, door shut');
  const hacks = indoorHacks(EMPTY_MEMORY);
  expect(hacks[0]?.title).toBe('Make the bedroom the clean room');
  expect(hacks.map((hack) => hack.id)).toEqual(['clean-room', 'cooking', 'no-smoke', 'wet-clean']);
});
