import { ACTIVITY_PROFILES, type Intensity } from '../catalog/activities.js';
import { categoryRank } from '../aqi/compute-aqi.js';
import {
  RESPIRATORY_CONDITIONS,
  SENSITIVE_AGES,
  type Activity,
  type HomeFeature,
} from '../catalog/vocabulary.js';
import type { PersonFact } from '../memory/memory-schema.js';
import { nowHour, type AirReport, type ReportHour } from '../schemas/air-report.js';
import { localClock, minutesOfDay } from '../time/local-clock.js';
import type { ActivityAdvice, AdviceHour, Verdict } from './advice-schema.js';
import type { AdviceTip } from './tips.js';

/** Outdoor plans are only suggested in these local hours. */
export const DAYLIGHT = { first: 6, last: 20 } as const;

/** Highest category each intensity is fine in for a healthy adult. */
const GO_LIMIT: Readonly<Record<Intensity, number>> = { light: 2, moderate: 2, vigorous: 1 };

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

/** The next outlook hour a `HH:MM` falls in, or the first hour (now) when unset. */
export function plannedHour(report: AirReport, time: string | null, now: Date): ReportHour {
  if (time === null) {
    return nowHour(report);
  }
  const clock = localClock(now, report.utcOffsetSeconds);
  // The outlook starts at the current hour, so a time already past today lands on tomorrow.
  const offset = (Math.floor(minutesOfDay(time) / 60) - clock.hour + 24) % 24;
  return report.hours[offset] ?? nowHour(report);
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

/** What the precautions depend on. */
interface TipContext {
  readonly rank: number;
  readonly sensitive: boolean;
  readonly people: readonly PersonFact[];
  readonly home: readonly HomeFeature[];
  readonly activity: Activity;
}

/** Precautions for being outside. */
function outdoorTips({ rank, sensitive, home, activity }: TipContext): AdviceTip[] {
  if (activity === 'open-windows') {
    return [];
  }
  const mask: AdviceTip[] =
    rank >= 3 || (sensitive && rank >= 2)
      ? [home.includes('n95-masks') ? 'wear-n95' : 'get-n95']
      : [];
  const pace: AdviceTip[] = rank >= 2 ? ['ease-off', 'avoid-traffic'] : [];
  return [...mask, ...pace];
}

/** The precautions that apply, in the order they matter. */
function chooseTips(context: TipContext): AdviceTip[] {
  const { rank, people, home, activity } = context;
  const lungs = people.some((person) =>
    person.conditions.some((condition) => RESPIRATORY_CONDITIONS.includes(condition)),
  );
  const tips = [...outdoorTips(context), ...(lungs ? (['carry-inhaler'] as const) : [])];
  if (rank >= 3) {
    tips.push(home.includes('air-purifier') ? 'run-purifier' : 'keep-windows-shut');
    if (activity === 'school-run' && home.includes('car')) tips.push('recirculate');
  }
  return tips;
}

/** Highest category ranks that mean go, and go with care. */
function limits(intensity: Intensity, sensitive: boolean): { go: number; care: number } {
  const go = Math.max(0, GO_LIMIT[intensity] - (sensitive ? 1 : 0));
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

/** Inputs for one piece of advice. */
export interface AdviceInput {
  readonly activity: Activity;
  readonly report: AirReport;
  readonly now: Date;
  readonly people: readonly PersonFact[];
  readonly home: readonly HomeFeature[];
  readonly time: string | null;
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
  const airing = input.activity === 'open-windows';
  const sensitiveFor = airing ? [] : sensitivePeople(input.people);
  const planned = plannedHour(input.report, input.time, input.now);
  const length = Math.max(1, Math.ceil((input.minutes ?? profile.defaultMinutes) / 60));
  const best = cleanestWindow(input.report.hours, length);
  const better =
    best !== null && best.aqi < planned.aqi && best.time !== planned.time ? best : null;
  const { verdict, chosen } = decideVerdict(
    planned,
    better,
    limits(profile.intensity, sensitiveFor.length > 0),
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
    }),
    indoorAlternative: profile.indoorAlternative,
  };
}
