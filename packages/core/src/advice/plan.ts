import { PERIOD_HOURS, type Day, type Period } from '../catalog/vocabulary.js';
import { nowHour, type AirReport, type ReportHour } from '../schemas/air-report.js';
import { localClock, minutesOfDay } from '../time/local-clock.js';

/**
 * When a plan is for: the hour asked about, from a clock time, a day, a part
 * of the day or none of them, and the cleanest window to compare it with.
 */

/** Outdoor plans are only suggested in these local hours. */
export const DAYLIGHT = { first: 6, last: 20 } as const;

/** The local date a day refers to, or null when no day was given. */
export function dateFor(report: AirReport, day: Day | null, now: Date): string | null {
  if (day === null) return null;
  const today = new Date(`${localClock(now, report.utcOffsetSeconds).date}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() + (day === 'tomorrow' ? 1 : 0));
  return today.toISOString().slice(0, 10);
}

/**
 * The outlook hour a plan is for: `HH:MM` on the given date; if that has
 * passed or the outlook does not reach it, the next `HH:MM`; with no time, now.
 */
export function plannedHour(
  report: AirReport,
  time: string | null,
  date: string | null,
): ReportHour {
  if (time === null) {
    return nowHour(report);
  }
  const wanted = Math.floor(minutesOfDay(time) / 60);
  const at = (on: string | null) =>
    report.hours.find(
      (hour) =>
        Number(hour.time.slice(11, 13)) === wanted && (on === null || hour.time.startsWith(on)),
    );
  return at(date) ?? at(null) ?? nowHour(report);
}

/** The local hour of an outlook hour. */
const hourOf = (hour: ReportHour): number => Number(hour.time.slice(11, 13));

/**
 * The window of `length` hours within `bounds` (daylight unless given) with
 * the lowest mean index, as its first hour.
 */
export function cleanestWindow(
  hours: readonly ReportHour[],
  length: number,
  bounds: { readonly first: number; readonly last: number } = DAYLIGHT,
): ReportHour | null {
  let best: { hour: ReportHour; mean: number } | null = null;
  for (const [start, hour] of hours.entries()) {
    const window = hours.slice(start, start + length);
    const startHour = hourOf(hour);
    const inDaylight = startHour >= bounds.first && startHour + length - 1 <= bounds.last;
    const mean = window.reduce((sum, next) => sum + next.aqi, 0) / length;
    if (window.length === length && inDaylight && (best === null || mean < best.mean)) {
      best = { hour, mean };
    }
  }
  return best?.hour ?? null;
}

/** What the plan depends on: the outlook, now, and when the question said. */
export interface PlanInput {
  readonly report: AirReport;
  readonly now: Date;
  readonly time: string | null;
  readonly day: Day | null;
  readonly period: Period | null;
  readonly minutes: number | null;
}

/** The plan's hour and the cleanest window to compare it with. */
export interface Plan {
  readonly planned: ReportHour;
  readonly best: ReportHour | null;
}

/**
 * A part of the day ("tomorrow morning"): its cleanest hour on that day, or
 * its next occurrence without a day, against that day's cleanest daylight.
 * Null when the outlook does not reach it.
 */
function planForPeriod(hours: readonly ReportHour[], period: Period, length: number): Plan | null {
  const range = PERIOD_HOURS[period];
  const inPeriod = hours.filter(
    (hour) => hourOf(hour) >= range.first && hourOf(hour) <= range.last,
  );
  const date = inPeriod[0]?.time.slice(0, 10);
  const thatPeriod = inPeriod.filter((hour) => date !== undefined && hour.time.startsWith(date));
  const planned = cleanestWindow(thatPeriod, length, range) ?? thatPeriod[0];
  if (planned === undefined) return null;
  const sameDay = hours.filter((hour) => hour.time.startsWith(planned.time.slice(0, 10)));
  return { planned, best: cleanestWindow(sameDay, length) };
}

/**
 * The hour the plan is for and the cleanest window to compare it with. Asked
 * about a day, the window is looked for on that day only; a day with no time
 * plans for its cleanest window; a part of the day plans within it.
 */
export function planAndWindow(input: PlanInput, defaultMinutes: number): Plan {
  const date = dateFor(input.report, input.day, input.now);
  const length = Math.max(1, Math.ceil((input.minutes ?? defaultMinutes) / 60));
  const hours = input.report.hours.filter((hour) => date === null || hour.time.startsWith(date));
  const byPeriod =
    input.time === null && input.period !== null
      ? planForPeriod(hours, input.period, length)
      : null;
  if (byPeriod !== null) return byPeriod;
  const best = cleanestWindow(hours, length);
  const planned =
    input.time === null && date !== null && best !== null
      ? best
      : plannedHour(input.report, input.time, date);
  return { planned, best };
}
