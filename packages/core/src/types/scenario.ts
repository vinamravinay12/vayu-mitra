import type { CommuteMode, CookingFuel, HeatingType, IndoorSource } from '../catalog/vocabulary.js';
import type { Member } from '../schemas/profile.js';

/** A member as the models see them, with the choices actions can change. */
export interface MemberScenario extends Member {
  readonly exerciseIndoors: boolean;
}

/**
 * The household's day as model inputs. A profile becomes a baseline scenario;
 * each action is a pure transformation of a scenario, and the exposure and
 * emission models read only this — so "before" and "after" are always computed
 * by exactly the same code.
 */
export interface Scenario {
  readonly members: readonly MemberScenario[];
  /** Multiplier on outdoor and in-transit concentrations (1 without a mask). */
  readonly maskFactor: number;
  /** Extra multipliers on in-transit exposure, by mode. */
  readonly commuteFactors: Readonly<Partial<Record<CommuteMode, number>>>;
  /** People sharing each private vehicle trip. */
  readonly vehicleOccupants: number;
  /** Indoor/outdoor ratio with windows shut. */
  readonly infiltration: number;
  /** Local hours the windows are open. */
  readonly windowHours: readonly number[];
  /** Share of bedroom PM2.5 a purifier removes while running (0 without one). */
  readonly purifierReduction: number;
  readonly cookingFuel: CookingFuel;
  /** Multiplier on indoor cooking smoke (exhaust, lids). */
  readonly cookingSmokeFactor: number;
  readonly heating: HeatingType;
  readonly indoorSources: readonly IndoorSource[];
  readonly burnsWaste: boolean;
  readonly generatorHoursPerWeek: number;
  readonly workDaysPerWeek: number;
  readonly departHour: number;
}
