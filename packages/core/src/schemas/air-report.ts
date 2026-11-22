import { z } from 'zod';
import { AQI_CATEGORIES } from '../catalog/aqi-bands.js';
import { POLLUTANTS } from '../aqi/pollutants.js';
import { MAX_CONCENTRATION, STATION_SOURCES } from '../stations/station.js';

/** A place resolved by the geocoder; coordinates pick the station and forecast. */
export const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  region: z.string().trim().max(80),
  country: z.string().trim().max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Where the hourly outlook came from. */
export const FORECAST_SOURCES = ['open-meteo', 'fixture'] as const;

const aqiValue = z.number().int().min(0).max(500);
const concentration = z.number().min(0).max(MAX_CONCENTRATION);

/** One local hour of the outlook, already anchored to the station. */
export const reportHourSchema = z.object({
  /** Local wall-clock time, `YYYY-MM-DDTHH:00`. */
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/),
  pm25: concentration,
  pm10: concentration,
  aqi: aqiValue,
  category: z.enum(AQI_CATEGORIES),
});

/** Everything the app shows and reasons over for one place, right now. */
export const airReportSchema = z.object({
  timezone: z.string().min(1).max(64),
  utcOffsetSeconds: z
    .number()
    .int()
    .min(-14 * 3600)
    .max(14 * 3600),
  fetchedAt: z.iso.datetime(),
  current: z.object({
    aqi: aqiValue,
    category: z.enum(AQI_CATEGORIES),
    dominant: z.enum(POLLUTANTS),
    /** `station`: an official monitor measured it. `forecast`: no fresh station nearby. */
    basis: z.enum(['station', 'forecast']),
  }),
  station: z
    .object({
      name: z.string().min(1).max(160),
      source: z.enum(STATION_SOURCES),
      distanceKm: z.number().min(0).max(100),
      observedAt: z.iso.datetime({ offset: true }),
    })
    .nullable(),
  hours: z.array(reportHourSchema).min(1).max(48),
  forecastSource: z.enum(FORECAST_SOURCES),
});

export type Place = z.infer<typeof placeSchema>;
export type ReportHour = z.infer<typeof reportHourSchema>;
export type AirReport = z.infer<typeof airReportSchema>;
export type ForecastSource = (typeof FORECAST_SOURCES)[number];

/** The hour the report starts at: now. The schema guarantees there is one. */
export function nowHour(report: { readonly hours: readonly ReportHour[] }): ReportHour {
  const [first] = report.hours;
  if (first === undefined) {
    throw new Error('An air report always has at least one hour');
  }
  return first;
}
