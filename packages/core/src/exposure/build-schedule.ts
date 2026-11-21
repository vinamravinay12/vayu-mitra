import { COMMUTE_MODE_PROFILES, MAX_COMMUTE_HOURS } from '../catalog/commute-modes.js';
import {
  AWAY_HOURS,
  DAYLIGHT_WINDOW,
  EXERCISE_SESSION_HOURS,
  SLEEP,
} from '../catalog/exposure-constants.js';
import type { MemberScenario } from '../types/scenario.js';

/**
 * Where a person is during each quarter-hour of a typical weekday. A
 * quarter-hour grid is fine enough for a commute leg and small enough (96
 * cells) that recomputing every scenario on every click stays in microseconds.
 */

/** Where someone is, which sets the air they breathe and how hard they breathe it. */
export type Whereabouts =
  'sleep' | 'home' | 'commute' | 'destination' | 'exercise-outdoor' | 'exercise-indoor';

/** Quarter-hours in a day. */
export const QUARTERS_PER_DAY = 96;

/** Quarter-hours per hour. */
const QUARTERS_PER_HOUR = 4;

/** Paints `place` over `quarters` from `startHour` for `hours`, wrapping past midnight. */
function paint(
  quarters: Whereabouts[],
  startHour: number,
  hours: number,
  place: Whereabouts,
): void {
  const first = Math.round(startHour * QUARTERS_PER_HOUR);
  const count = Math.round(hours * QUARTERS_PER_HOUR);
  for (let offset = 0; offset < count; offset += 1) {
    quarters[(first + offset) % QUARTERS_PER_DAY] = place;
  }
}

/** True when the member travels to school, work or an outdoor job. */
export const leavesHome = (member: MemberScenario): boolean => member.daytime !== 'home';

/** Hours one commute leg takes, rounded to the quarter-hour grid (zero for no commute). */
export function commuteLegHours(member: MemberScenario): number {
  if (!leavesHome(member) || member.commuteKm === 0) {
    return 0;
  }
  const hours = member.commuteKm / COMMUTE_MODE_PROFILES[member.commuteMode].speedKmPerHour;
  const quarters = Math.max(1, Math.round(hours * QUARTERS_PER_HOUR));
  return Math.min(MAX_COMMUTE_HOURS, quarters / QUARTERS_PER_HOUR);
}

/** Base days already built, keyed by everything that shapes one. */
const BASE_DAYS = new Map<string, readonly Whereabouts[]>();

/** Bounds the memo: there are only a few hundred distinct base days in practice. */
export const MAX_CACHED_BASE_DAYS = 256;

/**
 * The day without exercise: sleep, home, and the school or work trip.
 *
 * Profiling showed this was 39% of engine time: every action's what-if
 * rebuilt identical days. A day depends only on where the member goes, how
 * long the trip takes and when they leave, so it is built once per shape and
 * shared read-only. Memoising a pure function keeps the engine pure.
 */
function baseDay(member: MemberScenario, departHour: number): readonly Whereabouts[] {
  const leg = commuteLegHours(member);
  const key = `${member.daytime}|${String(leg)}|${String(departHour)}`;
  const cached = BASE_DAYS.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const quarters = new Array<Whereabouts>(QUARTERS_PER_DAY).fill('home');
  paint(quarters, SLEEP.startHour, SLEEP.hours, 'sleep');
  if (member.daytime !== 'home') {
    const away = AWAY_HOURS[member.daytime];
    paint(quarters, departHour, leg, 'commute');
    paint(quarters, departHour + leg, away, 'destination');
    paint(quarters, departHour + leg + away, leg, 'commute');
  }
  if (BASE_DAYS.size >= MAX_CACHED_BASE_DAYS) {
    BASE_DAYS.clear();
  }
  BASE_DAYS.set(key, quarters);
  return quarters;
}

/** True when every quarter of `hour` is spent awake at home. */
function isFreeHour(quarters: readonly Whereabouts[], hour: number): boolean {
  const start = hour * QUARTERS_PER_HOUR;
  return quarters.slice(start, start + QUARTERS_PER_HOUR).every((place) => place === 'home');
}

/** Daylight hours the member is at home and awake, when exercise could happen. */
export function freeDaylightHours(member: MemberScenario, departHour: number): number[] {
  const quarters = baseDay(member, departHour);
  const { firstHour, lastHour } = DAYLIGHT_WINDOW;
  return Array.from(
    { length: lastHour - firstHour + 1 },
    (_unused, offset) => firstHour + offset,
  ).filter((hour) => isFreeHour(quarters, hour));
}

/**
 * The member's whereabouts for every quarter-hour of a typical weekday.
 * Exercise only replaces time at home: it never overlaps school or work.
 */
export function buildSchedule(member: MemberScenario, departHour: number): readonly Whereabouts[] {
  const base = baseDay(member, departHour);
  if (member.outdoorExercise === 'none') {
    return base;
  }
  const quarters = [...base];
  const place = member.exerciseIndoors ? 'exercise-indoor' : 'exercise-outdoor';
  const start = member.exerciseHour * QUARTERS_PER_HOUR;
  const count = EXERCISE_SESSION_HOURS * QUARTERS_PER_HOUR;
  for (let offset = 0; offset < count; offset += 1) {
    const index = (start + offset) % QUARTERS_PER_DAY;
    if (quarters[index] === 'home' || quarters[index] === 'sleep') {
      quarters[index] = place;
    }
  }
  return quarters;
}
