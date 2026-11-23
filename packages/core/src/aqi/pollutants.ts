import {
  CO_BREAKPOINTS,
  NH3_BREAKPOINTS,
  NO2_BREAKPOINTS,
  O3_BREAKPOINTS,
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
  SO2_BREAKPOINTS,
  type Breakpoint,
} from '../catalog/aqi-bands.js';

/** The pollutants NAQI is computed from. */
export const POLLUTANTS = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3'] as const;

export type Pollutant = (typeof POLLUTANTS)[number];

/** Concentrations for whichever pollutants a station reported. */
export type PollutantReadings = Partial<Record<Pollutant, number>>;

/** NAQI breakpoints per pollutant. */
export const BREAKPOINTS: Readonly<Record<Pollutant, readonly Breakpoint[]>> = {
  pm25: PM25_BREAKPOINTS,
  pm10: PM10_BREAKPOINTS,
  no2: NO2_BREAKPOINTS,
  o3: O3_BREAKPOINTS,
  so2: SO2_BREAKPOINTS,
  co: CO_BREAKPOINTS,
  nh3: NH3_BREAKPOINTS,
};
