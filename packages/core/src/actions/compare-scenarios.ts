import { roundTo1 } from '../air/summarize-day.js';
import { SMOG_SEASON_WEEKS } from '../catalog/exposure-constants.js';
import { AGE_WEIGHT, CONDITION_WEIGHT } from '../catalog/vulnerability.js';
import { estimateEmissions, type WeeklyEmissions } from '../emissions/estimate-emissions.js';
import { modelExposure, type MemberExposure } from '../exposure/model-exposure.js';
import type { Member } from '../schemas/profile.js';
import type { Scenario } from '../types/scenario.js';

/** How one member's day changes between two scenarios. */
export interface MemberImpact {
  readonly name: string;
  readonly beforeDoseUg: number;
  readonly afterDoseUg: number;
  readonly reductionPercent: number;
  readonly beforeCigarettes: number;
  readonly afterCigarettes: number;
}

/** The direct impact of a change: on the family's lungs and on the shared air. */
export interface Impact {
  readonly members: readonly MemberImpact[];
  /** Exposure cut across the family, weighted towards the most vulnerable. */
  readonly weightedReductionPercent: number;
  readonly pm25GramsWeeklySaved: number;
  readonly pm25GramsSeasonSaved: number;
  /** Negative when the change moves emissions to the power grid. */
  readonly co2KgWeeklySaved: number;
}

/** A scenario's modelled exposures and emissions. */
export interface ScenarioOutcome {
  readonly exposures: readonly MemberExposure[];
  readonly emissions: WeeklyEmissions;
}

/** How much more smog harms this member than a healthy adult. */
export function vulnerabilityWeight(member: Member): number {
  return member.conditions.reduce(
    (weight, condition) => weight + CONDITION_WEIGHT[condition],
    AGE_WEIGHT[member.ageGroup],
  );
}

/** Runs both models for one scenario. */
export const outcomeOf = (scenario: Scenario, pm25: readonly number[]): ScenarioOutcome => ({
  exposures: modelExposure(scenario, pm25),
  emissions: estimateEmissions(scenario),
});

/** Percentage cut from `before` to `after`, 0 when there was nothing to cut. */
const percentCut = (before: number, after: number): number =>
  before <= 0 ? 0 : ((before - after) / before) * 100;

/** Compares two outcomes for the same household. */
export function compareOutcomes(
  members: readonly Member[],
  before: ScenarioOutcome,
  after: ScenarioOutcome,
): Impact {
  const memberImpacts = before.exposures.map((exposure, index) => {
    const changed = after.exposures[index] ?? exposure;
    return {
      name: exposure.name,
      beforeDoseUg: Math.round(exposure.doseUg),
      afterDoseUg: Math.round(changed.doseUg),
      reductionPercent: roundTo1(percentCut(exposure.doseUg, changed.doseUg)),
      beforeCigarettes: roundTo1(exposure.cigarettesPerDay),
      afterCigarettes: roundTo1(changed.cigarettesPerDay),
    };
  });
  const weights = members.map(vulnerabilityWeight);
  const weightedBefore = before.exposures.reduce(
    (sum, exposure, index) => sum + exposure.doseUg * (weights[index] ?? 1),
    0,
  );
  const weightedAfter = after.exposures.reduce(
    (sum, exposure, index) => sum + exposure.doseUg * (weights[index] ?? 1),
    0,
  );
  const pm25Saved = before.emissions.pm25Grams - after.emissions.pm25Grams;
  return {
    members: memberImpacts,
    weightedReductionPercent: roundTo1(percentCut(weightedBefore, weightedAfter)),
    pm25GramsWeeklySaved: roundTo1(pm25Saved),
    pm25GramsSeasonSaved: Math.round(pm25Saved * SMOG_SEASON_WEEKS),
    co2KgWeeklySaved: roundTo1(before.emissions.co2Kg - after.emissions.co2Kg),
  };
}
