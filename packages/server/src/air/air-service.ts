import type { AirSnapshot, Place } from '@vayu/core';
import { createTtlCache, type TtlCache } from '../cache/ttl-cache.js';
import type { AirDataMode } from '../config.js';
import type { FetchJson } from './fetch-json.js';
import { fixtureForecast, searchFixturePlaces } from './fixture-air.js';
import { fetchAirForecast, roundCoordinate, searchPlaces } from './open-meteo.js';

/** What the routes and the coach need from the outside world's air data. */
export interface AirService {
  forecast(latitude: number, longitude: number): Promise<AirSnapshot>;
  places(query: string): Promise<Place[]>;
}

/** The forecast updates hourly; 30 minutes keeps it fresh and spares the upstream. */
const FORECAST_TTL_MS = 30 * 60_000;

/** Place names do not change; a day is plenty. */
const PLACES_TTL_MS = 24 * 60 * 60_000;

const CACHE_ENTRIES = 1000;

/** Inputs for the air service. */
export interface AirServiceOptions {
  readonly mode: AirDataMode;
  readonly fetchJson: FetchJson;
  readonly now: () => Date;
}

/** Wraps a loader with a cache, sharing one in-flight request per key. */
function cached<V>(cache: TtlCache<Promise<V>>, key: string, load: () => Promise<V>): Promise<V> {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const pending = load();
  cache.set(key, pending);
  // A failure must not be cached: the next request tries the upstream again.
  pending.catch(() => {
    cache.delete(key);
  });
  return pending;
}

/**
 * Air data with caching. Every family in a city asks for the same forecast,
 * so caching by rounded coordinates turns thousands of requests into one per
 * half hour, and concurrent requests share a single upstream call.
 */
export function createAirService({ mode, fetchJson, now }: AirServiceOptions): AirService {
  const forecasts = createTtlCache<Promise<AirSnapshot>>(CACHE_ENTRIES, FORECAST_TTL_MS);
  const placeSearches = createTtlCache<Promise<Place[]>>(CACHE_ENTRIES, PLACES_TTL_MS);
  return {
    forecast(latitude, longitude) {
      if (mode === 'fixture') {
        return Promise.resolve(fixtureForecast(latitude, now()));
      }
      const key = `${String(roundCoordinate(latitude))},${String(roundCoordinate(longitude))}`;
      return cached(forecasts, key, () => fetchAirForecast(fetchJson, latitude, longitude, now()));
    },
    places(query) {
      if (mode === 'fixture') {
        return Promise.resolve(searchFixturePlaces(query));
      }
      return cached(placeSearches, query.trim().toLowerCase(), () =>
        searchPlaces(fetchJson, query),
      );
    },
  };
}
