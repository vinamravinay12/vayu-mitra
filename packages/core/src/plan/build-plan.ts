import { localClock, nextDate, coversDate, selectDay } from '../air/select-day.js';
import { mean, roundTo1, summarizeDay, type DaySummary } from '../air/summarize-day.js';
import { assessActions, type AssessedAction } from '../actions/assess-actions.js';
import { applyChoices, normalizeChoices } from '../actions/choose-actions.js';
import {
  compareOutcomes,
  outcomeOf,
  type Impact,
  type ScenarioOutcome,
} from '../actions/compare-scenarios.js';
import { evaluateAlerts } from '../alerts/evaluate-alerts.js';
import { computeAqi, type AqiReading } from '../aqi/compute-aqi.js';
import type { HealthAlertRule } from '../catalog/health-alerts.js';
import { communityImpact, type CommunityImpact } from '../community/community-impact.js';
import { deriveContext } from '../context/derive-context.js';
import { buildRoutine } from '../routine/build-routine.js';
import type { RoutineItem } from '../routine/routine-item.js';
import { scenarioFromProfile } from '../scenario/from-profile.js';
import type { AirSnapshot, AirSource } from '../schemas/air.js';
import type { HouseholdProfile, Place } from '../schemas/profile.js';

/** Tomorrow compared with today, so families can plan ahead. */
export interface Outlook {
  readonly date: string;
  readonly meanPm25: number;
  readonly aqi: AqiReading;
  readonly trend: 'better' | 'similar' | 'worse';
}

/** Everything the app shows, computed from a profile, a forecast and a clock. */
export interface CleanAirPlan {
  readonly place: Place;
  readonly airSource: AirSource;
  /** Local hour at the place when the plan was built. */
  readonly localHour: number;
  readonly today: DaySummary;
  readonly tomorrow: Outlook | null;
  readonly baseline: ScenarioOutcome;
  readonly actions: readonly AssessedAction[];
  readonly chosenIds: readonly string[];
  readonly chosen: { readonly outcome: ScenarioOutcome; readonly impact: Impact };
  readonly routine: readonly RoutineItem[];
  readonly alerts: readonly HealthAlertRule[];
  readonly community: CommunityImpact;
}

/** Inputs to `buildPlan`. `chosenIds` null means "start from the engine's recommendations". */
export interface PlanInput {
  readonly profile: HouseholdProfile;
  readonly air: AirSnapshot;
  readonly now: Date;
  readonly chosenIds: readonly string[] | null;
}

/** A day-on-day change smaller than this share counts as "similar". */
const SIMILAR_SHARE = 0.1;

/** Tomorrow's outlook, or null when the forecast stops at today. */
function outlookFor(air: AirSnapshot, today: DaySummary): Outlook | null {
  const date = nextDate(today.date);
  if (!coversDate(air, date)) {
    return null;
  }
  const day = selectDay(air, date);
  const meanPm25 = mean(day.pm25);
  const change = (meanPm25 - today.meanPm25) / Math.max(today.meanPm25, 1);
  const trend = change > SIMILAR_SHARE ? 'worse' : change < -SIMILAR_SHARE ? 'better' : 'similar';
  return { date, meanPm25: roundTo1(meanPm25), aqi: computeAqi(meanPm25, mean(day.pm10)), trend };
}

/**
 * Builds the whole clean-air plan. Pure: the same profile, forecast, clock and
 * choices always give the same plan, in the browser or on the server.
 */
export function buildPlan({ profile, air, now, chosenIds }: PlanInput): CleanAirPlan {
  const clock = localClock(now, air.utcOffsetSeconds);
  const day = selectDay(air, clock.date);
  const today = summarizeDay(day);
  const baseline = scenarioFromProfile(profile);
  const baselineOutcome = outcomeOf(baseline, day.pm25);
  const context = deriveContext(profile, baseline, today, day.pm25);
  const actions = assessActions({
    members: profile.members,
    baseline,
    baselineOutcome,
    context,
    pm25: day.pm25,
  });
  const recommended = actions
    .filter((assessed) => assessed.recommended)
    .map((assessed) => assessed.action.id);
  const choices = normalizeChoices(chosenIds ?? recommended, actions);
  const chosenScenario = applyChoices(baseline, choices, day.pm25);
  const chosenOutcome = outcomeOf(chosenScenario, day.pm25);
  const chosenImpact = compareOutcomes(profile.members, baselineOutcome, chosenOutcome);
  return {
    place: profile.place,
    airSource: air.source,
    localHour: clock.hour,
    today,
    tomorrow: outlookFor(air, today),
    baseline: baselineOutcome,
    actions,
    chosenIds: choices,
    chosen: { outcome: chosenOutcome, impact: chosenImpact },
    routine: buildRoutine(today, chosenScenario),
    alerts: evaluateAlerts(context),
    community: communityImpact(profile.lifestyle.communityHouseholds, chosenImpact),
  };
}
