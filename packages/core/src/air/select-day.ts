import type { AirHour, AirSnapshot } from '../schemas/air.js';

/** Hours in a day; every per-hour series in the engine has this length. */
export const HOURS_PER_DAY = 24;

/** One local day of hourly concentrations, index = local hour. */
export interface DayAir {
  /** Local date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly pm25: readonly number[];
  readonly pm10: readonly number[];
}

/** The local date and hour at the forecast's location for an instant. */
export function localClock(
  now: Date,
  utcOffsetSeconds: number,
): { readonly date: string; readonly hour: number } {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000).toISOString();
  return { date: shifted.slice(0, 10), hour: Number(shifted.slice(11, 13)) };
}

/** The date one day after `date` (`YYYY-MM-DD`), computed in UTC so no time zone shifts it. */
export function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** The value of the closest hour in the snapshot to `index`, searching outward. */
function nearestValue(series: readonly (number | undefined)[], index: number): number {
  for (let distance = 1; distance < series.length; distance += 1) {
    const value = series[index - distance] ?? series[index + distance];
    if (value !== undefined) {
      return value;
    }
  }
  return 0;
}

/** Picks `field` for each hour of `date`, filling gaps from the nearest known hour. */
function hourlySeries(hours: readonly AirHour[], date: string, field: 'pm25' | 'pm10'): number[] {
  const byHour = new Map(hours.map((hour) => [hour.time, hour[field]]));
  const known = Array.from({ length: HOURS_PER_DAY }, (_unused, hour) =>
    byHour.get(`${date}T${String(hour).padStart(2, '0')}:00`),
  );
  return known.map((value, hour) => value ?? nearestValue(known, hour));
}

/** True when the snapshot has at least one hour on `date`. */
export const coversDate = (snapshot: AirSnapshot, date: string): boolean =>
  snapshot.hours.some((hour) => hour.time.startsWith(date));

/**
 * One local day from a forecast. A day the forecast does not cover at all
 * falls back to the forecast's first day, so a stale snapshot still yields a
 * plan; the plan reports which date it is for.
 */
export function selectDay(snapshot: AirSnapshot, date: string): DayAir {
  const firstDate = snapshot.hours[0]?.time.slice(0, 10) ?? date;
  const chosen = coversDate(snapshot, date) ? date : firstDate;
  return {
    date: chosen,
    pm25: hourlySeries(snapshot.hours, chosen, 'pm25'),
    pm10: hourlySeries(snapshot.hours, chosen, 'pm10'),
  };
}
