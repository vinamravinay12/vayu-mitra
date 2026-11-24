/** Tests of live sources and fixture data. */
import type { StationReading } from '@vayu/core';
import { expect, it } from 'vitest';
import { NOW } from '../test-utils/fake-llm.js';
import { airResponse } from '../test-utils/open-meteo-samples.js';
import { cpcbRows, WAQI_FEED } from '../test-utils/station-samples.js';
import { createAirService } from './air-service.js';
import { airSources, liveSources } from './build-sources.js';
import {
  FIXTURE_PLACES,
  fixtureForecast,
  fixtureStations,
  searchFixturePlaces,
} from './fixture-air.js';
import type { FetchJson } from './fetch-json.js';

/** A fetch that answers by host and records the URLs it was asked for. */
const answering = (byHost: Record<string, unknown>): FetchJson & { urls: string[] } => {
  const urls: string[] = [];
  return Object.assign(
    (url: string) => {
      urls.push(url);
      const host = new URL(url).host;
      return Promise.resolve(byHost[host]);
    },
    { urls },
  );
};

/** Every upstream the live sources call; WAQI's station is farther than CPCB's. */
const upstream = {
  'air-quality-api.open-meteo.com': airResponse(72),
  'api.data.gov.in': { records: cpcbRows() },
  // WAQI's station is ~6 km away; CPCB's ITO is ~3.5 km.
  'api.waqi.info': {
    ...WAQI_FEED,
    data: { ...WAQI_FEED.data, city: { geo: [28.67, 77.22], name: 'Far' } },
  },
  'geocoding-api.open-meteo.com': { results: [] },
};

it('live sources: prefers the CPCB station and fetches the national feed once', async () => {
  const fetchJson = answering(upstream);
  const live = liveSources(fetchJson, { dataGovInApiKey: 'k', waqiToken: 't' }, NOW);
  const service = createAirService(live);
  const report = await service.report(28.6139, 77.209);
  await service.report(19.08, 72.88);
  expect(report.station).toMatchObject({ name: 'ITO, Delhi - CPCB', source: 'cpcb' });
  expect(report.current).toMatchObject({ aqi: 350, category: 'very-poor', basis: 'station' });
  expect(fetchJson.urls.filter((url) => url.includes('data.gov.in'))).toHaveLength(1);
  expect(await live.places('x')).toEqual([]);
});

it('live sources: picks fixture or live sources by mode', () => {
  const keys = { dataGovInApiKey: null, waqiToken: null };
  expect(
    airSources('fixture', { fetchJson: answering({}), keys, now: NOW }).stations[0]?.name,
  ).toBe('fixture');
  expect(airSources('live', { fetchJson: answering({}), keys, now: NOW }).stations).toEqual([]);
});

it('fixture data: has a station by each place, reading above the model', () => {
  const stations: StationReading[] = fixtureStations(NOW());
  expect(stations).toHaveLength(FIXTURE_PLACES.length);
  const forecastNow = fixtureForecast(28.61, NOW()).hours[10];
  expect(stations[0]?.pollutants.pm25).toBeGreaterThan(forecastNow?.pm25 ?? 0);
  expect(stations[0]?.observedAt).toBe('2026-11-22T10:00:00+05:30');
  expect(searchFixturePlaces('MUM')[0]?.name).toBe('Mumbai');
});
