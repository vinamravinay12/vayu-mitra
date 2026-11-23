import { ACTIVITY_PROFILES, type ActivityProfile, type Intensity } from '../catalog/activities.js';
import { categoryRank } from '../aqi/compute-aqi.js';
import {
  SENSITIVE_AGES,
  type Activity,
  type Day,
  type HomeFeature,
} from '../catalog/vocabulary.js';
import type { PersonFact } from '../memory/memory-schema.js';
import { nowHour, type AirReport, type ReportHour } from '../schemas/air-report.js';
import { localClock, minutesOfDay } from '../time/local-clock.js';
import type { ActivityAdvice, AdviceHour, Verdict } from './advice-schema.js';
import { chooseTips } from './choose-tips.js';

/** Outdoor plans are only suggested in these local hours. */
export const DAYLIGHT = { first: 6, last: 20 } as const;

/** Highest category each intensity is fine in for a healthy adult, outdoors. */
const GO_LIMIT: Readonly<Record<Intensity, number>> = { light: 2, moderate: 2, vigorous: 1 };

/**
 * In a closed car with the AC on recirculate, cabin PM2.5 runs well below the
 * road's, so a trip is fine up to Poor for a healthy adult.
 */
const VEHICLE_GO_LIMIT = 3;

/** Who is at higher risk among the people involved. */
export function sensitivePeople(people: readonly PersonFact[]): string[] {
  return people
    .filter((person) => SENSITIVE_AGES.includes(person.ageGroup) || person.conditions.length > 0)
    .map((person) => person.label);
}

/** The parts of an outlook hour that advice reports. */
const toAdviceHour = (hour: ReportHour): AdviceHour => ({
  time: hour.time,
  aqi: hour.aqi,
  category: hour.category,
});

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

/** The window of `length` hours in daylight with the lowest mean index, as its first hour. */
export function cleanestWindow(hours: readonly ReportHour[], length: number): ReportHour | null {
  let best: { hour: ReportHour; mean: number } | null = null;
  for (const [start, hour] of hours.entries()) {
    const window = hours.slice(start, start + length);
    const startHour = Number(hour.time.slice(11, 13));
    const inDaylight = startHour >= DAYLIGHT.first && startHour + length - 1 <= DAYLIGHT.last;
    const mean = window.reduce((sum, next) => sum + next.aqi, 0) / length;
    if (window.length === length && inDaylight && (best === null || mean < best.mean)) {
      best = { hour, mean };
    }
  }
  return best?.hour ?? null;
}

/** Highest category ranks that mean go, and go with care. */
function limits(profile: ActivityProfile, sensitive: boolean): { go: number; care: number } {
  const base = profile.setting === 'in-vehicle' ? VEHICLE_GO_LIMIT : GO_LIMIT[profile.intensity];
  const go = Math.max(0, base - (sensitive ? 1 : 0));
  return { go, care: go + 1 };
}

/** The verdict and the hour it is for, from the planned hour, a better window if any, and the limits. */
function decideVerdict(
  planned: ReportHour,
  better: ReportHour | null,
  bar: { go: number; care: number },
  airing: boolean,
): { verdict: Verdict; chosen: ReportHour } {
  const plannedRank = categoryRank(planned.category);
  if (plannedRank <= bar.go) return { verdict: 'go', chosen: planned };
  if (better !== null && categoryRank(better.category) <= bar.go) {
    return { verdict: 'shift', chosen: better };
  }
  // Airing with smog is never "careful": windows are open or shut.
  if (plannedRank <= bar.care && !airing) return { verdict: 'care', chosen: planned };
  if (better !== null && categoryRank(better.category) <= bar.care) {
    return { verdict: 'shift', chosen: better };
  }
  return { verdict: 'skip', chosen: planned };
}

/**
 * The hour the plan is for and the cleanest window to compare it with. Asked
 * about a day, the window is looked for on that day only; "tomorrow" with no
 * time plans for tomorrow's cleanest window itself.
 */
function planAndWindow(
  input: AdviceInput,
  defaultMinutes: number,
): { planned: ReportHour; best: ReportHour | null } {
  const date = dateFor(input.report, input.day, input.now);
  const length = Math.max(1, Math.ceil((input.minutes ?? defaultMinutes) / 60));
  const hours = input.report.hours.filter((hour) => date === null || hour.time.startsWith(date));
  const best = cleanestWindow(hours, length);
  const planned =
    input.time === null && date !== null && best !== null
      ? best
      : plannedHour(input.report, input.time, date);
  return { planned, best };
}

/** Inputs for one piece of advice. */
export interface AdviceInput {
  readonly activity: Activity;
  readonly report: AirReport;
  readonly now: Date;
  readonly people: readonly PersonFact[];
  readonly home: readonly HomeFeature[];
  readonly time: string | null;
  /** Today or tomorrow, when the question said; null means the next occurrence. */
  readonly day: Day | null;
  readonly minutes: number | null;
}

/**
 * Whether, and when, to do an activity, from the station-anchored outlook and
 * who is involved. Harder breathing and sensitive people both lower the bar.
 * The thresholds follow CPCB's category guidance; they rank options, they are
 * not a medical judgement.
 */
export function adviseActivity(input: AdviceInput): ActivityAdvice {
  const profile = ACTIVITY_PROFILES[input.activity];
  const airing = profile.setting === 'home';
  const sensitiveFor = airing ? [] : sensitivePeople(input.people);
  const { planned, best } = planAndWindow(input, profile.defaultMinutes);
  const better =
    best !== null && best.aqi < planned.aqi && best.time !== planned.time ? best : null;
  const { verdict, chosen } = decideVerdict(
    planned,
    better,
    limits(profile, sensitiveFor.length > 0),
    airing,
  );
  return {
    activity: input.activity,
    verdict,
    planned: toAdviceHour(planned),
    bestWindow: better === null ? null : toAdviceHour(better),
    sensitiveFor,
    tips: chooseTips({
      rank: categoryRank(chosen.category),
      sensitive: sensitiveFor.length > 0,
      people: input.people,
      home: input.home,
      activity: input.activity,
      setting: profile.setting,
    }),
    indoorAlternative: profile.indoorAlternative,
  };
}
