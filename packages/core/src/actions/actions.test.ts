import { describe, expect, it } from 'vitest';
import { summarizeDay } from '../air/summarize-day.js';
import { selectDay } from '../air/select-day.js';
import { ACTIONS_BY_ID } from '../catalog/actions/index.js';
import { deriveContext } from '../context/derive-context.js';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import type { HouseholdProfile } from '../schemas/profile.js';
import { makeMember, makeProfile, makeSnapshot } from '../test-utils/fixtures.js';
import { assessActions, isMeaningful, pickRecommended, scoreImpact } from './assess-actions.js';
import {
  applyChoices,
  chosenDefinitions,
  normalizeChoices,
  toggleChoice,
} from './choose-actions.js';
import { compareOutcomes, outcomeOf, vulnerabilityWeight } from './compare-scenarios.js';

/** Assesses every action for a profile on a 150 µg/m³ winter day. */
function assess(profile: HouseholdProfile = makeProfile()) {
  const day = selectDay(makeSnapshot('2026-11-21', 150), '2026-11-21');
  const summary = summarizeDay(day);
  const baseline = scenarioFromProfile(profile);
  const context = deriveContext(profile, baseline, summary, day.pm25);
  return assessActions({
    members: profile.members,
    baseline,
    baselineOutcome: outcomeOf(baseline, day.pm25),
    context,
    pm25: day.pm25,
  });
}

/** A zero impact, for scoring tests. */
const noImpact = {
  members: [],
  weightedReductionPercent: 0,
  pm25GramsWeeklySaved: 0,
  pm25GramsSeasonSaved: 0,
  co2KgWeeklySaved: 0,
};

describe('assessActions', () => {
  const assessed = assess();
  const ids = assessed.map((entry) => entry.action.id);

  it('offers only actions that apply, ranked by score', () => {
    expect(ids).toContain('bedroom-purifier');
    expect(ids).toContain('swap-incense');
    expect(ids).not.toContain('replace-coal-heater');
    const scores = assessed.map((entry) => entry.score);
    expect(scores).toEqual([...scores].sort((first, second) => second - first));
  });

  it('recommends three actions, one per category where possible, never two alternatives', () => {
    const recommended = assessed.filter((entry) => entry.recommended);
    expect(recommended).toHaveLength(3);
    expect(new Set(recommended.map((entry) => entry.action.category)).size).toBe(3);
    expect(
      recommended.filter((entry) => entry.action.group === 'purifier').length,
    ).toBeLessThanOrEqual(1);
  });

  it('explains every action with computed numbers', () => {
    for (const entry of assessed) {
      expect(entry.explanation.length).toBeGreaterThan(0);
    }
    const purifier = assessed.find((entry) => entry.action.id === 'bedroom-purifier');
    expect(purifier?.impact.weightedReductionPercent).toBeGreaterThan(20);
  });

  it('suggests switching a short drive to walking', () => {
    const shortDrive = assess(makeProfile({ members: [makeMember({ commuteKm: 3 })] }));
    expect(shortDrive.map((entry) => entry.action.id)).toContain('walk-or-cycle-short-trips');
  });
});

describe('scoring', () => {
  const action = ACTIONS_BY_ID.get('carpool');
  it('rewards health first and discounts effort', () => {
    if (action === undefined) throw new Error('carpool missing');
    expect(scoreImpact({ ...noImpact, weightedReductionPercent: 13 }, action)).toBe(10);
    expect(scoreImpact({ ...noImpact, pm25GramsWeeklySaved: 100 }, action)).toBe(23.1);
    expect(scoreImpact({ ...noImpact, co2KgWeeklySaved: 13 }, action)).toBe(1);
  });

  it('drops negligible changes, and harmful ones that do not cut smog', () => {
    expect(isMeaningful(noImpact)).toBe(false);
    expect(isMeaningful({ ...noImpact, pm25GramsWeeklySaved: 1 })).toBe(true);
    expect(
      isMeaningful({ ...noImpact, weightedReductionPercent: -2, pm25GramsWeeklySaved: 5 }),
    ).toBe(true);
    const oneMember = {
      name: 'A',
      beforeDoseUg: 10,
      afterDoseUg: 9,
      reductionPercent: 10,
      beforeCigarettes: 1,
      afterCigarettes: 1,
    };
    expect(isMeaningful({ ...noImpact, members: [oneMember] })).toBe(true);
    expect(isMeaningful({ ...noImpact, weightedReductionPercent: -2, members: [oneMember] })).toBe(
      false,
    );
  });

  it('fills the plan beyond one per category when categories are missing', () => {
    const indoorOnly = assess().filter((entry) => entry.action.category === 'indoor');
    expect(pickRecommended(indoorOnly).size).toBe(3);
  });
});

describe('choices', () => {
  const offered = assess();

  it('keeps offered choices in catalogue order, one per group', () => {
    expect(
      normalizeChoices(
        ['swap-incense', 'unknown', 'diy-box-fan-filter', 'bedroom-purifier'],
        offered,
      ),
    ).toEqual(['bedroom-purifier', 'swap-incense']);
  });

  it('toggles, replacing alternatives in the same group', () => {
    const withPurifier = toggleChoice([], 'bedroom-purifier', offered);
    expect(withPurifier).toEqual(['bedroom-purifier']);
    expect(toggleChoice(withPurifier, 'diy-box-fan-filter', offered)).toEqual([
      'diy-box-fan-filter',
    ]);
    expect(toggleChoice(withPurifier, 'swap-incense', offered)).toEqual([
      'bedroom-purifier',
      'swap-incense',
    ]);
    expect(toggleChoice(withPurifier, 'bedroom-purifier', offered)).toEqual([]);
    expect(toggleChoice(withPurifier, 'not-offered', offered)).toEqual(['bedroom-purifier']);
  });

  it('applies chosen actions on top of the baseline', () => {
    const baseline = scenarioFromProfile(makeProfile());
    expect(chosenDefinitions(['swap-incense']).map((action) => action.id)).toEqual([
      'swap-incense',
    ]);
    expect(applyChoices(baseline, ['swap-incense'], []).indoorSources).toEqual([]);
  });
});

describe('compareOutcomes', () => {
  it('weights vulnerable members more and tolerates missing outcomes', () => {
    expect(
      vulnerabilityWeight(makeMember({ ageGroup: 'senior', conditions: ['asthma', 'copd'] })),
    ).toBeCloseTo(3.3, 5);
    const profile = makeProfile();
    const baseline = scenarioFromProfile(profile);
    const flat = Array.from({ length: 24 }, () => 100);
    const before = outcomeOf(baseline, flat);
    const impact = compareOutcomes(profile.members, before, { ...before, exposures: [] });
    expect(impact.members[0]?.reductionPercent).toBe(0);
    const empty = compareOutcomes([], { ...before, exposures: [] }, { ...before, exposures: [] });
    expect(empty.weightedReductionPercent).toBe(0);
    const unweighted = compareOutcomes([], before, before);
    expect(unweighted.weightedReductionPercent).toBe(0);
  });
});
