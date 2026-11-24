/** Choosing the air sources: live feeds that have a key, or fixed data offline. */
import { createTtlCache } from '../cache/ttl-cache.js';
import type { AirDataMode } from '../config.js';
import { cached, type AirSources, type StationSource } from './air-service.js';
import { fetchCpcbStations } from './cpcb.js';
import type { FetchJson } from './fetch-json.js';
import { fixtureForecast, fixtureStations, searchFixturePlaces } from './fixture-air.js';
import { fetchAirForecast, roundCoordinate, searchPlaces } from './open-meteo.js';
import { fetchWaqiStations } from './waqi.js';

/** CPCB refreshes hourly; one national fetch every 15 minutes serves everyone. */
const STATION_TTL_MS = 15 * 60_000;

/** Keys for the station feeds. Either may be missing; then that feed is skipped. */
export interface StationKeys {
  readonly dataGovInApiKey: string | null;
  readonly waqiToken: string | null;
}

/** The live adapters, with the station feeds that have a key. */
export function liveSources(fetchJson: FetchJson, keys: StationKeys, now: () => Date): AirSources {
  const stations: StationSource[] = [];
  const { dataGovInApiKey, waqiToken } = keys;
  if (dataGovInApiKey !== null) {
    const national = createTtlCache<Promise<Awaited<ReturnType<typeof fetchCpcbStations>>>>(
      1,
      STATION_TTL_MS,
    );
    stations.push({
      name: 'cpcb',
      near: () => cached(national, 'all', () => fetchCpcbStations(fetchJson, dataGovInApiKey)),
    });
  }
  if (waqiToken !== null) {
    stations.push({
      name: 'waqi',
      near: (latitude, longitude) =>
        fetchWaqiStations(fetchJson, waqiToken, { latitude, longitude }),
    });
  }
  return {
    forecast: (latitude, longitude) =>
      fetchAirForecast(fetchJson, roundCoordinate(latitude), roundCoordinate(longitude)),
    stations,
    places: (query) => searchPlaces(fetchJson, query),
    now,
  };
}

/** Fixed data for tests and offline demos. */
export function fixtureSources(now: () => Date): AirSources {
  return {
    forecast: (latitude) => Promise.resolve(fixtureForecast(latitude, now())),
    stations: [{ name: 'fixture', near: () => Promise.resolve(fixtureStations(now())) }],
    places: (query) => Promise.resolve(searchFixturePlaces(query)),
    now,
  };
}

/** What the live sources need: a way to fetch, the station keys, and the clock. */
export interface SourceInputs {
  readonly fetchJson: FetchJson;
  readonly keys: StationKeys;
  readonly now: () => Date;
}

/** Sources for the configured mode. */
export const airSources = (
  mode: AirDataMode,
  { fetchJson, keys, now }: SourceInputs,
): AirSources => (mode === 'fixture' ? fixtureSources(now) : liveSources(fetchJson, keys, now));
