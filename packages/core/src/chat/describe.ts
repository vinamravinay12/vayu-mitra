/**
 * Plain-language sentences built from the engine's facts. They are the reply
 * when the AI is unavailable, and the facts the AI is told to stay within.
 */
import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { CATEGORY_LABELS } from '../catalog/aqi-bands.js';
import { cleanestWindow } from '../advice/advise-activity.js';
import type { ActivityAdvice, AdviceHour } from '../advice/advice-schema.js';
import { ADVICE_TIPS } from '../advice/tips.js';
import type { AirReport } from '../schemas/air-report.js';
import { STATION_SOURCE_LABELS } from '../stations/station.js';
import { capitalise, labelHour } from '../time/local-clock.js';

/** "at 7 am", or "tomorrow at 7 am" when the hour is not on the outlook's first day. */
export const describeTime = (time: string, report: AirReport): string =>
  labelHour(time, report.hours[0]?.time.slice(0, 10), true);

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
      : `The cleanest daylight hours ahead start ${describeTime(best.time, report)}: ${describeLevel(best)}.`;
  return `Right now the air is ${now}, ${describeSource(report)}. ${outlook}`;
}

/** What moving to the better hour saves, in one sentence; empty when there is no real saving. */
function describeImpact(impact: ActivityAdvice['impact']): string {
  return impact === null
    ? ''
    : ` That means breathing about ${String(impact.percentLess)}% less PM2.5: roughly ${String(impact.betterMicrograms)} µg instead of ${String(impact.plannedMicrograms)} µg over ${String(impact.minutes)} minutes.`;
}

/** The verdict in words, with the precautions. */
export function describeAdvice(advice: ActivityAdvice, report: AirReport): string {
  const name = ACTIVITY_PROFILES[advice.activity].label;
  const at = `${capitalise(describeTime(advice.planned.time, report))} it is ${describeLevel(advice.planned)}`;
  const best = advice.bestWindow;
  const shifted =
    best === null
      ? ''
      : `It looks better ${describeTime(best.time, report)}: ${describeLevel(best)}`;
  const verdicts = {
    go: `${at}, which is fine for the ${name}.`,
    shift: `${at}. ${shifted}, so move the ${name} to then.${describeImpact(advice.impact)}`,
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

/** Another place's air, named, as the reply and the comparison use it. */
export interface PlaceAir {
  readonly name: string;
  readonly report: AirReport;
}

/** One place's air now, in a line: "Ghaziabad: Very poor (AQI 342), measured at …". */
export const describePlace = ({ name, report }: PlaceAir): string =>
  `${name}: ${describeLevel(report.current)}, ${describeSource(report)}`;

/** Each place's air now, and which is cleaner when there are several. */
export function comparePlaces(places: readonly PlaceAir[]): string {
  const lines = `${places.map(describePlace).join('. ')}.`;
  const [cleanest, next] = [...places].sort(
    (first, second) => first.report.current.aqi - second.report.current.aqi,
  );
  if (cleanest === undefined || next === undefined) {
    return lines;
  }
  const verdict =
    cleanest.report.current.aqi === next.report.current.aqi
      ? 'The air is about the same in both right now.'
      : `${cleanest.name} has the cleaner air right now.`;
  return `${lines} ${verdict}`;
}
