import { localClock, type Forecast, type Place, type StationReading } from '@vayu/core';

/**
 * A fixed, offline stand-in for the forecast, the stations and the geocoder,
 * for tests, CI end-to-end runs and keyless demos. Production refuses to start
 * in this mode (see config.ts), so a family never sees made-up air.
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

/** The fixture curve: smog peaks around 02:00 under the night inversion, clears most at 14:00. */
const pm25At = (latitude: number, hour: number): number =>
  Math.round(winterMean(latitude) * (1 + 0.45 * Math.cos((2 * Math.PI * (hour - 2)) / 24)) * 10) /
  10;

/** Three days of the fixture curve from local midnight today. */
export function fixtureForecast(latitude: number, now: Date): Forecast {
  const { date } = localClock(now, IST_OFFSET_SECONDS);
  const start = new Date(`${date}T00:00:00Z`).getTime();
  const hours = Array.from({ length: 72 }, (_unused, index) => {
    const pm25 = pm25At(latitude, index % 24);
    return {
      time: new Date(start + index * 3_600_000).toISOString().slice(0, 16),
      pm25,
      pm10: Math.round(pm25 * 1.6 * 10) / 10,
    };
  });
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: IST_OFFSET_SECONDS,
    hours,
    source: 'fixture',
  };
}

/**
 * One fixture station beside each fixture place, reading 20% above the model,
 * so tests and demos show the anchoring at work.
 */
export function fixtureStations(now: Date): StationReading[] {
  const clock = localClock(now, IST_OFFSET_SECONDS);
  const observedAt = `${clock.date}T${String(clock.hour).padStart(2, '0')}:00:00+05:30`;
  return FIXTURE_PLACES.map((place) => {
    const pm25 = Math.round(pm25At(place.latitude, clock.hour) * 1.2 * 10) / 10;
    return {
      id: `fixture-${place.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${place.name} (sample station)`,
      latitude: place.latitude + 0.01,
      longitude: place.longitude + 0.01,
      source: 'fixture',
      observedAt,
      pollutants: { pm25, pm10: Math.round(pm25 * 1.6 * 10) / 10, no2: 45, so2: 10 },
    };
  });
}
