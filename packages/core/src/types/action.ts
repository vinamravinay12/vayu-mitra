import type {
  ActionCategory,
  CommuteMode,
  CookingFuel,
  CostTier,
  EffortLevel,
  HeatingType,
  IndoorSource,
} from '../catalog/vocabulary.js';
import type { Condition } from './condition.js';

/**
 * A change an action makes to the household's day, as data.
 *
 * The engine applies effects to a scenario and re-runs the exposure and
 * emission models, so every impact the app shows is computed, never written
 * into the catalogue by hand.
 */
export type Effect =
  /** Move outdoor exercise to the cleanest daylight hour of the forecast. */
  | { readonly kind: 'move-exercise-to-clean-hour' }
  /** Exercise inside the home instead of outdoors. */
  | { readonly kind: 'exercise-indoors' }
  /** Scale what is breathed outdoors and in transit (a fitted mask), except for babies. */
  | { readonly kind: 'mask-outdoors'; readonly factor: number }
  /** Scale in-transit exposure for the given modes (cabin recirculation). */
  | {
      readonly kind: 'scale-commute';
      readonly modes: readonly CommuteMode[];
      readonly factor: number;
    }
  /** Switch commuters on `from` modes with trips up to `maxKm` to `to`. */
  | {
      readonly kind: 'switch-commute';
      readonly from: readonly CommuteMode[];
      readonly to: CommuteMode;
      readonly maxKm: number;
    }
  /** Share private vehicles with this many people. */
  | { readonly kind: 'share-vehicle'; readonly occupants: number }
  /** Run a filter in the bedroom; `reduction` is the share of indoor PM2.5 removed. */
  | { readonly kind: 'add-purifier'; readonly reduction: number }
  /** Scale how much outdoor smog leaks in (sealing gaps, wet dusting). */
  | { readonly kind: 'scale-infiltration'; readonly factor: number }
  /** Air the home only during the cleanest window of the day. */
  | { readonly kind: 'ventilate-in-clean-window' }
  /** Scale the indoor smoke from cooking (exhaust fan, lids). */
  | { readonly kind: 'scale-cooking-smoke'; readonly factor: number }
  /** Stop burning one indoor source. */
  | { readonly kind: 'remove-source'; readonly source: IndoorSource }
  | { readonly kind: 'switch-cooking'; readonly to: CookingFuel }
  | { readonly kind: 'switch-heating'; readonly to: HeatingType }
  | { readonly kind: 'stop-waste-burning' }
  /** Scale generator running hours (an inverter battery takes over). */
  | { readonly kind: 'scale-generator'; readonly factor: number };

/** One recommendation in the catalogue. */
export interface ActionDefinition {
  readonly id: string;
  readonly category: ActionCategory;
  readonly title: string;
  /** Concrete steps, written for a family, not an engineer. */
  readonly steps: readonly string[];
  /** Why it works, in one or two plain sentences. */
  readonly why: string;
  readonly cost: CostTier;
  readonly effort: EffortLevel;
  /** When this action applies to a household at all. */
  readonly when: Condition;
  readonly effects: readonly Effect[];
  /** Actions sharing a group are alternatives: choosing one replaces the others. */
  readonly group: string | null;
}
