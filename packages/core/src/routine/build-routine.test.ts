import { describe, expect, it } from 'vitest';
import { selectDay } from '../air/select-day.js';
import { summarizeDay } from '../air/summarize-day.js';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import { makeMember, makeProfile, makeSnapshot } from '../test-utils/fixtures.js';
import { buildRoutine } from './build-routine.js';
import { routineTone } from './routine-item.js';

const dayAt = (mean: number) =>
  summarizeDay(selectDay(makeSnapshot('2026-11-21', mean), '2026-11-21'));

describe('buildRoutine', () => {
  it('lays out the day in hour order with airing, exercise, commutes and the peak', () => {
    const routine = buildRoutine(dayAt(150), scenarioFromProfile(makeProfile()));
    const kinds = routine.map((item) => item.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(['airing', 'exercise', 'commute', 'cooking', 'peak']),
    );
    expect(routine.map((item) => item.hour)).toEqual(
      [...routine.map((item) => item.hour)].sort((first, second) => first - second),
    );
    expect(routine.find((item) => item.kind === 'airing')?.tone).toBe('good');
    expect(routine.find((item) => item.title.startsWith('Meera leaves'))?.title).toContain(
      'school by bus',
    );
  });

  it('keeps windows shut when even the cleanest hours are dangerous', () => {
    const airing = buildRoutine(dayAt(600), scenarioFromProfile(makeProfile())).find(
      (item) => item.kind === 'airing',
    );
    expect(airing?.tone).toBe('avoid');
  });

  it('reflects chosen protection: masks, cabin air, indoor exercise, purifier, heater', () => {
    const scenario = {
      ...scenarioFromProfile(
        makeProfile({ home: { ...makeProfile().home, heating: 'coal-or-wood' } }),
      ),
      maskFactor: 0.4,
      commuteFactors: { 'car-petrol': 0.5 },
      purifierReduction: 0.6,
      cookingFuel: 'induction' as const,
    };
    const withIndoorExercise = {
      ...scenario,
      members: scenario.members.map((member) => ({ ...member, exerciseIndoors: true })),
    };
    const routine = buildRoutine(dayAt(150), withIndoorExercise);
    expect(routine.find((item) => item.title.startsWith('Asha leaves'))?.detail).toContain(
      'Wear the N95; windows up',
    );
    expect(routine.some((item) => item.title === 'Dadaji: exercise indoors')).toBe(true);
    expect(routine.some((item) => item.kind === 'purifier')).toBe(true);
    expect(routine.some((item) => item.kind === 'heating')).toBe(true);
    expect(routine.some((item) => item.kind === 'cooking')).toBe(false);
  });

  it('skips the peak warning on a clean day and gives babies no mask advice', () => {
    const profile = makeProfile({
      members: [makeMember({ ageGroup: 'infant', daytime: 'school', commuteMode: 'walk' })],
    });
    const routine = buildRoutine(dayAt(20), { ...scenarioFromProfile(profile), maskFactor: 0.4 });
    expect(routine.some((item) => item.kind === 'peak')).toBe(false);
    expect(routine.find((item) => item.kind === 'commute')?.detail).not.toContain('N95');
  });

  it('copes with an empty day', () => {
    const day = { ...dayAt(150), hourly: [], cleanWindow: { hours: [], meanPm25: 10 } };
    expect(buildRoutine(day, scenarioFromProfile(makeProfile()))[0]?.hour).toBeGreaterThanOrEqual(
      0,
    );
  });
});

describe('routineTone', () => {
  it('grades outdoor air', () => {
    expect([routineTone(90), routineTone(100), routineTone(120)]).toEqual([
      'good',
      'caution',
      'avoid',
    ]);
  });
});
