import { ACTIONS } from '../catalog/actions/index.js';
import { applyEffects } from '../scenario/apply-effect.js';
import type { ActionDefinition } from '../types/action.js';
import type { Scenario } from '../types/scenario.js';
import type { AssessedAction } from './assess-actions.js';

/**
 * Keeps only choices that are on offer, in catalogue order, with at most one
 * action per alternatives group (the first one listed wins).
 */
export function normalizeChoices(
  chosenIds: readonly string[],
  offered: readonly AssessedAction[],
): string[] {
  const offeredIds = new Set(offered.map((assessed) => assessed.action.id));
  const wanted = new Set(chosenIds);
  const usedGroups = new Set<string>();
  return ACTIONS.filter((action) => offeredIds.has(action.id) && wanted.has(action.id))
    .filter((action) => {
      if (action.group === null) return true;
      if (usedGroups.has(action.group)) return false;
      usedGroups.add(action.group);
      return true;
    })
    .map((action) => action.id);
}

/**
 * Adds or removes one choice. Adding an action removes its alternatives, so
 * a family never "chooses" both a purifier and a DIY filter for one room.
 */
export function toggleChoice(
  chosenIds: readonly string[],
  actionId: string,
  offered: readonly AssessedAction[],
): string[] {
  if (chosenIds.includes(actionId)) {
    return chosenIds.filter((id) => id !== actionId);
  }
  const target = offered.find((assessed) => assessed.action.id === actionId)?.action;
  if (target === undefined) {
    return [...chosenIds];
  }
  const groupOf = new Map(offered.map((assessed) => [assessed.action.id, assessed.action.group]));
  const kept = chosenIds.filter((id) => target.group === null || groupOf.get(id) !== target.group);
  return normalizeChoices([...kept, actionId], offered);
}

/** The chosen actions' definitions in catalogue order. */
export function chosenDefinitions(chosenIds: readonly string[]): ActionDefinition[] {
  const wanted = new Set(chosenIds);
  return ACTIONS.filter((action) => wanted.has(action.id));
}

/** The scenario with every chosen action applied, in catalogue order. */
export function applyChoices(
  baseline: Scenario,
  chosenIds: readonly string[],
  pm25: readonly number[],
): Scenario {
  return chosenDefinitions(chosenIds).reduce(
    (scenario, action) => applyEffects(scenario, action.effects, pm25),
    baseline,
  );
}
