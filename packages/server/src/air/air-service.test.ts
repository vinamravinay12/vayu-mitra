/** Tests of createAirService and live sources. */
import type { Forecast } from '@vayu/core';
import { describe, expect, it, vi } from 'vitest';
import { NOW } from '../test-utils/fake-llm.js';
import { airResponse } from '../test-utils/open-meteo-samples.js';
import { cpcbRows, WAQI_FEED } from '../test-utils/station-samples.js';
import { createAirService, type AirSources } from './air-service.js';
import { liveSources } from './build-sources.js';
import { fixtureForecast, searchFixturePlaces } from './fixture-air.js';
import type { FetchJson } from './fetch-json.js';
import { DELHI, sources } from './air-service.fixtures.js';

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
});

describe('createAirService', () => {
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
});
