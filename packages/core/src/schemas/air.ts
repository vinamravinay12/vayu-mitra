import { z } from 'zod';

/**
 * Hourly air-quality data as the server hands it to the engine. The server
 * normalises the upstream forecast into this shape and the client re-validates
 * it, so the engine only ever sees complete, bounded numbers.
 */

/** Concentrations above this are sensor or model faults, not air. */
export const MAX_CONCENTRATION = 2000;

/** Where an air snapshot came from. */
export const AIR_SOURCES = ['open-meteo', 'fixture'] as const;

/** One local hour of particulate concentrations in µg/m³. */
export const airHourSchema = z.object({
  /** Local wall-clock time, `YYYY-MM-DDTHH:00`. */
  time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/),
  pm25: z.number().min(0).max(MAX_CONCENTRATION),
  pm10: z.number().min(0).max(MAX_CONCENTRATION),
});

/** A forecast for one place: at least a full day of hours, at most a week. */
export const airSnapshotSchema = z.object({
  timezone: z.string().min(1).max(64),
  utcOffsetSeconds: z
    .number()
    .int()
    .min(-14 * 3600)
    .max(14 * 3600),
  hours: z
    .array(airHourSchema)
    .min(24)
    .max(24 * 7),
  source: z.enum(AIR_SOURCES),
  fetchedAt: z.iso.datetime(),
});

export type AirHour = z.infer<typeof airHourSchema>;
export type AirSnapshot = z.infer<typeof airSnapshotSchema>;
export type AirSource = (typeof AIR_SOURCES)[number];
