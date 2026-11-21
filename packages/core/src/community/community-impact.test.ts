import { describe, expect, it } from 'vitest';
import { communityImpact } from './community-impact.js';

const chosen = {
  members: [],
  weightedReductionPercent: 40,
  pm25GramsWeeklySaved: 10,
  pm25GramsSeasonSaved: 160,
  co2KgWeeklySaved: 5,
};

describe('communityImpact', () => {
  it('scales the household’s choices and group drives to the community', () => {
    const impact = communityImpact(200, chosen);
    expect(impact.sameChoicesPm25KgSeason).toBe(32);
    expect(impact.sameChoicesCo2TonnesSeason).toBe(16);
    const burning = impact.actions.find((entry) => entry.action.id === 'no-burning-compact');
    expect(burning?.participatingHouseholds).toBe(60);
    expect(burning?.pm25KgSeasonSaved).toBe(15.4);
  });

  it('always counts at least this household', () => {
    expect(
      communityImpact(1, chosen).actions.every((entry) => entry.participatingHouseholds === 1),
    ).toBe(true);
  });
});
