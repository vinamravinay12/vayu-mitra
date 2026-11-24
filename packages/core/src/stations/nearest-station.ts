/** Choosing the nearest fresh official station, and its index. */
import { computeNaqi, particulateAqi, type AqiReading } from '../aqi/compute-aqi.js';
import type { StationReading } from './station.js';

/** Mean Earth radius in km. */
const EARTH_RADIUS_KM = 6371;

/** A station further than this does not describe the family's air. */
export const MAX_STATION_DISTANCE_KM = 25;

/** A reading older than this is not "now" any more. CPCB publishes hourly, often late. */
const MAX_READING_AGE_MS = 3 * 60 * 60_000;

/** Prefer CPCB, the official monitor, when two stations are about as close. */
const SOURCE_PREFERENCE_KM = 2;

/** Degrees to radians. */
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(
  from: { readonly latitude: number; readonly longitude: number },
  to: { readonly latitude: number; readonly longitude: number },
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * A station's index. CPCB readings carry every pollutant, so they get the
 * full NAQI; WAQI only gives reliable particulates, so it gets the particulate
 * index. Either way the number is on India's scale.
 */
export function stationAqi(station: StationReading): AqiReading | null {
  const full = station.source === 'waqi' ? null : computeNaqi(station.pollutants);
  return full ?? particulateAqi(station.pollutants.pm25, station.pollutants.pm10);
}

/** The station chosen for a place, with how far away it is and its index. */
export interface NearestStation {
  readonly station: StationReading;
  readonly distanceKm: number;
  readonly aqi: AqiReading;
}

/**
 * The closest fresh station with a usable index, within reach. A CPCB station
 * wins over a WAQI one that is less than 2 km closer, since CPCB is the
 * official monitor. Null when nothing nearby has reported recently.
 */
export function nearestStation(
  place: { readonly latitude: number; readonly longitude: number },
  stations: readonly StationReading[],
  now: Date,
): NearestStation | null {
  const candidates = stations.flatMap((station) => {
    const age = now.getTime() - Date.parse(station.observedAt);
    const aqi = stationAqi(station);
    const distance = distanceKm(place, station);
    return age <= MAX_READING_AGE_MS && aqi !== null && distance <= MAX_STATION_DISTANCE_KM
      ? [{ station, distanceKm: Math.round(distance * 10) / 10, aqi }]
      : [];
  });
  const score = (candidate: NearestStation): number =>
    candidate.distanceKm - (candidate.station.source === 'cpcb' ? SOURCE_PREFERENCE_KM : 0);
  return candidates.reduce<NearestStation | null>(
    (best, next) => (best === null || score(next) < score(best) ? next : best),
    null,
  );
}
