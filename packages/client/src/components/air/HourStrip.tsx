import { CATEGORY_LABELS, labelHour, nowHour, type ReportHour } from '@vayu/core';

/** Hours shown ahead. */
const STRIP_HOURS = 12;

/**
 * The next twelve hours as bars. Each bar carries its number and category as
 * text, so colour is never the only way to read it.
 */
export function HourStrip({ hours }: { readonly hours: readonly ReportHour[] }): React.JSX.Element {
  const shown = hours.slice(0, STRIP_HOURS);
  const today = nowHour({ hours }).time.slice(0, 10);
  const highest = Math.max(...shown.map((hour) => hour.aqi), 1);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-soft">Next {STRIP_HOURS} hours</h3>
      <ol className="flex min-h-28 items-end gap-1" aria-label="Air index by hour">
        {shown.map((hour) => (
          <li
            key={hour.time}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] font-semibold tabular-nums">{hour.aqi}</span>
            <span
              aria-hidden="true"
              className={`aqi-${hour.category} w-full rounded-t`}
              style={{ height: `${String(Math.max(6, Math.round((hour.aqi / highest) * 64)))}px` }}
            />
            <span className="text-center text-[10px] leading-tight text-muted">
              {labelHour(hour.time, today).replace('tomorrow ', '')}
            </span>
            <span className="sr-only">{`${labelHour(hour.time, today)}: ${CATEGORY_LABELS[hour.category]}`}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
