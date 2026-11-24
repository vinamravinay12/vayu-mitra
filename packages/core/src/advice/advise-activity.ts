/** Deciding an activity: go, better later, OK with care, or skip, for who is involved. */
import { ACTIVITY_PROFILES, type ActivityProfile, type Intensity } from '../catalog/activities.js';
import { categoryRank } from '../aqi/compute-aqi.js';
import {
  SENSITIVE_AGES,
  type Activity,
  type Day,
  type HomeFeature,
  type Period,
} from '../catalog/vocabulary.js';
import type { PersonFact } from '../memory/memory-schema.js';
import type { AirReport, ReportHour } from '../schemas/air-report.js';
import type { ActivityAdvice, AdviceHour, Verdict } from './advice-schema.js';
import { chooseTips } from './choose-tips.js';
import { planAndWindow } from './plan.js';

export { cleanestWindow, dateFor, plannedHour } from './plan.js';

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

/** Highest category ranks that mean go, and go with care. */
function limits(profile: ActivityProfile, sensitive: boolean): { go: number; care: number } {
  const base = profile.setting === 'in-vehicle' ? VEHICLE_GO_LIMIT : GO_LIMIT[profile.intensity];
  const go = Math.max(0, base - (sensitive ? 1 : 0));
  return { go, care: go + 1 };
}

/** The verdict and the hour it is for, from the planned hour, a better window if any, and the limits. */
function decideVerdict(
  { planned, better }: { readonly planned: ReportHour; readonly better: ReportHour | null },
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
  /** Today or tomorrow, when the question said; null means the next occurrence. */
  readonly day: Day | null;
  /** Morning, afternoon, evening or night, when the question said one instead of a time. */
  readonly period: Period | null;
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
    { planned, better },
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
