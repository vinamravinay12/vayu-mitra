import type { CommuteMode } from './vocabulary.js';

/**
 * How each way of travelling changes what a commuter breathes and emits.
 *
 * `exposureFactor` is the in-transit PM2.5 concentration relative to the
 * city's background level. On-road studies in Delhi (Goel et al., 2015;
 * Kumar et al., 2018) consistently rank open-air road modes highest and the
 * metro lowest, because traffic exhaust and road dust are densest at road level.
 *
 * Emission factors are per traveller-kilometre for shared modes and per
 * vehicle-kilometre for private ones; PM2.5 includes exhaust, brake, tyre and
 * re-suspended road dust. They are indicative values drawn from ARAI and
 * TERI inventories, documented in docs/ASSUMPTIONS.md, not measurements.
 */
export interface CommuteModeProfile {
  readonly label: string;
  readonly exposureFactor: number;
  readonly speedKmPerHour: number;
  /** Whether the traveller is working physically (walking, pedalling). */
  readonly activity: 'rest' | 'light' | 'moderate';
  readonly co2GramsPerKm: number;
  readonly pm25MilligramsPerKm: number;
  /** True when one vehicle is used by one household (cars, two-wheelers). */
  readonly privateVehicle: boolean;
}

/** One profile per commute mode in the vocabulary. */
export const COMMUTE_MODE_PROFILES: Readonly<Record<CommuteMode, CommuteModeProfile>> = {
  walk: {
    label: 'Walking',
    exposureFactor: 1.2,
    speedKmPerHour: 5,
    activity: 'light',
    co2GramsPerKm: 0,
    pm25MilligramsPerKm: 0,
    privateVehicle: false,
  },
  cycle: {
    label: 'Cycling',
    exposureFactor: 1.2,
    speedKmPerHour: 12,
    activity: 'moderate',
    co2GramsPerKm: 0,
    pm25MilligramsPerKm: 0,
    privateVehicle: false,
  },
  'two-wheeler': {
    label: 'Scooter or motorbike',
    exposureFactor: 1.3,
    speedKmPerHour: 25,
    activity: 'rest',
    co2GramsPerKm: 45,
    pm25MilligramsPerKm: 25,
    privateVehicle: true,
  },
  'auto-rickshaw': {
    label: 'Auto-rickshaw',
    exposureFactor: 1.5,
    speedKmPerHour: 20,
    activity: 'rest',
    co2GramsPerKm: 60,
    pm25MilligramsPerKm: 20,
    privateVehicle: false,
  },
  'car-petrol': {
    label: 'Petrol car',
    exposureFactor: 0.9,
    speedKmPerHour: 22,
    activity: 'rest',
    co2GramsPerKm: 150,
    pm25MilligramsPerKm: 25,
    privateVehicle: true,
  },
  'car-diesel': {
    label: 'Diesel car',
    exposureFactor: 0.9,
    speedKmPerHour: 22,
    activity: 'rest',
    co2GramsPerKm: 140,
    pm25MilligramsPerKm: 60,
    privateVehicle: true,
  },
  'car-cng': {
    label: 'CNG car',
    exposureFactor: 0.9,
    speedKmPerHour: 22,
    activity: 'rest',
    co2GramsPerKm: 120,
    pm25MilligramsPerKm: 20,
    privateVehicle: true,
  },
  'car-electric': {
    label: 'Electric car',
    exposureFactor: 0.9,
    speedKmPerHour: 22,
    activity: 'rest',
    co2GramsPerKm: 90,
    pm25MilligramsPerKm: 15,
    privateVehicle: true,
  },
  bus: {
    label: 'Bus',
    exposureFactor: 1.3,
    speedKmPerHour: 15,
    activity: 'rest',
    co2GramsPerKm: 25,
    pm25MilligramsPerKm: 8,
    privateVehicle: false,
  },
  metro: {
    label: 'Metro',
    exposureFactor: 0.6,
    speedKmPerHour: 30,
    activity: 'rest',
    co2GramsPerKm: 20,
    pm25MilligramsPerKm: 1,
    privateVehicle: false,
  },
};

/** Longest a single commute leg is modelled as taking, in hours. */
export const MAX_COMMUTE_HOURS = 2;
