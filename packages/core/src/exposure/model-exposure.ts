import { PM25_PER_CIGARETTE } from '../catalog/aqi-bands.js';
import { COMMUTE_MODE_PROFILES } from '../catalog/commute-modes.js';
import {
  BREATHING_RATES,
  NON_RESIDENTIAL_RATIO,
  type Activity,
} from '../catalog/exposure-constants.js';
import type { MemberScenario, Scenario } from '../types/scenario.js';
import { buildSchedule, QUARTERS_PER_DAY, type Whereabouts } from './build-schedule.js';
import { indoorConcentrations } from './indoor-air.js';

/** Where a member's dose was breathed, grouped the way the explanations talk about it. */
export interface DoseBreakdown {
  readonly home: number;
  readonly commute: number;
  readonly away: number;
  readonly exercise: number;
}

/** One member's modelled exposure on a typical weekday. */
export interface MemberExposure {
  readonly name: string;
  /** PM2.5 inhaled over the day, in µg. */
  readonly doseUg: number;
  /** Time-weighted mean concentration breathed, in µg/m³. */
  readonly meanUgM3: number;
  /** `meanUgM3` expressed as cigarettes a day (Berkeley Earth equivalence). */
  readonly cigarettesPerDay: number;
  readonly breakdown: DoseBreakdown;
}

/** Hours per quarter-hour cell. */
const QUARTER_HOURS = 0.25;

/** Babies cannot wear masks, so a mask never changes what they breathe. */
const maskFor = (member: MemberScenario, scenario: Scenario): number =>
  member.ageGroup === 'infant' ? 1 : scenario.maskFactor;

/** The activity level for a place, which sets the breathing rate. */
function activityAt(place: Whereabouts, member: MemberScenario): Activity {
  switch (place) {
    case 'sleep':
      return 'sleep';
    case 'home':
      return 'rest';
    case 'commute':
      return COMMUTE_MODE_PROFILES[member.commuteMode].activity;
    case 'destination':
      return member.daytime === 'outdoors' ? 'light' : 'rest';
    case 'exercise-outdoor':
    case 'exercise-indoor':
      return member.outdoorExercise === 'vigorous' ? 'vigorous' : 'light';
  }
}

/** Inputs every concentration lookup needs for one member. */
interface AirContext {
  readonly member: MemberScenario;
  readonly scenario: Scenario;
  readonly outdoor: readonly number[];
  readonly indoor: readonly number[];
}

/** Places where the air breathed is the home's indoor air. */
const INDOOR_PLACES: ReadonlySet<Whereabouts> = new Set(['sleep', 'home', 'exercise-indoor']);

/** PM2.5 concentration breathed at `place` during `hour`, in µg/m³. */
function concentrationAt(place: Whereabouts, hour: number, air: AirContext): number {
  if (INDOOR_PLACES.has(place)) {
    return air.indoor[hour] ?? 0;
  }
  const outdoor = air.outdoor[hour] ?? 0;
  const mask = maskFor(air.member, air.scenario);
  switch (place) {
    case 'commute': {
      const mode = air.member.commuteMode;
      const cabin = air.scenario.commuteFactors[mode] ?? 1;
      return outdoor * COMMUTE_MODE_PROFILES[mode].exposureFactor * cabin * mask;
    }
    case 'destination':
      return air.member.daytime === 'outdoors' ? outdoor * mask : outdoor * NON_RESIDENTIAL_RATIO;
    default:
      return outdoor * mask;
  }
}

/** The breakdown bucket a place belongs to. */
function bucketOf(place: Whereabouts): keyof DoseBreakdown {
  if (place === 'sleep' || place === 'home') return 'home';
  if (place === 'commute') return 'commute';
  if (place === 'destination') return 'away';
  return 'exercise';
}

/** Models one member's PM2.5 dose for the day from their schedule and the hourly air. */
function memberExposure(air: AirContext): MemberExposure {
  const schedule = buildSchedule(air.member, air.scenario.departHour);
  const breakdown = { home: 0, commute: 0, away: 0, exercise: 0 };
  let concentrationHours = 0;
  schedule.forEach((place, quarter) => {
    const hour = Math.floor(quarter / 4);
    const concentration = concentrationAt(place, hour, air);
    const breathing = BREATHING_RATES[air.member.ageGroup][activityAt(place, air.member)];
    breakdown[bucketOf(place)] += concentration * breathing * QUARTER_HOURS;
    concentrationHours += concentration * QUARTER_HOURS;
  });
  const meanUgM3 = concentrationHours / (QUARTERS_PER_DAY * QUARTER_HOURS);
  return {
    name: air.member.name,
    doseUg: breakdown.home + breakdown.commute + breakdown.away + breakdown.exercise,
    meanUgM3,
    cigarettesPerDay: meanUgM3 / PM25_PER_CIGARETTE,
    breakdown,
  };
}

/** Models every member's exposure for one scenario against a day's outdoor PM2.5. */
export function modelExposure(
  scenario: Scenario,
  outdoorPm25: readonly number[],
): MemberExposure[] {
  const indoor = indoorConcentrations(scenario, outdoorPm25);
  return scenario.members.map((member) =>
    memberExposure({ member, scenario, outdoor: outdoorPm25, indoor }),
  );
}
