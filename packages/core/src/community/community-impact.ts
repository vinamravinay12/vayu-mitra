import { roundTo1 } from '../air/summarize-day.js';
import { COMMUNITY_ACTIONS, type CommunityActionDefinition } from '../catalog/community-actions.js';
import { SMOG_SEASON_WEEKS } from '../catalog/exposure-constants.js';
import type { Impact } from '../actions/compare-scenarios.js';

/** A community action scaled to the size of this community. */
export interface CommunityActionImpact {
  readonly action: CommunityActionDefinition;
  readonly participatingHouseholds: number;
  readonly pm25KgSeasonSaved: number;
}

/** What the household's choices and group drives add up to across the community. */
export interface CommunityImpact {
  readonly households: number;
  /** If every household made the same choices as this one. */
  readonly sameChoicesPm25KgSeason: number;
  readonly sameChoicesCo2TonnesSeason: number;
  readonly actions: readonly CommunityActionImpact[];
}

/** Grams to kilograms, one decimal. */
const gramsToKg = (grams: number): number => roundTo1(grams / 1000);

/**
 * Scales impact to a community. The household's own savings are multiplied by
 * the number of households; community drives assume a typical participation
 * rate, but always count at least this household.
 */
export function communityImpact(households: number, chosen: Impact): CommunityImpact {
  return {
    households,
    sameChoicesPm25KgSeason: gramsToKg(chosen.pm25GramsSeasonSaved * households),
    sameChoicesCo2TonnesSeason: roundTo1(
      (chosen.co2KgWeeklySaved * SMOG_SEASON_WEEKS * households) / 1000,
    ),
    actions: COMMUNITY_ACTIONS.map((action) => {
      const participatingHouseholds = Math.max(
        1,
        Math.round(households * action.typicalParticipation),
      );
      return {
        action,
        participatingHouseholds,
        pm25KgSeasonSaved: gramsToKg(
          action.pm25GramsWeeklyPerHousehold * participatingHouseholds * SMOG_SEASON_WEEKS,
        ),
      };
    }),
  };
}
