import {
  AQI_CATEGORIES,
  PM10_BREAKPOINTS,
  PM25_BREAKPOINTS,
  type AqiCategory,
  type Breakpoint,
} from '../catalog/aqi-bands.js';
import { BREAKPOINTS, POLLUTANTS, type Pollutant, type PollutantReadings } from './pollutants.js';

/** The index value the scale tops out at. */
export const AQI_MAX = 500;

/** An index reading with the category it falls in and the pollutant driving it. */
export interface AqiReading {
  readonly value: number;
  readonly category: AqiCategory;
  readonly dominant: Pollutant;
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

/** CPCB computes NAQI only from at least this many pollutants. */
export const MIN_NAQI_POLLUTANTS = 3;

/**
 * The full NAQI from a station's readings: the worst sub-index across every
 * pollutant reported. CPCB requires at least three pollutants, one of them
 * PM2.5 or PM10; with fewer, this returns null rather than a misleading index.
 */
export function computeNaqi(readings: PollutantReadings): AqiReading | null {
  const subIndices = POLLUTANTS.flatMap((pollutant) => {
    const concentration = readings[pollutant];
    return concentration === undefined
      ? []
      : [{ pollutant, value: subIndex(concentration, BREAKPOINTS[pollutant]) }];
  });
  const hasParticulate = subIndices.some(
    ({ pollutant }) => pollutant === 'pm25' || pollutant === 'pm10',
  );
  if (subIndices.length < MIN_NAQI_POLLUTANTS || !hasParticulate) {
    return null;
  }
  const worst = subIndices.reduce((best, next) => (next.value > best.value ? next : best));
  return { value: worst.value, category: categoryOf(worst.value), dominant: worst.pollutant };
}

/**
 * The particulate index when only PM2.5 and/or PM10 are known, as from a
 * forecast model or a WAQI station. Null when neither is.
 */
export function particulateAqi(
  pm25: number | undefined,
  pm10: number | undefined,
): AqiReading | null {
  if (pm25 !== undefined && pm10 !== undefined) {
    return computeAqi(pm25, pm10);
  }
  if (pm25 !== undefined) {
    const value = subIndex(pm25, PM25_BREAKPOINTS);
    return { value, category: categoryOf(value), dominant: 'pm25' };
  }
  if (pm10 !== undefined) {
    const value = subIndex(pm10, PM10_BREAKPOINTS);
    return { value, category: categoryOf(value), dominant: 'pm10' };
  }
  return null;
}
