/**
 * Low-emission steps: what a household can change to add less to the smog,
 * picked from what it has told us (a car, its trips), with an estimate of
 * what each change keeps out of the air.
 */
import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import {
  CITY_KM_PER_HOUR,
  EMISSION_FACTORS,
  IDLING_CO2_KG_PER_HOUR,
} from '../catalog/impact-factors.js';
import type { Memory, RoutineFact } from '../memory/memory-schema.js';

/** What a step keeps out of the air, per trip or per ten minutes of waiting; an estimate. */
export interface Saving {
  readonly co2Kg: number;
  readonly pm25Milligrams: number;
  readonly per: 'trip' | '10 minutes';
}

/** One change, why it helps, and its saving when it can be estimated. */
export interface LowEmissionStep {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly saving: Saving | null;
}

/** Driving trips the metro, a bus or a shared car could replace. */
const DRIVEN = new Set(['commute', 'car-trip', 'school-run']);

/** Rounded for reading: CO₂ to a tenth of a kilogram, PM2.5 to ten milligrams. */
const rounded = (co2Grams: number, pm25Milligrams: number, per: Saving['per']): Saving => ({
  co2Kg: Math.round(co2Grams / 100) / 10,
  pm25Milligrams: Math.round(pm25Milligrams / 10) * 10,
  per,
});

/** Kilometres a routine covers by car in city traffic. */
const kmOf = (routine: RoutineFact): number => (routine.minutes / 60) * CITY_KM_PER_HOUR;

/** The trip swapped from a car to the metro, or a car shared by two families for the school run. */
function tripStep(routine: RoutineFact): LowEmissionStep {
  const km = kmOf(routine);
  const { car, metro } = EMISSION_FACTORS;
  const label = ACTIVITY_PROFILES[routine.activity].label;
  const about = `Your ${String(routine.minutes)}-minute ${label} is about ${String(Math.round(km))} km by car.`;
  if (routine.activity === 'school-run') {
    return {
      id: `share:${routine.id}`,
      title: 'Share the school run with another family',
      detail: `${about} Two families in one car means one car fewer at the school gate, where children breathe the exhaust.`,
      saving: rounded((km * car.co2GramsPerKm) / 2, (km * car.pm25MilligramsPerKm) / 2, 'trip'),
    };
  }
  return {
    id: `metro:${routine.id}`,
    title: `Take the metro or a bus for the ${label}`,
    detail: `${about} Per traveller, the metro emits a small fraction of a car, and its closed carriages are among the cleanest air on the way.`,
    saving: rounded(
      km * (car.co2GramsPerKm - metro.co2GramsPerKm),
      km * (car.pm25MilligramsPerKm - metro.pm25MilligramsPerKm),
      'trip',
    ),
  };
}

/** Engines off while waiting, for any household with a car. */
const NO_IDLING: LowEmissionStep = {
  id: 'no-idling',
  title: 'Switch the engine off while you wait',
  detail:
    'At the school gate, the market or a long signal, an idling engine puts exhaust straight into the air people are breathing.',
  saving: rounded((IDLING_CO2_KG_PER_HOUR * 1000) / 6, 0, '10 minutes'),
};

/** What every household can do in smog season, car or not. */
const FOR_EVERYONE: readonly LowEmissionStep[] = [
  {
    id: 'no-burning',
    title: 'Never burn leaves, waste or plastic',
    detail:
      'Open burning is one of winter’s biggest smog sources and its smoke stays at street level. Compost leaves, hand dry waste to the collector, and report fires you see to the municipality.',
    saving: null,
  },
  {
    id: 'clean-heat',
    title: 'Warm people, not rooms',
    detail:
      'Layers and a heavy quilt cost nothing to run. If you need a heater, use an electric one in a closed room; never an angithi, coal or wood, which fill the home and the lane with smoke and carbon monoxide.',
    saving: null,
  },
];

/**
 * The steps for this household: each driven routine first (with what
 * swapping it saves per trip), then engines off for car owners, then what
 * every household can do.
 */
export function lowEmissionSteps(memory: Memory): LowEmissionStep[] {
  const hasCar = memory.home.some((fact) => fact.feature === 'car');
  const trips = hasCar ? memory.routines.filter((routine) => DRIVEN.has(routine.activity)) : [];
  return [...trips.map(tripStep), ...(hasCar ? [NO_IDLING] : []), ...FOR_EVERYONE];
}
