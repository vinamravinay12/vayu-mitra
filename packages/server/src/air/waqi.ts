import {
  EPA_PM10_BANDS,
  EPA_PM25_BANDS,
  epaIndexToConcentration,
  type StationReading,
} from '@vayu/core';
import { z } from 'zod';
import { UpstreamError, type FetchJson } from './fetch-json.js';
import { roundCoordinate } from './open-meteo.js';

/**
 * The World Air Quality Index project's nearest-station feed. It carries
 * stations CPCB does not (state boards, embassies, some low-cost networks)
 * and fills gaps when the CPCB feed is late. Its numbers are US EPA indices,
 * so they are converted back to concentrations here.
 */

const FEED_URL = 'https://api.waqi.info/feed';

const pollutantValue = z.object({ v: z.number() }).optional();

const feedSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    data: z.object({
      idx: z.number().int(),
      time: z.object({ iso: z.iso.datetime({ offset: true }) }),
      city: z.object({ geo: z.tuple([z.number(), z.number()]), name: z.string().min(1) }),
      iaqi: z.object({ pm25: pollutantValue, pm10: pollutantValue }),
    }),
  }),
  z.object({ status: z.literal('error') }),
]);

/** The station WAQI considers nearest a point, or none. */
export async function fetchWaqiStations(
  fetchJson: FetchJson,
  token: string,
  latitude: number,
  longitude: number,
): Promise<StationReading[]> {
  const point = `geo:${String(roundCoordinate(latitude))};${String(roundCoordinate(longitude))}`;
  const parsed = feedSchema.safeParse(
    await fetchJson(`${FEED_URL}/${point}/?${new URLSearchParams({ token }).toString()}`),
  );
  if (!parsed.success) {
    throw new UpstreamError('WAQI feed had an unexpected shape');
  }
  if (parsed.data.status === 'error') {
    return [];
  }
  const { idx, time, city, iaqi } = parsed.data.data;
  const pollutants = {
    ...(iaqi.pm25 === undefined
      ? {}
      : { pm25: epaIndexToConcentration(iaqi.pm25.v, EPA_PM25_BANDS) }),
    ...(iaqi.pm10 === undefined
      ? {}
      : { pm10: epaIndexToConcentration(iaqi.pm10.v, EPA_PM10_BANDS) }),
  };
  return [
    {
      id: String(idx),
      name: city.name.slice(0, 160),
      latitude: city.geo[0],
      longitude: city.geo[1],
      source: 'waqi',
      observedAt: time.iso,
      pollutants,
    },
  ];
}
