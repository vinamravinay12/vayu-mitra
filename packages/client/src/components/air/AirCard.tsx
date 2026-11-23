import {
  CATEGORY_GUIDANCE,
  CATEGORY_LABELS,
  formatHour,
  hourOfTime,
  STATION_SOURCE_LABELS,
  type AirReport,
  type Place,
} from '@vayu/core';
import type { AirState } from '../../state/use-air.js';
import { Alert } from '../ui/Alert.js';
import { HourStrip } from './HourStrip.js';

/** Where "now" comes from, in one line. */
function SourceLine({ report }: { readonly report: AirReport }): React.JSX.Element {
  const { station } = report;
  return (
    <p className="text-sm text-muted">
      {station === null
        ? 'Forecast estimate: no official station has reported nearby in the last few hours.'
        : `Measured at ${station.name}, ${String(station.distanceKm)} km away (${STATION_SOURCE_LABELS[station.source]}, ${formatHour(hourOfTime(station.observedAt))}). Hours ahead: forecast adjusted to this station.`}
    </p>
  );
}

/** The air now, on India's scale, and the next twelve hours. */
export function AirCard({
  air,
  place,
}: {
  readonly air: AirState;
  readonly place: Place;
}): React.JSX.Element {
  return (
    <section className="card space-y-4" aria-labelledby="air-heading">
      <h2 id="air-heading" className="text-lg font-bold">
        Air in {place.name}
      </h2>
      {air.status === 'error' && <Alert>{air.message}</Alert>}
      {(air.status === 'loading' || air.status === 'idle') && (
        <Alert kind="status">Checking the air…</Alert>
      )}
      {air.status === 'ready' && (
        <>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className={`aqi-${air.report.current.category} h-16 w-4 rounded-full`}
            />
            <p>
              <span className="block text-4xl font-bold tabular-nums">
                {air.report.current.aqi}
              </span>
              <span className="text-lg font-semibold">
                {CATEGORY_LABELS[air.report.current.category]}
              </span>
              <span className="sr-only"> on India’s National Air Quality Index</span>
            </p>
          </div>
          <p className="text-ink-soft">{CATEGORY_GUIDANCE[air.report.current.category]}</p>
          <SourceLine report={air.report} />
          <HourStrip hours={air.report.hours} />
        </>
      )}
    </section>
  );
}
