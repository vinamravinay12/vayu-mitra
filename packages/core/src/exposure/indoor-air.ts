import {
  OPEN_WINDOW_RATIO,
  PURIFIER_HOURS,
  PURIFIER_OPEN_WINDOW_EFFECTIVENESS,
} from '../catalog/exposure-constants.js';
import {
  COOKING_PROFILES,
  HEATING_PROFILES,
  INDOOR_SOURCE_PROFILES,
} from '../catalog/household-sources.js';
import type { Scenario } from '../types/scenario.js';

/** PM2.5 that indoor sources add during `hour`, in µg/m³. */
export function indoorSourceLoad(scenario: Scenario, hour: number): number {
  const cooking = COOKING_PROFILES[scenario.cookingFuel];
  const heating = HEATING_PROFILES[scenario.heating];
  const cookingLoad = cooking.hours.includes(hour)
    ? cooking.indoorAddUgM3 * scenario.cookingSmokeFactor
    : 0;
  const heatingLoad = heating.hours.includes(hour) ? heating.indoorAddUgM3 : 0;
  const otherLoad = scenario.indoorSources.reduce((sum, source) => {
    const profile = INDOOR_SOURCE_PROFILES[source];
    return sum + (profile.hours.includes(hour) ? profile.indoorAddUgM3 : 0);
  }, 0);
  return cookingLoad + heatingLoad + otherLoad;
}

/** Share of indoor PM2.5 the purifier removes in `hour` (less while windows are open). */
export function purifierRemoval(scenario: Scenario, hour: number): number {
  if (scenario.purifierReduction === 0 || !PURIFIER_HOURS.includes(hour)) {
    return 0;
  }
  return scenario.windowHours.includes(hour)
    ? scenario.purifierReduction * PURIFIER_OPEN_WINDOW_EFFECTIVENESS
    : scenario.purifierReduction;
}

/**
 * Hourly PM2.5 inside the home, in µg/m³.
 *
 * A single-zone mass balance in its simplest steady-state form: outdoor air
 * leaks in at the infiltration ratio (or almost all of it with windows open),
 * indoor sources add on top, and a running purifier removes a share of the sum.
 */
export function indoorConcentrations(scenario: Scenario, outdoorPm25: readonly number[]): number[] {
  return outdoorPm25.map((outdoor, hour) => {
    const ratio = scenario.windowHours.includes(hour) ? OPEN_WINDOW_RATIO : scenario.infiltration;
    const beforeFiltering = outdoor * ratio + indoorSourceLoad(scenario, hour);
    return beforeFiltering * (1 - purifierRemoval(scenario, hour));
  });
}
