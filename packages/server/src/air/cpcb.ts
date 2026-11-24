/**
 * CPCB's real-time station data, as published on data.gov.in ("Real time Air
 * Quality Index from various locations"). One record per station and
 * pollutant; values are the pollutant's NAQI sub-index over the last 24 hours
 * (8 for CO and ozone), refreshed hourly. The whole country is one request of
 * a few thousand rows, fetched once per refresh and shared by every family.
 */
import {
  BREAKPOINTS,
  concentrationFor,
  type Pollutant,
  type PollutantReadings,
  type StationReading,
} from '@vayu/core';
import { z } from 'zod';
import { UpstreamError, type FetchJson } from './fetch-json.js';

const RESOURCE_URL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';

/** Comfortably above the ~3,500 rows the feed has. */
const PAGE_LIMIT = 5000;

const POLLUTANT_IDS: Readonly<Record<string, Pollutant>> = {
  'PM2.5': 'pm25',
  PM10: 'pm10',
  NO2: 'no2',
  OZONE: 'o3',
  SO2: 'so2',
  CO: 'co',
  NH3: 'nh3',
};

const recordSchema = z.object({
  state: z.string(),
  city: z.string(),
  station: z.string().min(1),
  last_update: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  pollutant_id: z.string(),
  avg_value: z.string(),
});

const responseSchema = z.object({ records: z.array(z.unknown()) });

type CpcbRecord = z.infer<typeof recordSchema>;

/** "22-11-2026 10:00:00" in IST, as the feed writes it, to ISO 8601. */
export function parseCpcbTime(text: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(text.trim());
  if (match === null) {
    return null;
  }
  const [, day, month, year, hour, minute, second] = match;
  const iso = `${String(year)}-${String(month)}-${String(day)}T${String(hour)}:${String(minute)}:${String(second)}+05:30`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** A finite number, or undefined for "NA", blanks and garbage. */
const numberOrUndefined = (text: string): number | undefined => {
  const value = Number(text);
  return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
};

/** Where and when a station's rows were measured, or null when that does not parse. */
function placeAndTime(
  row: CpcbRecord,
): { latitude: number; longitude: number; observedAt: string } | null {
  const latitude = numberOrUndefined(row.latitude);
  const longitude = numberOrUndefined(row.longitude);
  const observedAt = parseCpcbTime(row.last_update);
  return latitude === undefined || longitude === undefined || observedAt === null
    ? null
    : { latitude, longitude, observedAt };
}

/** Concentrations from the rows' sub-indices, skipping unknown pollutants and "NA". */
function readingsOf(rows: readonly CpcbRecord[]): PollutantReadings {
  const pollutants: PollutantReadings = {};
  for (const row of rows) {
    const pollutant = POLLUTANT_IDS[row.pollutant_id];
    const index = numberOrUndefined(row.avg_value);
    if (pollutant !== undefined && index !== undefined) {
      pollutants[pollutant] = concentrationFor(index, BREAKPOINTS[pollutant]);
    }
  }
  return pollutants;
}

/** One station from its rows (all share a station), or null without a usable location or time. */
function toStation(rows: readonly [CpcbRecord, ...CpcbRecord[]]): StationReading | null {
  const [first] = rows;
  const where = placeAndTime(first);
  if (where === null) {
    return null;
  }
  return {
    id: `${first.state}|${first.city}|${first.station}`.slice(0, 120),
    name: first.station.slice(0, 160),
    ...where,
    source: 'cpcb',
    pollutants: readingsOf(rows),
  };
}

/** Groups the feed's rows into stations, dropping rows that do not parse. */
export function parseCpcbRecords(records: readonly unknown[]): StationReading[] {
  const byStation = new Map<string, [CpcbRecord, ...CpcbRecord[]]>();
  for (const raw of records) {
    const parsed = recordSchema.safeParse(raw);
    if (parsed.success) {
      const key = `${parsed.data.state}|${parsed.data.city}|${parsed.data.station}`;
      const rows = byStation.get(key);
      if (rows === undefined) byStation.set(key, [parsed.data]);
      else rows.push(parsed.data);
    }
  }
  return [...byStation.values()].flatMap((rows) => toStation(rows) ?? []);
}

/** Every CPCB station's latest reading. */
export async function fetchCpcbStations(
  fetchJson: FetchJson,
  apiKey: string,
): Promise<StationReading[]> {
  const query = new URLSearchParams({
    'api-key': apiKey,
    format: 'json',
    limit: String(PAGE_LIMIT),
  });
  const parsed = responseSchema.safeParse(await fetchJson(`${RESOURCE_URL}?${query.toString()}`));
  if (!parsed.success) {
    throw new UpstreamError('CPCB station feed had an unexpected shape');
  }
  return parseCpcbRecords(parsed.data.records);
}
