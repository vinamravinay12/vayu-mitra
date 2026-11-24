import { computeNaqi } from '@vayu/core';
import { describe, expect, it } from 'vitest';
import { airResponse, GEOCODE_RESPONSE } from '../test-utils/open-meteo-samples.js';
import { cpcbRows } from '../test-utils/station-samples.js';
import { fetchCpcbStations, parseCpcbRecords, parseCpcbTime } from './cpcb.js';
import { UpstreamError } from './fetch-json.js';
import { fetchAirForecast, MAX_PLACES, roundCoordinate, searchPlaces } from './open-meteo.js';
import { answering } from './adapters.fixtures.js';

describe('Open-Meteo forecast', () => {
  it('normalises hours, drops PM2.5 gaps and estimates missing PM10', async () => {
    const fetchJson = answering(airResponse(48));
    const forecast = await fetchAirForecast(fetchJson, 28.6139, 77.209);
    expect(fetchJson.urls[0]).toContain('latitude=28.61&longitude=77.21');
    expect(forecast.source).toBe('open-meteo');
    expect(forecast.hours).toHaveLength(47);
    expect(forecast.hours[3]).toEqual({ time: '2026-11-22T04:00', pm25: 104, pm10: 166.4 });
  });

  it('refuses odd shapes and too few hours', async () => {
    await expect(fetchAirForecast(answering({}), 1, 1)).rejects.toBeInstanceOf(UpstreamError);
    await expect(fetchAirForecast(answering(airResponse(10)), 1, 1)).rejects.toThrow('no data');
  });
});

describe('Open-Meteo places', () => {
  it('maps results and tolerates sparse ones', async () => {
    const places = await searchPlaces(answering(GEOCODE_RESPONSE), 'Lajpat');
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
    expect(await searchPlaces(answering({}), 'x')).toEqual([]);
    await expect(searchPlaces(answering({ results: 'no' }), 'x')).rejects.toThrow('shape');
    expect(MAX_PLACES).toBe(5);
    expect(roundCoordinate(28.6789)).toBe(28.68);
  });
});

describe('CPCB feed', () => {
  it('parses its IST timestamps', () => {
    expect(parseCpcbTime('22-11-2026 10:00:00')).toBe('2026-11-22T10:00:00+05:30');
    expect(parseCpcbTime('2026-11-22 10:00')).toBeNull();
    expect(parseCpcbTime('32-13-2026 10:00:00')).toBeNull();
  });
  it('groups rows into stations and turns sub-indices back into concentrations', () => {
    const [station] = parseCpcbRecords(cpcbRows());
    expect(station).toMatchObject({
      id: 'Delhi|Delhi|ITO, Delhi - CPCB',
      name: 'ITO, Delhi - CPCB',
      latitude: 28.628624,
      source: 'cpcb',
      observedAt: '2026-11-22T10:00:00+05:30',
      pollutants: { pm25: 185, pm10: 330, no2: 48, co: 0.6 },
    });
    // The round trip gives CPCB's own index back.
    expect(computeNaqi(station?.pollutants ?? {})?.value).toBe(350);
  });
  it('drops rows and stations that do not parse', () => {
    const records = [
      ...cpcbRows({ station: 'No place', latitude: 'NA' }),
      ...cpcbRows({ station: 'No time', last_update: 'yesterday' }),
      { station: 'Broken row' },
      'not an object',
      ...cpcbRows({ station: 'Good' }),
    ];
    expect(parseCpcbRecords(records).map((station) => station.name)).toEqual(['Good']);
  });
});

describe('CPCB feed', () => {
  it('fetches the national feed in one request', async () => {
    const fetchJson = answering({ records: cpcbRows() });
    expect(await fetchCpcbStations(fetchJson, 'key')).toHaveLength(1);
    expect(fetchJson.urls[0]).toContain('api-key=key');
    expect(fetchJson.urls[0]).toContain('limit=5000');
    await expect(fetchCpcbStations(answering({ message: 'bad key' }), 'k')).rejects.toThrow(
      'shape',
    );
  });
});
