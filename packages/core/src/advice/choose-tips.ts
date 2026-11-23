import type { Setting } from '../catalog/activities.js';
import { RESPIRATORY_CONDITIONS, type Activity, type HomeFeature } from '../catalog/vocabulary.js';
import type { PersonFact } from '../memory/memory-schema.js';
import type { AdviceTip } from './tips.js';

/** What the precautions depend on. */
export interface TipContext {
  readonly rank: number;
  readonly sensitive: boolean;
  readonly people: readonly PersonFact[];
  readonly home: readonly HomeFeature[];
  readonly activity: Activity;
  readonly setting: Setting;
}

/** A mask when the air is poor, or moderate for someone sensitive. */
const needsMask = ({ rank, sensitive }: TipContext): boolean =>
  rank >= 3 || (sensitive && rank >= 2);

/** Precautions for being outside: a mask, an easier pace, distance from traffic. */
function outdoorTips(context: TipContext): AdviceTip[] {
  const { rank, home } = context;
  const mask: AdviceTip[] = needsMask(context)
    ? [home.includes('n95-masks') ? 'wear-n95' : 'get-n95']
    : [];
  return [...mask, ...(rank >= 2 ? (['ease-off', 'avoid-traffic'] as const) : [])];
}

/** Precautions in a closed vehicle: the cabin, the traffic, the stops. */
function vehicleTips(context: TipContext): AdviceTip[] {
  return [
    ...(context.rank >= 2 ? (['recirculate', 'avoid-rush-hour'] as const) : []),
    ...(needsMask(context) ? (['mask-for-stops'] as const) : []),
  ];
}

/** Precautions at home: keep the bad air out. */
const homeTips = ({ rank, home }: TipContext): AdviceTip[] =>
  rank >= 3 ? [home.includes('air-purifier') ? 'run-purifier' : 'keep-windows-shut'] : [];

/** On a school run by car in poor air, the car is the shelter. */
const schoolCarTips = ({ rank, home, activity }: TipContext): AdviceTip[] =>
  activity === 'school-run' && home.includes('car') && rank >= 3 ? ['recirculate'] : [];

/** The precautions that apply, in the order they matter. */
export function chooseTips(context: TipContext): AdviceTip[] {
  const lungs = context.people.some((person) =>
    person.conditions.some((condition) => RESPIRATORY_CONDITIONS.includes(condition)),
  );
  const inhaler: AdviceTip[] = lungs ? ['carry-inhaler'] : [];
  switch (context.setting) {
    case 'outdoors':
      return [...outdoorTips(context), ...inhaler, ...homeTips(context), ...schoolCarTips(context)];
    case 'in-vehicle':
      return [...vehicleTips(context), ...inhaler];
    case 'home':
      return homeTips(context);
  }
}
