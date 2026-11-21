import { airSnapshotSchema } from '@vayu/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { airResponse, GEOCODE_RESPONSE } from '../test-utils/open-meteo-samples.js';
import { createAirService } from './air-service.js';
import { fetchJsonOverNetwork, UpstreamError } from './fetch-json.js';
import { FIXTURE_PLACES, fixtureForecast, searchFixturePlaces } from './fixture-air.js';
import { fetchAirForecast, roundCoordinate, searchPlaces } from './open-meteo.js';

const now = new Date('2026-11-21T04:30:00Z');

describe('fetchAirForecast', () => {
  it('normalises the forecast, drops hours without PM2.5 and estimates missing PM10', async () => {
    const fetchJson = vi.fn((_url: string) => Promise.resolve(airResponse(48)));
    const snapshot = await fetchAirForecast(fetchJson, 28.5677, 77.2433, now);
    expect(airSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.hours).toHaveLength(47);
    expect(snapshot.hours.find((hour) => hour.time === '2026-11-21T04:00')?.pm10).toBe(166.4);
    expect(fetchJson.mock.calls[0]?.[0]).toContain('latitude=28.57&longitude=77.24');
  });

  it('rejects unexpected shapes and forecasts too short to plan a day', async () => {
    await expect(
      fetchAirForecast(() => Promise.resolve({ nope: true }), 1, 1, now),
    ).rejects.toBeInstanceOf(UpstreamError);
    await expect(
      fetchAirForecast(() => Promise.resolve(airResponse(10)), 1, 1, now),
    ).rejects.toThrow('no data');
  });

  it('clamps impossible concentrations', async () => {
    const response = airResponse(25) as { hourly: { pm2_5: (number | null)[] } };
    response.hourly.pm2_5[0] = 99_999;
    const snapshot = await fetchAirForecast(() => Promise.resolve(response), 1, 1, now);
    expect(snapshot.hours[0]?.pm25).toBe(2000);
  });
});

describe('searchPlaces', () => {
  it('maps results and tolerates sparse ones and no results', async () => {
    const places = await searchPlaces(() => Promise.resolve(GEOCODE_RESPONSE), 'Lajpat');
    expect(places).toEqual([
      {
        name: 'Lajpat Nagar',
        region: 'Delhi',
        country: 'India',
        latitude: 28.57,
        longitude: 77.24,
      },
      { name: 'Nowhere', region: '', country: '', latitude: 1.23, longitude: 5.68 },
    ]);
    await expect(searchPlaces(() => Promise.resolve({}), 'x')).resolves.toEqual([]);
    await expect(
      searchPlaces(() => Promise.resolve({ results: 'bad' }), 'x'),
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  it('rounds coordinates to about a kilometre', () => {
    expect(roundCoordinate(28.56777)).toBe(28.57);
  });
});

describe('fixtures', () => {
  it('produce two valid days of a winter curve for the local date', () => {
    const snapshot = fixtureForecast(28.61, now);
    expect(airSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.hours[0]?.time).toBe('2026-11-21T00:00');
    expect(snapshot.hours).toHaveLength(48);
    expect(fixtureForecast(10, now).hours[0]?.pm25).toBeLessThan(snapshot.hours[0]?.pm25 ?? 0);
  });

  it('search the fixture places by name', () => {
    expect(searchFixturePlaces(' delhi ')).toEqual([FIXTURE_PLACES[0]]);
    expect(searchFixturePlaces('zzz')).toEqual([]);
  });
});

describe('createAirService', () => {
  it('caches forecasts by rounded coordinates and shares in-flight requests', async () => {
    const fetchJson = vi.fn(() => Promise.resolve(airResponse(48)));
    const service = createAirService({ mode: 'live', fetchJson, now: () => now });
    await Promise.all([service.forecast(28.611, 77.211), service.forecast(28.612, 77.209)]);
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const fetchJson = vi
      .fn()
      .mockRejectedValueOnce(new UpstreamError('down'))
      .mockResolvedValue(GEOCODE_RESPONSE);
    const service = createAirService({ mode: 'live', fetchJson, now: () => now });
    await expect(service.places('Lajpat')).rejects.toThrow('down');
    await expect(service.places('Lajpat')).resolves.toHaveLength(2);
    await expect(service.places(' lajpat ')).resolves.toHaveLength(2);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('serves fixtures without touching the network', async () => {
    const fetchJson = vi.fn();
    const service = createAirService({ mode: 'fixture', fetchJson, now: () => now });
    await expect(service.forecast(28.61, 77.21)).resolves.toMatchObject({ source: 'fixture' });
    await expect(service.places('Mumbai')).resolves.toHaveLength(1);
    expect(fetchJson).not.toHaveBeenCalled();
  });
});

describe('fetchJsonOverNetwork', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns JSON and turns non-2xx answers into upstream errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"ok":1}', { status: 200 }))),
    );
    await expect(fetchJsonOverNetwork('https://example.test')).resolves.toEqual({ ok: 1 });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nope', { status: 503 }))),
    );
    await expect(fetchJsonOverNetwork('https://example.test')).rejects.toThrow(
      'Upstream answered 503',
    );
  });
});
