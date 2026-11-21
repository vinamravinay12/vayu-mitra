import {
  AQI_CATEGORIES,
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
  type AqiCategory,
  type Breakpoint,
} from '../catalog/aqi-bands.js';

/** The index value the scale tops out at. */
export const AQI_MAX = 500;

/** An index reading with the category it falls in and the pollutant driving it. */
export interface AqiReading {
  readonly value: number;
  readonly category: AqiCategory;
  readonly dominant: 'pm25' | 'pm10';
}

/** Linear interpolation of a concentration inside one band, rounded to a whole index. */
function interpolate(concentration: number, band: Breakpoint): number {
  const span = band.concentrationHigh - band.concentrationLow;
  const position = (concentration - band.concentrationLow) / span;
  return Math.round(band.indexLow + position * (band.indexHigh - band.indexLow));
}

/** The sub-index for one pollutant: 0–500, capped at the top of the scale. */
export function subIndex(concentration: number, breakpoints: readonly Breakpoint[]): number {
  const band = breakpoints.find((candidate) => concentration <= candidate.concentrationHigh);
  return band === undefined ? AQI_MAX : interpolate(Math.max(0, concentration), band);
}

/** The NAQI category an index value falls in. */
export function categoryOf(value: number): AqiCategory {
  const band = PM25_BREAKPOINTS.find((candidate) => value <= candidate.indexHigh);
  return band?.category ?? 'severe';
}

/**
 * The particulate AQI: the worse of the PM2.5 and PM10 sub-indices, as NAQI
 * reports it. Inputs are 24-hour means in µg/m³.
 */
export function computeAqi(pm25: number, pm10: number): AqiReading {
  const fine = subIndex(pm25, PM25_BREAKPOINTS);
  const coarse = subIndex(pm10, PM10_BREAKPOINTS);
  const value = Math.max(fine, coarse);
  return { value, category: categoryOf(value), dominant: fine >= coarse ? 'pm25' : 'pm10' };
}

/** Position of a category on the scale, 0 (good) to 5 (severe). */
export const categoryRank = (category: AqiCategory): number => AQI_CATEGORIES.indexOf(category);
