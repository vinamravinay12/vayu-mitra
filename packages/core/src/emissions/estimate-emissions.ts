import { COMMUTE_MODE_PROFILES } from '../catalog/commute-modes.js';
import {
  COOKING_PROFILES,
  GENERATOR,
  HEATING_PROFILES,
  INDOOR_SOURCE_PROFILES,
  WASTE_BURNING,
} from '../catalog/household-sources.js';
import type { Scenario } from '../types/scenario.js';
import { leavesHome } from '../exposure/build-schedule.js';

/** Sources the household's emissions are split into. */
export const EMISSION_SOURCES = [
  'commute',
  'cooking',
  'heating',
  'indoor',
  'waste',
  'generator',
] as const;

export type EmissionSource = (typeof EMISSION_SOURCES)[number];

/** One quantity split by source. */
export type BySource = Readonly<Record<EmissionSource, number>>;

/** What the household releases into the shared air in a week of smog season. */
export interface WeeklyEmissions {
  readonly pm25Grams: number;
  readonly co2Kg: number;
  readonly pm25BySource: BySource;
  readonly co2BySource: BySource;
}

/** Days in a week, for turning daily sources into weekly totals. */
const DAYS_PER_WEEK = 7;

/** Grams and kilograms of commuting per week: two legs per working day. */
function commuteTotals(scenario: Scenario): { pm25Grams: number; co2Kg: number } {
  return scenario.members.filter(leavesHome).reduce(
    (totals, member) => {
      const profile = COMMUTE_MODE_PROFILES[member.commuteMode];
      const sharing = profile.privateVehicle ? scenario.vehicleOccupants : 1;
      const weeklyKm = 2 * member.commuteKm * scenario.workDaysPerWeek;
      return {
        pm25Grams: totals.pm25Grams + (weeklyKm * profile.pm25MilligramsPerKm) / 1000 / sharing,
        co2Kg: totals.co2Kg + (weeklyKm * profile.co2GramsPerKm) / 1000 / sharing,
      };
    },
    { pm25Grams: 0, co2Kg: 0 },
  );
}

/** Weekly totals from indoor smoke sources (incense, coils and the like). */
function indoorTotals(scenario: Scenario): { pm25Grams: number; co2Kg: number } {
  return scenario.indoorSources.reduce(
    (totals, source) => ({
      pm25Grams: totals.pm25Grams + INDOOR_SOURCE_PROFILES[source].pm25GramsPerDay * DAYS_PER_WEEK,
      co2Kg: totals.co2Kg + INDOOR_SOURCE_PROFILES[source].co2KgPerDay * DAYS_PER_WEEK,
    }),
    { pm25Grams: 0, co2Kg: 0 },
  );
}

/** Adds up a by-source record. */
const total = (bySource: BySource): number =>
  EMISSION_SOURCES.reduce((sum, source) => sum + bySource[source], 0);

/**
 * Estimates the household's weekly PM2.5 and CO2 emissions.
 *
 * PM2.5 is what feeds the local smog; CO2 is reported beside it so a change
 * that cuts smog by moving emissions to the power grid shows that trade-off.
 */
export function estimateEmissions(scenario: Scenario): WeeklyEmissions {
  const commute = commuteTotals(scenario);
  const indoor = indoorTotals(scenario);
  const cooking = COOKING_PROFILES[scenario.cookingFuel];
  const heating = HEATING_PROFILES[scenario.heating];
  const wasteKg = scenario.burnsWaste ? WASTE_BURNING.kgPerWeek : 0;
  const pm25BySource: BySource = {
    commute: commute.pm25Grams,
    cooking: cooking.pm25GramsPerDay * DAYS_PER_WEEK,
    heating: heating.pm25GramsPerDay * DAYS_PER_WEEK,
    indoor: indoor.pm25Grams,
    waste: wasteKg * WASTE_BURNING.pm25GramsPerKg,
    generator: scenario.generatorHoursPerWeek * GENERATOR.pm25GramsPerHour,
  };
  const co2BySource: BySource = {
    commute: commute.co2Kg,
    cooking: cooking.co2KgPerDay * DAYS_PER_WEEK,
    heating: heating.co2KgPerDay * DAYS_PER_WEEK,
    indoor: indoor.co2Kg,
    waste: wasteKg * WASTE_BURNING.co2KgPerKg,
    generator: scenario.generatorHoursPerWeek * GENERATOR.co2KgPerHour,
  };
  return { pm25Grams: total(pm25BySource), co2Kg: total(co2BySource), pm25BySource, co2BySource };
}
