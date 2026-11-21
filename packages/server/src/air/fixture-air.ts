import { localClock, type AirSnapshot, type Place } from '@vayu/core';

/**
 * A fixed, offline stand-in for the forecast and the geocoder, for tests, CI
 * end-to-end runs and keyless demos. Production refuses to start in this mode
 * (see config.ts), so a family never sees made-up air.
 */

/** India Standard Time, which every fixture place uses. */
const IST_OFFSET_SECONDS = 19_800;

/** Places the fixture geocoder knows. */
export const FIXTURE_PLACES: readonly Place[] = [
  { name: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.61, longitude: 77.21 },
  { name: 'Lucknow', region: 'Uttar Pradesh', country: 'India', latitude: 26.85, longitude: 80.95 },
  { name: 'Kolkata', region: 'West Bengal', country: 'India', latitude: 22.57, longitude: 88.36 },
  { name: 'Mumbai', region: 'Maharashtra', country: 'India', latitude: 19.08, longitude: 72.88 },
];

/** Fixture places whose name contains the query, ignoring case. */
export function searchFixturePlaces(query: string): Place[] {
  const wanted = query.trim().toLowerCase();
  return FIXTURE_PLACES.filter((place) => place.name.toLowerCase().includes(wanted));
}

/** A winter mean that worsens towards the Indo-Gangetic plain in the north. */
const winterMean = (latitude: number): number => Math.round(60 + Math.max(0, latitude - 18) * 9);

/**
 * Two days of a winter diurnal curve: smog trapped under the night-time
 * inversion peaks around 02:00 and clears most around 14:00.
 */
export function fixtureForecast(latitude: number, now: Date): AirSnapshot {
  const { date } = localClock(now, IST_OFFSET_SECONDS);
  const start = new Date(`${date}T00:00:00Z`);
  const mean = winterMean(latitude);
  const hours = Array.from({ length: 48 }, (_unused, index) => {
    const time = new Date(start.getTime() + index * 3_600_000).toISOString().slice(0, 16);
    const swing = Math.cos((2 * Math.PI * ((index % 24) - 2)) / 24);
    const pm25 = Math.round(mean * (1 + 0.45 * swing) * 10) / 10;
    return { time, pm25, pm10: Math.round(pm25 * 1.6 * 10) / 10 };
  });
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: IST_OFFSET_SECONDS,
    hours,
    source: 'fixture',
    fetchedAt: now.toISOString(),
  };
}
