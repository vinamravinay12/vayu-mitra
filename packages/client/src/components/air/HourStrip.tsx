/** The next twelve hours as labelled bars, readable without colour. */
import { CATEGORY_LABELS, labelHour, nowHour, type ReportHour } from '@vayu/core';

/** Hours shown ahead. */
const STRIP_HOURS = 12;

/** One hour: its number, a bar scaled to the highest hour, and its time, as one spoken sentence. */
function Hour({
  hour,
  today,
  highest,
}: {
  readonly hour: ReportHour;
  readonly today: string;
  readonly highest: number;
}): React.JSX.Element {
  return (
    <li className="flex min-h-24 min-w-0 flex-col items-center justify-end gap-1">
      <span aria-hidden="true" className="text-xs font-semibold tabular-nums">
        {hour.aqi}
      </span>
      <span
        aria-hidden="true"
        className={`aqi-${hour.category} w-full rounded-t`}
        style={{ height: `${String(Math.max(6, Math.round((hour.aqi / highest) * 64)))}px` }}
      />
      <span aria-hidden="true" className="text-center text-xs leading-tight text-muted">
        {labelHour(hour.time, today).replace('tomorrow ', '')}
      </span>
      <span className="sr-only">{`${labelHour(hour.time, today)}: ${String(hour.aqi)}, ${CATEGORY_LABELS[hour.category]}`}</span>
    </li>
  );
}

/**
 * The next twelve hours as bars. Each bar carries its number and category as
 * text, so colour is never the only way to read it. Text is at least 12 px,
 * so on a phone the hours wrap to two rows of six rather than shrink; a
 * screen reader hears one sentence per hour instead of three fragments.
 */
export function HourStrip({ hours }: { readonly hours: readonly ReportHour[] }): React.JSX.Element {
  const shown = hours.slice(0, STRIP_HOURS);
  const today = nowHour({ hours }).time.slice(0, 10);
  const highest = Math.max(...shown.map((hour) => hour.aqi), 1);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-soft">Next {STRIP_HOURS} hours</h3>
      <ol
        className="grid grid-cols-6 items-end gap-x-1 gap-y-3 sm:grid-cols-12"
        aria-label="Air index by hour"
      >
        {shown.map((hour) => (
          <Hour key={hour.time} hour={hour} today={today} highest={highest} />
        ))}
      </ol>
    </div>
  );
}
