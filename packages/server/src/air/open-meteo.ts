import { MAX_CONCENTRATION, type AirHour, type AirSnapshot, type Place } from '@vayu/core';
import { z } from 'zod';
import { UpstreamError, type FetchJson } from './fetch-json.js';

/**
 * Adapters for Open-Meteo's free, keyless APIs: the CAMS-based air-quality
 * forecast and the GeoNames-based geocoder. Upstream answers are validated
 * with Zod and normalised before anything else sees them.
 */

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Days of forecast to fetch: today and tomorrow. */
const FORECAST_DAYS = 2;

/** Places returned for one search. */
export const MAX_PLACES = 5;

/** Hourly values may be null where the model has no data. */
const nullableNumbers = z.array(z.number().nullable());

const airResponseSchema = z.object({
  timezone: z.string().min(1).max(64),
  utc_offset_seconds: z.number().int(),
  hourly: z.object({ time: z.array(z.string()), pm2_5: nullableNumbers, pm10: nullableNumbers }),
});

const geocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

/** Keeps a concentration inside the range the engine accepts. */
const clampConcentration = (value: number): number =>
  Math.min(MAX_CONCENTRATION, Math.max(0, Math.round(value * 10) / 10));

/** Builds the hourly series, dropping hours with no PM2.5 and estimating missing PM10. */
function toHours(hourly: z.infer<typeof airResponseSchema>['hourly']): AirHour[] {
  return hourly.time.flatMap((time, index) => {
    const pm25 = hourly.pm2_5[index];
    if (pm25 === null || pm25 === undefined) {
      return [];
    }
    // Winter PM10 in north India runs about 1.6× PM2.5 when the model omits it.
    const pm10 = hourly.pm10[index] ?? pm25 * 1.6;
    return [
      { time: time.slice(0, 16), pm25: clampConcentration(pm25), pm10: clampConcentration(pm10) },
    ];
  });
}

/** Coordinates rounded to ~1 km: enough for a city forecast, and the precise location is never sent. */
export const roundCoordinate = (value: number): number => Math.round(value * 100) / 100;

/** Fetches and normalises the hourly PM2.5/PM10 forecast for a point. */
export async function fetchAirForecast(
  fetchJson: FetchJson,
  latitude: number,
  longitude: number,
  now: Date,
): Promise<AirSnapshot> {
  const query = new URLSearchParams({
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    hourly: 'pm2_5,pm10',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  const parsed = airResponseSchema.safeParse(
    await fetchJson(`${AIR_QUALITY_URL}?${query.toString()}`),
  );
  if (!parsed.success) {
    throw new UpstreamError('Air-quality forecast had an unexpected shape');
  }
  const hours = toHours(parsed.data.hourly);
  if (hours.length < 24) {
    throw new UpstreamError('Air-quality forecast has no data for this place');
  }
  return {
    timezone: parsed.data.timezone,
    utcOffsetSeconds: parsed.data.utc_offset_seconds,
    hours,
    source: 'open-meteo',
    fetchedAt: now.toISOString(),
  };
}

/** Searches places by name. */
export async function searchPlaces(fetchJson: FetchJson, name: string): Promise<Place[]> {
  const query = new URLSearchParams({
    name,
    count: String(MAX_PLACES),
    language: 'en',
    format: 'json',
  });
  const parsed = geocodeResponseSchema.safeParse(
    await fetchJson(`${GEOCODING_URL}?${query.toString()}`),
  );
  if (!parsed.success) {
    throw new UpstreamError('Place search had an unexpected shape');
  }
  return (parsed.data.results ?? []).map((result) => ({
    name: result.name.slice(0, 80),
    region: (result.admin1 ?? '').slice(0, 80),
    country: (result.country ?? '').slice(0, 80),
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
  }));
}
