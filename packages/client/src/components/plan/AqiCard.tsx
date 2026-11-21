import { CATEGORY_GUIDANCE, WHO_PM25_24H_GUIDELINE, type CleanAirPlan } from '@vayu/core';
import { hoursRange, hourLabel } from '../../lib/format.js';
import { AQI_LABELS } from '../../lib/labels.js';

/** How tomorrow compares, in words. */
const TREND_WORDS = {
  better: 'cleaner than today',
  similar: 'about the same as today',
  worse: 'worse than today',
} as const;

/** Today's AQI with what it means, the cleanest window and tomorrow's outlook. */
export function AqiCard({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  const { today, tomorrow } = plan;
  return (
    <section className="card space-y-3" aria-labelledby="aqi-heading">
      <h2 id="aqi-heading" className="text-lg font-semibold">
        Today’s air
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        <p className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`aqi-${today.aqi.category} inline-block size-10 rounded-full`}
          />
          <span>
            <span className="block text-3xl font-bold">AQI {today.aqi.value}</span>
            <span className="block font-semibold">{AQI_LABELS[today.aqi.category]}</span>
          </span>
        </p>
        <p className="max-w-md text-sm text-ink-soft">{CATEGORY_GUIDANCE[today.aqi.category]}</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Average PM2.5</dt>
          <dd className="font-semibold">
            {today.meanPm25} µg/m³ — {today.whoMultiple}× the WHO limit of {WHO_PM25_24H_GUIDELINE}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cleanest window</dt>
          <dd className="font-semibold">
            {hoursRange(today.cleanWindow.hours)} ({today.cleanWindow.meanPm25} µg/m³)
          </dd>
        </div>
        <div>
          <dt className="text-muted">Worst hour</dt>
          <dd className="font-semibold">
            {hourLabel(today.peak.hour)} ({today.peak.pm25} µg/m³)
          </dd>
        </div>
      </dl>
      {tomorrow === null ? null : (
        <p className="text-sm">
          Tomorrow: AQI {tomorrow.aqi.value} ({AQI_LABELS[tomorrow.aqi.category]}),{' '}
          {TREND_WORDS[tomorrow.trend]}.
        </p>
      )}
    </section>
  );
}
