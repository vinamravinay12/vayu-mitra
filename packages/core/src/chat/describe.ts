import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { CATEGORY_LABELS } from '../catalog/aqi-bands.js';
import { cleanestWindow } from '../advice/advise-activity.js';
import type { ActivityAdvice, AdviceHour } from '../advice/advice-schema.js';
import { ADVICE_TIPS } from '../advice/tips.js';
import type { AirReport } from '../schemas/air-report.js';
import { STATION_SOURCE_LABELS } from '../stations/station.js';
import { formatHour } from '../time/local-clock.js';

/**
 * Plain-language sentences built from the engine's facts. They are the reply
 * when the AI is unavailable, and the facts the AI is told to stay within.
 */

/** "7 am", or "tomorrow 7 am" when the hour is not on the outlook's first day. */
export function describeTime(time: string, report: AirReport): string {
  const today = report.hours[0]?.time.slice(0, 10);
  const hour = formatHour(Number(time.slice(11, 13)));
  return time.slice(0, 10) === today ? hour : `tomorrow ${hour}`;
}

/** "Very poor (AQI 342)". */
export const describeLevel = (hour: Pick<AdviceHour, 'aqi' | 'category'>): string =>
  `${CATEGORY_LABELS[hour.category]} (AQI ${String(hour.aqi)})`;

/** Where the current number comes from. */
export function describeSource(report: AirReport): string {
  return report.station === null
    ? 'from the forecast model; no official station has reported nearby in the last few hours'
    : `measured at ${report.station.name}, ${String(report.station.distanceKm)} km away (${STATION_SOURCE_LABELS[report.station.source]})`;
}

/** The air now and the cleanest stretch ahead. */
export function describeAir(report: AirReport): string {
  const now = describeLevel(report.current);
  const best = cleanestWindow(report.hours, 2);
  const outlook =
    best === null || best.aqi >= report.current.aqi
      ? 'It is not expected to get cleaner in daylight hours soon.'
      : `The cleanest daylight hours ahead start around ${describeTime(best.time, report)}, at ${describeLevel(best)}.`;
  return `Right now the air is ${now}, ${describeSource(report)}. ${outlook}`;
}

/** The verdict in words, with the precautions. */
export function describeAdvice(advice: ActivityAdvice, report: AirReport): string {
  const name = ACTIVITY_PROFILES[advice.activity].label;
  const at = `At ${describeTime(advice.planned.time, report)} it is ${describeLevel(advice.planned)}`;
  const best = advice.bestWindow;
  const shifted =
    best === null
      ? ''
      : `${describeTime(best.time, report)} looks better, at ${describeLevel(best)}`;
  const verdicts = {
    go: `${at}, which is fine for the ${name}.`,
    shift: `${at}. ${shifted}, so move the ${name} to then.`,
    care: `${at}. The ${name} is OK if you keep it short and take precautions.`,
    skip: `${at}, and it does not get good enough today. Skip the ${name}; try ${advice.indoorAlternative} instead.`,
  };
  const who =
    advice.sensitiveFor.length === 0
      ? ''
      : ` ${advice.sensitiveFor.join(' and ')} ${advice.sensitiveFor.length === 1 ? 'is' : 'are'} more sensitive to smog, so I have been more careful.`;
  const tips = advice.tips.map((tip) => ADVICE_TIPS[tip]).join(' ');
  return `${verdicts[advice.verdict]}${who}${tips === '' ? '' : ` ${tips}`}`;
}
