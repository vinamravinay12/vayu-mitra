import type { ActionDefinition } from '../../types/action.js';
import { INDOOR_ACTIONS } from './indoor.js';
import { ROUTINE_ACTIONS } from './routine.js';
import { SUSTAINABLE_ACTIONS } from './sustainable.js';

/** Every action the engine can recommend, in a stable order. */
export const ACTIONS: readonly ActionDefinition[] = [
  ...ROUTINE_ACTIONS,
  ...INDOOR_ACTIONS,
  ...SUSTAINABLE_ACTIONS,
];

/** Actions by id, for O(1) lookup when the user toggles a choice. */
export const ACTIONS_BY_ID: ReadonlyMap<string, ActionDefinition> = new Map(
  ACTIONS.map((action) => [action.id, action]),
);
