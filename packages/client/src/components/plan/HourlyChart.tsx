import type { DaySummary } from '@vayu/core';
import { useId } from 'react';
import { hourLabel, hoursRange } from '../../lib/format.js';
import { AQI_LABELS } from '../../lib/labels.js';

/** Chart geometry in SVG units. */
const BAR_WIDTH = 8;
const BAR_GAP = 2;
const CHART_HEIGHT = 100;

/** The scale never shrinks below this, so a clean day does not look like a smoggy one. */
const MIN_SCALE_PM25 = 150;

/** Axis labels under the bars. */
const AXIS_LABELS = ['12 am', '6 am', '12 pm', '6 pm', '11 pm'] as const;

/** The bars, coloured by NAQI band; the current hour is outlined. */
function Bars({
  day,
  localHour,
  labelledBy,
}: {
  readonly day: DaySummary;
  readonly localHour: number;
  readonly labelledBy: string;
}): React.JSX.Element {
  const scale = Math.max(MIN_SCALE_PM25, day.peak.pm25);
  const width = day.hourly.length * (BAR_WIDTH + BAR_GAP);
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(CHART_HEIGHT)}`}
      className="h-40 w-full"
      role="img"
      aria-labelledby={labelledBy}
      aria-describedby={`${labelledBy}-summary`}
      preserveAspectRatio="none"
    >
      {day.hourly.map((reading) => {
        const height = Math.max(2, (reading.pm25 / scale) * CHART_HEIGHT);
        const now = reading.hour === localHour;
        return (
          <rect
            key={reading.hour}
            x={reading.hour * (BAR_WIDTH + BAR_GAP)}
            y={CHART_HEIGHT - height}
            width={BAR_WIDTH}
            height={height}
            rx={1.5}
            className={`fill-aqi-${reading.category}${now ? ' stroke-ink' : ''}`}
            strokeWidth={now ? 1.5 : 0}
          />
        );
      })}
    </svg>
  );
}

/** The same data as a table, for anyone who cannot see or read the bars. */
function HourlyTable({ day }: { readonly day: DaySummary }): React.JSX.Element {
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-brand">
        Show hourly values
      </summary>
      <table className="mt-2 w-full text-left text-sm">
        <caption className="sr-only">Hourly PM2.5 forecast</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">PM2.5 (µg/m³)</th>
            <th scope="col">Band</th>
          </tr>
        </thead>
        <tbody>
          {day.hourly.map((reading) => (
            <tr key={reading.hour} className="border-t border-line">
              <th scope="row" className="font-normal">
                {hourLabel(reading.hour)}
              </th>
              <td>{reading.pm25}</td>
              <td>{AQI_LABELS[reading.category]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/**
 * Today's hourly PM2.5 as bars coloured by NAQI band. The picture has a text
 * equivalent: a summary for screen readers and the full table one click away.
 */
export function HourlyChart({
  day,
  localHour,
}: {
  readonly day: DaySummary;
  readonly localHour: number;
}): React.JSX.Element {
  const titleId = useId();
  return (
    <figure className="card space-y-3">
      <figcaption id={titleId} className="text-lg font-semibold">
        PM2.5 through the day
      </figcaption>
      <Bars day={day} localHour={localHour} labelledBy={titleId} />
      <div aria-hidden="true" className="flex justify-between text-xs text-muted">
        {AXIS_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <p id={`${titleId}-summary`} className="text-sm text-ink-soft">
        Worst around {hourLabel(day.peak.hour)} at {day.peak.pm25} µg/m³; cleanest{' '}
        {hoursRange(day.cleanWindow.hours)} at {day.cleanWindow.meanPm25} µg/m³. The outlined bar is
        now.
      </p>
      <HourlyTable day={day} />
    </figure>
  );
}
