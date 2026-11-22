import {
  anchorForecast,
  nearestStation,
  type AirReport,
  type Forecast,
  type Place,
  type StationReading,
} from '@vayu/core';
import { createTtlCache, type TtlCache } from '../cache/ttl-cache.js';
import { describeCause, logEvent } from '../logging/log.js';
import { UpstreamError } from './fetch-json.js';
import { roundCoordinate } from './open-meteo.js';

/** What the routes, the chat and the alert job need from the outside world's air data. */
export interface AirService {
  report(latitude: number, longitude: number): Promise<AirReport>;
  places(query: string): Promise<Place[]>;
}

/** A named source of station readings near a point. */
export interface StationSource {
  readonly name: string;
  readonly near: (latitude: number, longitude: number) => Promise<StationReading[]>;
}

/** Where the data comes from: live adapters, or fixtures. */
export interface AirSources {
  readonly forecast: (latitude: number, longitude: number) => Promise<Forecast>;
  readonly stations: readonly StationSource[];
  readonly places: (query: string) => Promise<Place[]>;
  readonly now: () => Date;
}

/** Stations publish hourly; ten minutes keeps "now" fresh and spares the upstreams. */
const REPORT_TTL_MS = 10 * 60_000;

/** Place names do not change; a day is plenty. */
const PLACES_TTL_MS = 24 * 60 * 60_000;

const CACHE_ENTRIES = 1000;

/** Wraps a loader with a cache, sharing one in-flight request per key. Failures are not kept. */
export function cached<V>(
  cache: TtlCache<Promise<V>>,
  key: string,
  load: () => Promise<V>,
): Promise<V> {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => {
    cache.delete(key);
  });
  return pending;
}

/** A station source that fails is logged and treated as reporting nothing. */
async function readingsFrom(
  source: StationSource,
  latitude: number,
  longitude: number,
): Promise<StationReading[]> {
  try {
    return await source.near(latitude, longitude);
  } catch (cause) {
    logEvent('WARNING', 'station source failed', {
      source: source.name,
      cause: describeCause(cause),
    });
    return [];
  }
}

/**
 * The air report for a point: the nearest fresh official station for "now",
 * and the model forecast anchored to it for the hours ahead. Stations are best
 * effort; without one the report says it is forecast-based. Without a forecast
 * there is no report. Every family in a neighbourhood asks for the same
 * point, so reports are cached by ~1 km cell and in-flight requests shared.
 */
export function createAirService(sources: AirSources): AirService {
  const reports = createTtlCache<Promise<AirReport>>(CACHE_ENTRIES, REPORT_TTL_MS);
  const placeSearches = createTtlCache<Promise<Place[]>>(CACHE_ENTRIES, PLACES_TTL_MS);
  const build = async (latitude: number, longitude: number): Promise<AirReport> => {
    const [forecast, ...readings] = await Promise.all([
      sources.forecast(latitude, longitude),
      ...sources.stations.map((source) => readingsFrom(source, latitude, longitude)),
    ]);
    const now = sources.now();
    const station = nearestStation({ latitude, longitude }, readings.flat(), now);
    const report = anchorForecast(forecast, station, now);
    if (report === null) {
      throw new UpstreamError('Air-quality forecast does not cover the current hour');
    }
    return report;
  };
  return {
    report(latitude, longitude) {
      const lat = roundCoordinate(latitude);
      const lon = roundCoordinate(longitude);
      return cached(reports, `${String(lat)},${String(lon)}`, () => build(lat, lon));
    },
    places(query) {
      return cached(placeSearches, query.trim().toLowerCase(), () => sources.places(query));
    },
  };
}
