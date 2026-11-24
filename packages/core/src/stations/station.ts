/** A station reading as the adapters return it, and who operates the monitor. */
import { z } from 'zod';
import { POLLUTANTS } from '../aqi/pollutants.js';

/** Who operates the monitor a reading came from. */
export const STATION_SOURCES = ['cpcb', 'waqi', 'fixture'] as const;

/** Who operates the monitor a reading came from. */
export type StationSource = (typeof STATION_SOURCES)[number];

/** Concentrations above this are sensor faults, not air. */
export const MAX_CONCENTRATION = 2000;

const concentration = z.number().min(0).max(MAX_CONCENTRATION);

/** One monitoring station's latest reading, normalised from either feed. */
export const stationReadingSchema = z.object({
  /** Stable within a source, e.g. CPCB's station name or WAQI's numeric id. */
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  source: z.enum(STATION_SOURCES),
  /** When the station measured this, ISO 8601 with offset. */
  observedAt: z.iso.datetime({ offset: true }),
  pollutants: z.partialRecord(z.enum(POLLUTANTS), concentration),
});

/** One station’s latest reading, as the adapters return it. */
export type StationReading = z.infer<typeof stationReadingSchema>;

/** Readable names for sources, for the "from" line under the AQI. */
export const STATION_SOURCE_LABELS: Readonly<Record<StationSource, string>> = {
  cpcb: 'CPCB',
  waqi: 'WAQI',
  fixture: 'Sample data',
};
