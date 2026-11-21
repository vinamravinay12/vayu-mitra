import type { CookingFuel, HeatingType, IndoorSource } from './vocabulary.js';

/**
 * What burns inside a home, as data.
 *
 * `indoorAddUgM3` is the extra PM2.5 the source adds to the room, averaged over
 * the hours it is in use. Values are mid-range figures from indoor monitoring
 * studies (WHO household air pollution guidelines; Balakrishnan et al. on
 * Indian kitchens; Lee & Wang on incense; Liu et al. on mosquito coils) and are
 * documented in docs/ASSUMPTIONS.md. `hours` are local hours of use.
 *
 * Emission factors are daily totals released to the neighbourhood air.
 */
export interface HouseholdSourceProfile {
  readonly label: string;
  readonly indoorAddUgM3: number;
  readonly hours: readonly number[];
  readonly co2KgPerDay: number;
  readonly pm25GramsPerDay: number;
}

/** Meal times when the stove is on. */
const COOKING_HOURS = [7, 8, 13, 19, 20] as const;

/** Winter evenings and nights, when heaters run. */
const HEATING_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6] as const;

/** Night hours, when coils burn beside the bed. */
const NIGHT_HOURS = [22, 23, 0, 1, 2, 3, 4, 5] as const;

/** Waking hours at home. */
const WAKING_HOME_HOURS = [6, 7, 8, 9, 17, 18, 19, 20, 21, 22] as const;

/** One profile per cooking fuel. */
export const COOKING_PROFILES: Readonly<Record<CookingFuel, HouseholdSourceProfile>> = {
  lpg: {
    label: 'LPG cylinder',
    indoorAddUgM3: 40,
    hours: COOKING_HOURS,
    co2KgPerDay: 1.4,
    pm25GramsPerDay: 0.3,
  },
  'piped-gas': {
    label: 'Piped natural gas',
    indoorAddUgM3: 35,
    hours: COOKING_HOURS,
    co2KgPerDay: 1.2,
    pm25GramsPerDay: 0.2,
  },
  induction: {
    label: 'Induction or electric',
    indoorAddUgM3: 10,
    hours: COOKING_HOURS,
    co2KgPerDay: 1.1,
    pm25GramsPerDay: 0,
  },
  biomass: {
    label: 'Wood, dung or crop residue (chulha)',
    indoorAddUgM3: 300,
    hours: COOKING_HOURS,
    co2KgPerDay: 0.6,
    pm25GramsPerDay: 40,
  },
  kerosene: {
    label: 'Kerosene stove',
    indoorAddUgM3: 120,
    hours: COOKING_HOURS,
    co2KgPerDay: 1.6,
    pm25GramsPerDay: 6,
  },
};

/** One profile per heating type. Electric heating moves emissions to the grid. */
export const HEATING_PROFILES: Readonly<Record<HeatingType, HouseholdSourceProfile>> = {
  none: { label: 'No heating', indoorAddUgM3: 0, hours: [], co2KgPerDay: 0, pm25GramsPerDay: 0 },
  electric: {
    label: 'Electric heater',
    indoorAddUgM3: 0,
    hours: HEATING_HOURS,
    co2KgPerDay: 8.5,
    pm25GramsPerDay: 0,
  },
  gas: {
    label: 'Gas heater',
    indoorAddUgM3: 15,
    hours: HEATING_HOURS,
    co2KgPerDay: 3,
    pm25GramsPerDay: 0.3,
  },
  'coal-or-wood': {
    label: 'Coal or wood (angithi, bukhari)',
    indoorAddUgM3: 120,
    hours: HEATING_HOURS,
    co2KgPerDay: 6,
    pm25GramsPerDay: 25,
  },
  kerosene: {
    label: 'Kerosene heater',
    indoorAddUgM3: 60,
    hours: HEATING_HOURS,
    co2KgPerDay: 3,
    pm25GramsPerDay: 3,
  },
};

/** One profile per everyday indoor smoke source. */
export const INDOOR_SOURCE_PROFILES: Readonly<Record<IndoorSource, HouseholdSourceProfile>> = {
  incense: {
    label: 'Incense or dhoop',
    indoorAddUgM3: 80,
    hours: [6, 7, 18, 19],
    co2KgPerDay: 0,
    pm25GramsPerDay: 0.2,
  },
  'mosquito-coil': {
    label: 'Mosquito coil',
    indoorAddUgM3: 50,
    hours: NIGHT_HOURS,
    co2KgPerDay: 0,
    pm25GramsPerDay: 0.4,
  },
  'indoor-smoking': {
    label: 'Smoking indoors',
    indoorAddUgM3: 35,
    hours: WAKING_HOME_HOURS,
    co2KgPerDay: 0,
    pm25GramsPerDay: 0.1,
  },
  candles: {
    label: 'Candles or diyas',
    indoorAddUgM3: 10,
    hours: [18, 19],
    co2KgPerDay: 0,
    pm25GramsPerDay: 0.05,
  },
};

/** Open burning of household waste or leaves, per week it happens. */
export const WASTE_BURNING = { kgPerWeek: 2, pm25GramsPerKg: 8, co2KgPerKg: 1.5 } as const;

/** A small diesel generator set, per hour of running. */
export const GENERATOR = { co2KgPerHour: 0.8, pm25GramsPerHour: 1 } as const;
