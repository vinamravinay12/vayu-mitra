import type { DaySummary } from '../air/summarize-day.js';
import { RESPIRATORY_CONDITIONS } from '../catalog/vulnerability.js';
import { isCarMode } from '../catalog/vocabulary.js';
import { leavesHome } from '../exposure/build-schedule.js';
import { cleanestFreeHour } from '../scenario/apply-effect.js';
import type { HouseholdProfile } from '../schemas/profile.js';
import type { HouseholdContext } from '../types/condition.js';
import type { MemberScenario, Scenario } from '../types/scenario.js';

/** Exercise this much dirtier than the member's cleanest free hour is worth moving. */
const MOVE_EXERCISE_THRESHOLD = 1.15;

/** Trips at or under this distance are walkable or cyclable. */
export const SHORT_TRIP_KM = 3;

/** Modes a short trip is usually made in that walking or cycling could replace. */
const isMotorisedTripMode = (mode: MemberScenario['commuteMode']): boolean =>
  isCarMode(mode) || mode === 'two-wheeler' || mode === 'auto-rickshaw';

/** True when some member exercises at an hour clearly dirtier than their cleanest free hour. */
function exerciseOffCleanHour(scenario: Scenario, pm25: readonly number[]): boolean {
  return scenario.members.some((member) => {
    if (member.outdoorExercise === 'none') {
      return false;
    }
    const clean = cleanestFreeHour(member, scenario.departHour, pm25);
    return (pm25[member.exerciseHour] ?? 0) > (pm25[clean] ?? 0) * MOVE_EXERCISE_THRESHOLD;
  });
}

/**
 * Flattens the profile and the day's air into named facts for catalogue
 * conditions. Every field a condition may read is defined here, and a
 * catalogue test checks that no condition reads a field that is missing.
 */
export function deriveContext(
  profile: HouseholdProfile,
  scenario: Scenario,
  day: DaySummary,
  pm25: readonly number[],
): HouseholdContext {
  const { members, home, lifestyle } = profile;
  const commuters = scenario.members.filter(leavesHome);
  const ageGroups = members.map((member) => member.ageGroup);
  const conditions = [...new Set(members.flatMap((member) => member.conditions))];
  return {
    aqiCategory: day.aqi.category,
    aqiValue: day.aqi.value,
    pm25Today: day.meanPm25,
    peakPm25: day.peak.pm25,
    ageGroups,
    conditions,
    hasInfant: ageGroups.includes('infant'),
    hasChild: ageGroups.some((group) => group === 'child' || group === 'teen'),
    hasSenior: ageGroups.includes('senior'),
    hasRespiratory: conditions.some((condition) => RESPIRATORY_CONDITIONS.includes(condition)),
    leavesHome: commuters.length > 0,
    commuteModes: [...new Set(commuters.map((member) => member.commuteMode))],
    shortVehicleTrip: commuters.some(
      (member) => isMotorisedTripMode(member.commuteMode) && member.commuteKm <= SHORT_TRIP_KM,
    ),
    exercisesOutdoors: members.some((member) => member.outdoorExercise !== 'none'),
    exerciseOffCleanHour: exerciseOffCleanHour(scenario, pm25),
    tightness: home.tightness,
    ventilation: home.ventilation,
    hasPurifier: home.hasPurifier,
    cookingFuel: home.cookingFuel,
    hasKitchenExhaust: home.hasKitchenExhaust,
    heating: home.heating,
    indoorSources: home.indoorSources,
    burnsWaste: lifestyle.burnsWaste,
    generatorHoursPerWeek: lifestyle.generatorHoursPerWeek,
    transitNearby: lifestyle.transitNearby,
    householdSize: members.length,
  };
}
