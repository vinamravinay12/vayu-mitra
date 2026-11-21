import { WHO_PM25_24H_GUIDELINE, type AqiCategory } from '../catalog/aqi-bands.js';
import { CLEAN_WINDOW_HOURS, DAYLIGHT_WINDOW } from '../catalog/exposure-constants.js';
import { categoryOf, computeAqi, subIndex, type AqiReading } from '../aqi/compute-aqi.js';
import { PM25_BREAKPOINTS } from '../catalog/aqi-bands.js';
import type { DayAir } from './select-day.js';

/** One hour with its PM2.5 and the band that hour alone would fall in. */
export interface HourReading {
  readonly hour: number;
  readonly pm25: number;
  readonly category: AqiCategory;
}

/** The facts about a day's air that every recommendation is built on. */
export interface DaySummary {
  readonly date: string;
  readonly aqi: AqiReading;
  readonly meanPm25: number;
  readonly meanPm10: number;
  /** How many times the WHO 24-hour guideline the day's PM2.5 is. */
  readonly whoMultiple: number;
  readonly peak: HourReading;
  /** The cleanest stretch of daylight hours, for airing and exercise. */
  readonly cleanWindow: { readonly hours: readonly number[]; readonly meanPm25: number };
  readonly hourly: readonly HourReading[];
}

/** Arithmetic mean, 0 for an empty list. */
export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

/** Rounds to one decimal place, the precision every displayed number uses. */
export const roundTo1 = (value: number): number => Math.round(value * 10) / 10;

/** The band an hourly PM2.5 value would fall in, by the PM2.5 sub-index alone. */
const hourCategory = (pm25: number): AqiCategory => categoryOf(subIndex(pm25, PM25_BREAKPOINTS));

/** The run of `length` consecutive daylight hours with the lowest mean PM2.5. */
export function findCleanWindow(
  pm25: readonly number[],
  length: number = CLEAN_WINDOW_HOURS,
): { readonly hours: readonly number[]; readonly meanPm25: number } {
  const { firstHour, lastHour } = DAYLIGHT_WINDOW;
  let best = { hours: [] as number[], meanPm25: Number.POSITIVE_INFINITY };
  for (let start = firstHour; start + length - 1 <= lastHour; start += 1) {
    const hours = Array.from({ length }, (_unused, offset) => start + offset);
    const windowMean = mean(hours.map((hour) => pm25[hour] ?? 0));
    if (windowMean < best.meanPm25) {
      best = { hours, meanPm25: windowMean };
    }
  }
  return { hours: best.hours, meanPm25: roundTo1(best.meanPm25) };
}

/** Summarises one day of hourly air into the facts the plan reasons over. */
export function summarizeDay(day: DayAir): DaySummary {
  const meanPm25 = mean(day.pm25);
  const meanPm10 = mean(day.pm10);
  const hourly = day.pm25.map((pm25, hour) => ({
    hour,
    pm25: roundTo1(pm25),
    category: hourCategory(pm25),
  }));
  const peak = hourly.reduce((worst, reading) => (reading.pm25 > worst.pm25 ? reading : worst));
  return {
    date: day.date,
    aqi: computeAqi(meanPm25, meanPm10),
    meanPm25: roundTo1(meanPm25),
    meanPm10: roundTo1(meanPm10),
    whoMultiple: roundTo1(meanPm25 / WHO_PM25_24H_GUIDELINE),
    peak,
    cleanWindow: findCleanWindow(day.pm25),
    hourly,
  };
}
