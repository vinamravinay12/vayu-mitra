import { findCleanWindow } from '../air/summarize-day.js';
import { freeDaylightHours, leavesHome } from '../exposure/build-schedule.js';
import type { Effect } from '../types/action.js';
import type { MemberScenario, Scenario } from '../types/scenario.js';

/**
 * The cleanest daylight hour this member is free to exercise in, or their
 * current hour when no free hour is cleaner.
 */
export function cleanestFreeHour(
  member: MemberScenario,
  departHour: number,
  pm25: readonly number[],
): number {
  return freeDaylightHours(member, departHour).reduce(
    (best, hour) => ((pm25[hour] ?? 0) < (pm25[best] ?? 0) ? hour : best),
    member.exerciseHour,
  );
}

/** Applies `change` to every member who exercises. */
function updateExercisers(
  scenario: Scenario,
  change: (member: MemberScenario) => MemberScenario,
): Scenario {
  return {
    ...scenario,
    members: scenario.members.map((member) =>
      member.outdoorExercise === 'none' ? member : change(member),
    ),
  };
}

/** Moves commuters on `from` modes with short enough trips to `to`. */
function switchCommute(
  scenario: Scenario,
  effect: Extract<Effect, { kind: 'switch-commute' }>,
): Scenario {
  return {
    ...scenario,
    members: scenario.members.map((member) =>
      leavesHome(member) &&
      effect.from.includes(member.commuteMode) &&
      member.commuteKm <= effect.maxKm
        ? { ...member, commuteMode: effect.to }
        : member,
    ),
  };
}

/** Effects on the home and its fuels, which never need the day's air. */
type HomeEffect = Extract<
  Effect,
  {
    readonly kind:
      | 'add-purifier'
      | 'scale-infiltration'
      | 'scale-cooking-smoke'
      | 'remove-source'
      | 'switch-cooking'
      | 'switch-heating'
      | 'stop-waste-burning'
      | 'scale-generator';
  }
>;

/** Effects that only change one household-wide value. */
function applyHomeEffect(scenario: Scenario, effect: HomeEffect): Scenario {
  switch (effect.kind) {
    case 'add-purifier':
      return {
        ...scenario,
        purifierReduction: Math.max(scenario.purifierReduction, effect.reduction),
      };
    case 'scale-infiltration':
      return { ...scenario, infiltration: scenario.infiltration * effect.factor };
    case 'scale-cooking-smoke':
      return {
        ...scenario,
        cookingSmokeFactor: Math.min(scenario.cookingSmokeFactor, effect.factor),
      };
    case 'remove-source':
      return {
        ...scenario,
        indoorSources: scenario.indoorSources.filter((source) => source !== effect.source),
      };
    case 'switch-cooking':
      return { ...scenario, cookingFuel: effect.to };
    case 'switch-heating':
      return { ...scenario, heating: effect.to };
    case 'stop-waste-burning':
      return { ...scenario, burnsWaste: false };
    case 'scale-generator':
      return { ...scenario, generatorHoursPerWeek: scenario.generatorHoursPerWeek * effect.factor };
  }
}

/**
 * Applies one effect to a scenario, returning a new scenario.
 *
 * Effects that depend on the day's air (moving exercise, timing ventilation)
 * read the outdoor PM2.5 series; the rest are fixed transformations.
 */
export function applyEffect(scenario: Scenario, effect: Effect, pm25: readonly number[]): Scenario {
  switch (effect.kind) {
    case 'move-exercise-to-clean-hour':
      return updateExercisers(scenario, (member) => ({
        ...member,
        exerciseHour: cleanestFreeHour(member, scenario.departHour, pm25),
      }));
    case 'exercise-indoors':
      return updateExercisers(scenario, (member) => ({ ...member, exerciseIndoors: true }));
    case 'mask-outdoors':
      return { ...scenario, maskFactor: Math.min(scenario.maskFactor, effect.factor) };
    case 'scale-commute': {
      const commuteFactors = { ...scenario.commuteFactors };
      for (const mode of effect.modes) {
        commuteFactors[mode] = effect.factor;
      }
      return { ...scenario, commuteFactors };
    }
    case 'switch-commute':
      return switchCommute(scenario, effect);
    case 'share-vehicle':
      return {
        ...scenario,
        vehicleOccupants: Math.max(scenario.vehicleOccupants, effect.occupants),
      };
    case 'ventilate-in-clean-window':
      return { ...scenario, windowHours: findCleanWindow(pm25).hours };
    default:
      return applyHomeEffect(scenario, effect);
  }
}

/** Applies a list of effects in order. */
export const applyEffects = (
  scenario: Scenario,
  effects: readonly Effect[],
  pm25: readonly number[],
): Scenario => effects.reduce((current, effect) => applyEffect(current, effect, pm25), scenario);
