/** Tests of WAQI feed and fetchJsonOverNetwork. */
import { describe, expect, it } from 'vitest';
import { WAQI_FEED } from '../test-utils/station-samples.js';
import { fetchJsonOverNetwork } from './fetch-json.js';
import { fetchWaqiStations } from './waqi.js';
import { answering, ONE_ONE } from './adapters.fixtures.js';

describe('WAQI feed', () => {
  it('converts EPA indices to concentrations', async () => {
    const fetchJson = answering(WAQI_FEED);
    const [station] = await fetchWaqiStations(fetchJson, 'token', {
      latitude: 28.6139,
      longitude: 77.209,
    });
    expect(fetchJson.urls[0]).toBe('https://api.waqi.info/feed/geo:28.61;77.21/?token=token');
    expect(station).toEqual({
      id: '2556',
      name: 'Major Dhyan Chand National Stadium, Delhi',
      latitude: 28.6139,
      longitude: 77.209,
      source: 'waqi',
      observedAt: '2026-11-22T10:00:00+05:30',
      pollutants: { pm25: 161.6, pm10: 233.8 },
    });
  });

  it('handles no station, missing pollutants and odd shapes', async () => {
    expect(await fetchWaqiStations(answering({ status: 'error' }), 't', ONE_ONE)).toEqual([]);
    const bare = { ...WAQI_FEED, data: { ...WAQI_FEED.data, iaqi: {} } };
    expect((await fetchWaqiStations(answering(bare), 't', ONE_ONE))[0]?.pollutants).toEqual({});
    await expect(fetchWaqiStations(answering({ status: 'ok' }), 't', ONE_ONE)).rejects.toThrow(
      'shape',
    );
  });
});

describe('fetchJsonOverNetwork', () => {
  it('returns JSON and turns non-2xx answers into UpstreamError', async () => {
    const realFetch = globalThis.fetch;
    try {
      globalThis.fetch = () => Promise.resolve(new Response('{"ok":true}', { status: 200 }));
      expect(await fetchJsonOverNetwork('https://example.test')).toEqual({ ok: true });
      globalThis.fetch = () => Promise.resolve(new Response('', { status: 503 }));
      await expect(fetchJsonOverNetwork('https://example.test')).rejects.toThrow('answered 503');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
