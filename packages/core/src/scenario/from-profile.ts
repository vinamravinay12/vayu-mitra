import { INFILTRATION, WINDOW_HOURS } from '../catalog/exposure-constants.js';
import type { HouseholdProfile } from '../schemas/profile.js';
import type { Scenario } from '../types/scenario.js';

/** A purifier the family already owns, run the usual way. */
export const OWNED_PURIFIER_REDUCTION = 0.5;

/** The kitchen exhaust a family already has removes this share of cooking smoke. */
export const OWNED_EXHAUST_FACTOR = 0.4;

/** The household's day as it is today, before any change. */
export function scenarioFromProfile(profile: HouseholdProfile): Scenario {
  const { home, lifestyle } = profile;
  return {
    members: profile.members.map((member) => ({ ...member, exerciseIndoors: false })),
    maskFactor: 1,
    commuteFactors: {},
    vehicleOccupants: 1,
    infiltration: INFILTRATION[home.tightness],
    windowHours: WINDOW_HOURS[home.ventilation],
    purifierReduction: home.hasPurifier ? OWNED_PURIFIER_REDUCTION : 0,
    cookingFuel: home.cookingFuel,
    cookingSmokeFactor: home.hasKitchenExhaust ? OWNED_EXHAUST_FACTOR : 1,
    heating: home.heating,
    indoorSources: home.indoorSources,
    burnsWaste: lifestyle.burnsWaste,
    generatorHoursPerWeek: lifestyle.generatorHoursPerWeek,
    workDaysPerWeek: lifestyle.workDaysPerWeek,
    departHour: lifestyle.departHour,
  };
}
