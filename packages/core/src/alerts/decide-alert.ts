import { categoryRank } from '../aqi/compute-aqi.js';
import { CATEGORY_LABELS } from '../catalog/aqi-bands.js';
import { sensitivePeople } from '../advice/advise-activity.js';
import type { Memory } from '../memory/memory-schema.js';
import type { AirReport } from '../schemas/air-report.js';
import { isWithinWindow, localClock } from '../time/local-clock.js';
import type { AlertSettings, AlertState } from './alert-settings.js';

/** A family is not told the same thing twice in this long unless it gets worse. */
export const ALERT_COOLDOWN_MS = 6 * 60 * 60_000;

export type AlertDecision =
  | {
      readonly send: false;
      readonly reason: 'disabled' | 'below-threshold' | 'quiet-hours' | 'cooldown';
      readonly state: AlertState;
    }
  | {
      readonly send: true;
      readonly title: string;
      readonly body: string;
      readonly state: AlertState;
    };

/** The notification text: what the air is, and who it matters for. */
export function alertMessage(
  report: AirReport,
  memory: Memory,
  placeName: string,
): { title: string; body: string } {
  const { aqi, category } = report.current;
  const who = sensitivePeople(memory.people);
  const advice =
    who.length > 0
      ? `Keep ${who.slice(0, 2).join(' and ')} indoors where you can.`
      : 'Keep outdoor time short and windows shut.';
  return {
    title: `${CATEGORY_LABELS[category]} air in ${placeName}: AQI ${String(aqi)}`,
    body: `${advice} Open Vayu Mitra to plan around the cleaner hours.`,
  };
}

/**
 * Whether to notify a family now. Alerts fire when the air reaches their
 * chosen category, never in quiet hours, and at most once per six hours unless
 * the air gets a category worse. When the air drops back below the threshold
 * the state resets, so the next rise is announced.
 */
export function decideAlert(input: AlertInput): AlertDecision {
  const rank = categoryRank(input.report.current.category);
  return (
    holdBack(input, rank) ?? {
      send: true,
      ...alertMessage(input.report, input.memory, input.placeName),
      state: { lastSentAt: input.now.toISOString(), lastSentRank: rank },
    }
  );
}

/** What one alert decision reads: the family's settings and history, the air, and the time. */
export interface AlertInput {
  readonly settings: AlertSettings;
  readonly state: AlertState;
  readonly report: AirReport;
  readonly memory: Memory;
  readonly placeName: string;
  readonly now: Date;
}

/** The reason not to send now, with the state to keep; null when the alert should go. */
function holdBack(input: AlertInput, rank: number): Extract<AlertDecision, { send: false }> | null {
  const { settings, state, report, now } = input;
  if (!settings.enabled) return { send: false, reason: 'disabled', state };
  if (rank < categoryRank(settings.threshold)) {
    return { send: false, reason: 'below-threshold', state: { ...state, lastSentRank: null } };
  }
  const clock = localClock(now, report.utcOffsetSeconds);
  if (isWithinWindow(clock.hour * 60 + clock.minute, settings.quietStart, settings.quietEnd)) {
    return { send: false, reason: 'quiet-hours', state };
  }
  return coolingDown(state, rank, now) ? { send: false, reason: 'cooldown', state } : null;
}

/** True when the family was told recently and the air has not got a category worse since. */
function coolingDown(state: AlertState, rank: number, now: Date): boolean {
  const worse = state.lastSentRank === null || rank > state.lastSentRank;
  const recent =
    state.lastSentAt !== null && now.getTime() - Date.parse(state.lastSentAt) < ALERT_COOLDOWN_MS;
  return !worse && recent;
}
