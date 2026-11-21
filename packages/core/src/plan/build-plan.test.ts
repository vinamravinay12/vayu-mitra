import { describe, expect, it } from 'vitest';
import { makeProfile, makeSnapshot, MORNING_IN_DELHI } from '../test-utils/fixtures.js';
import { buildPlan } from './build-plan.js';

describe('buildPlan', () => {
  const plan = buildPlan({
    profile: makeProfile(),
    air: makeSnapshot('2026-11-21', 150, 200),
    now: MORNING_IN_DELHI,
    chosenIds: null,
  });

  it('plans today at the place’s local time', () => {
    expect(plan.today.date).toBe('2026-11-21');
    expect(plan.localHour).toBe(10);
    expect(plan.airSource).toBe('fixture');
    expect(plan.tomorrow).toMatchObject({ date: '2026-11-22', trend: 'worse' });
  });

  it('starts from the recommended actions and computes their combined impact', () => {
    const recommended = plan.actions
      .filter((entry) => entry.recommended)
      .map((entry) => entry.action.id);
    expect([...plan.chosenIds].sort()).toEqual([...recommended].sort());
    expect(plan.chosen.impact.weightedReductionPercent).toBeGreaterThan(0);
    expect(plan.chosen.outcome.exposures).toHaveLength(3);
    expect(plan.routine.length).toBeGreaterThan(3);
    expect(plan.community.households).toBe(200);
  });

  it('honours the family’s own choices, including none', () => {
    const none = buildPlan({
      profile: makeProfile(),
      air: makeSnapshot(),
      now: MORNING_IN_DELHI,
      chosenIds: [],
    });
    expect(none.chosenIds).toEqual([]);
    expect(none.chosen.impact.weightedReductionPercent).toBe(0);
  });

  it('reports a better or similar tomorrow, and none when the forecast ends', () => {
    const better = buildPlan({
      profile: makeProfile(),
      air: makeSnapshot('2026-11-21', 150, 100),
      now: MORNING_IN_DELHI,
      chosenIds: [],
    });
    expect(better.tomorrow?.trend).toBe('better');
    const similar = buildPlan({
      profile: makeProfile(),
      air: makeSnapshot('2026-11-21', 150, 155),
      now: MORNING_IN_DELHI,
      chosenIds: [],
    });
    expect(similar.tomorrow?.trend).toBe('similar');
    const snapshot = makeSnapshot();
    const oneDay = { ...snapshot, hours: snapshot.hours.slice(0, 24) };
    expect(
      buildPlan({ profile: makeProfile(), air: oneDay, now: MORNING_IN_DELHI, chosenIds: [] })
        .tomorrow,
    ).toBeNull();
  });
});
