/** Local time at a place, and hours in the words people use. */

/** A wall-clock time of day, `HH:MM`. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The local date, hour and minute at a place for an instant. */
export interface LocalClock {
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly hour: number;
  readonly minute: number;
}

/** Local wall-clock time at a UTC offset. */
export function localClock(now: Date, utcOffsetSeconds: number): LocalClock {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000).toISOString();
  return {
    date: shifted.slice(0, 10),
    hour: Number(shifted.slice(11, 13)),
    minute: Number(shifted.slice(14, 16)),
  };
}

/** `HH:MM` as minutes after midnight. */
export function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * True when `minute` falls in [start, end). A window whose end is before its
 * start wraps past midnight, as quiet hours of 22:00–07:00 do. An empty window
 * (start equal to end) contains nothing.
 */
export function isWithinWindow(minute: number, start: string, end: string): boolean {
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}

/** The hour key `YYYY-MM-DDTHH:00` the forecast uses for a local clock. */
export const hourKey = (clock: Pick<LocalClock, 'date' | 'hour'>): string =>
  `${clock.date}T${String(clock.hour).padStart(2, '0')}:00`;

/** A local hour as people read it: "7 am", "12 pm", "9 pm". */
export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const twelve = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${String(twelve)} ${normalized < 12 ? 'am' : 'pm'}`;
}

/** The local hour in a `YYYY-MM-DDTHH:…` time, as the outlook and station times are written. */
export const hourOfTime = (time: string): number => Number(time.slice(11, 13));

/**
 * An outlook hour as people say it, relative to `today`: "7 am" or
 * "tomorrow 7 am"; with `at`, "at 7 am" or "tomorrow at 7 am".
 */
export function labelHour(time: string, today: string | undefined, at = false): string {
  const hour = `${at ? 'at ' : ''}${formatHour(hourOfTime(time))}`;
  return time.slice(0, 10) === today ? hour : `tomorrow ${hour}`;
}

/** The text with its first letter upper-cased. */
export const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
