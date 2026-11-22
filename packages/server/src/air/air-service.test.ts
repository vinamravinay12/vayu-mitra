import type { Forecast, StationReading } from '@vayu/core';
import { describe, expect, it, vi } from 'vitest';
import { NOW } from '../test-utils/fake-llm.js';
import { airResponse } from '../test-utils/open-meteo-samples.js';
import { cpcbRows, WAQI_FEED } from '../test-utils/station-samples.js';
import { createAirService, type AirSources } from './air-service.js';
import { airSources, fixtureSources, liveSources } from './build-sources.js';
import {
  FIXTURE_PLACES,
  fixtureForecast,
  fixtureStations,
  searchFixturePlaces,
} from './fixture-air.js';
import type { FetchJson } from './fetch-json.js';

const DELHI = FIXTURE_PLACES[0] ?? { latitude: 28.61, longitude: 77.21 };

function sources(overrides: Partial<AirSources> = {}): AirSources {
  return { ...fixtureSources(NOW), ...overrides };
}

describe('createAirService', () => {
  it('anchors the forecast to the nearest station', async () => {
    const report = await createAirService(sources()).report(DELHI.latitude, DELHI.longitude);
    expect(report.current.basis).toBe('station');
    expect(report.station?.name).toBe('New Delhi (sample station)');
    expect(report.hours[0]?.time).toBe('2026-11-22T10:00');
  });

  it('caches by ~1 km cell and shares in-flight requests', async () => {
    const forecast = vi.fn((latitude: number) => Promise.resolve(fixtureForecast(latitude, NOW())));
    const service = createAirService(sources({ forecast }));
    await Promise.all([service.report(28.611, 77.211), service.report(28.6141, 77.2089)]);
    expect(forecast).toHaveBeenCalledTimes(1);
    expect(forecast).toHaveBeenCalledWith(28.61, 77.21);
  });

  it('keeps going without stations when a station source fails', async () => {
    const failing = { name: 'broken', near: () => Promise.reject(new Error('down')) };
    const report = await createAirService(sources({ stations: [failing] })).report(28.61, 77.21);
    expect(report.current.basis).toBe('forecast');
    expect(report.station).toBeNull();
  });

  it('fails without a forecast that covers now, and does not cache the failure', async () => {
    const stale: Forecast = {
      ...fixtureForecast(28.61, NOW()),
      hours: fixtureForecast(28.61, NOW()).hours.slice(0, 5),
    };
    const forecast = vi
      .fn<AirSources['forecast']>()
      .mockResolvedValueOnce(stale)
      .mockResolvedValueOnce(fixtureForecast(28.61, NOW()));
    const service = createAirService(sources({ forecast }));
    await expect(service.report(28.61, 77.21)).rejects.toThrow('does not cover the current hour');
    await expect(service.report(28.61, 77.21)).resolves.toMatchObject({
      forecastSource: 'fixture',
    });
  });

  it('caches place searches by normalised query', async () => {
    const places = vi.fn((query: string) => Promise.resolve(searchFixturePlaces(query)));
    const service = createAirService(sources({ places }));
    expect(await service.places('Delhi')).toHaveLength(1);
    await service.places(' delhi ');
    expect(places).toHaveBeenCalledTimes(1);
  });
});

describe('live sources', () => {
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

  it('uses only the station feeds that have a key', () => {
    const none = liveSources(answering(upstream), { dataGovInApiKey: null, waqiToken: null }, NOW);
    expect(none.stations).toEqual([]);
    const both = liveSources(answering(upstream), { dataGovInApiKey: 'k', waqiToken: 't' }, NOW);
    expect(both.stations.map((source) => source.name)).toEqual(['cpcb', 'waqi']);
  });

  it('prefers the CPCB station and fetches the national feed once', async () => {
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

  it('picks fixture or live sources by mode', () => {
    const keys = { dataGovInApiKey: null, waqiToken: null };
    expect(airSources('fixture', answering({}), keys, NOW).stations[0]?.name).toBe('fixture');
    expect(airSources('live', answering({}), keys, NOW).stations).toEqual([]);
  });
});

describe('fixture data', () => {
  it('has a station by each place, reading above the model', () => {
    const stations: StationReading[] = fixtureStations(NOW());
    expect(stations).toHaveLength(FIXTURE_PLACES.length);
    const forecastNow = fixtureForecast(28.61, NOW()).hours[10];
    expect(stations[0]?.pollutants.pm25).toBeGreaterThan(forecastNow?.pm25 ?? 0);
    expect(stations[0]?.observedAt).toBe('2026-11-22T10:00:00+05:30');
    expect(searchFixturePlaces('MUM')[0]?.name).toBe('Mumbai');
  });
});
