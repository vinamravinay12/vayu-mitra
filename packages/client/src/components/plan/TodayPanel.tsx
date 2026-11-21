import type { CleanAirPlan, RoutineTone } from '@vayu/core';
import { hourLabel } from '../../lib/format.js';
import { AqiCard } from './AqiCard.js';
import { HourlyChart } from './HourlyChart.js';

/** Visual and spoken treatment of each routine tone. */
const TONES: Readonly<Record<RoutineTone, { readonly label: string; readonly className: string }>> =
  {
    good: { label: 'Good time', className: 'bg-ok-bg text-ok-fg' },
    caution: { label: 'Take care', className: 'bg-warn-bg text-warn-fg' },
    avoid: { label: 'Avoid', className: 'bg-danger-bg text-danger-fg' },
  };

/** Alert styling by severity. */
const SEVERITY_CLASS = {
  urgent: 'border-danger-fg bg-danger-bg',
  warning: 'border-warn-fg bg-warn-bg',
  info: 'border-info-fg bg-info-bg',
} as const;

/** Today: the air, the safety alerts that apply, and the hour-by-hour routine. */
export function TodayPanel({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  return (
    <div className="space-y-5">
      <AqiCard plan={plan} />
      {plan.alerts.length === 0 ? null : (
        <section className="space-y-2" aria-labelledby="alerts-heading">
          <h2 id="alerts-heading" className="text-lg font-semibold">
            Safety for your family
          </h2>
          <ul className="space-y-2">
            {plan.alerts.map((alert) => (
              <li
                key={alert.id}
                className={`rounded-lg border-l-4 p-4 ${SEVERITY_CLASS[alert.severity]}`}
              >
                <h3 className="font-semibold text-ink">{alert.title}</h3>
                <p className="text-sm text-ink">{alert.message}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">General precautions, not medical advice.</p>
        </section>
      )}
      <HourlyChart day={plan.today} localHour={plan.localHour} />
      <section className="card space-y-3" aria-labelledby="routine-heading">
        <h2 id="routine-heading" className="text-lg font-semibold">
          Today’s routine
        </h2>
        <p className="text-sm text-ink-soft">
          Built from the forecast and the actions you have chosen; it updates as you change them.
        </p>
        <ol className="space-y-3">
          {plan.routine.map((item) => (
            <li key={`${item.kind}-${item.title}`} className="flex gap-3">
              <span className="w-14 shrink-0 pt-0.5 text-sm font-semibold">
                {hourLabel(item.hour)}
              </span>
              <div>
                <p className="font-semibold">
                  {item.title}{' '}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[item.tone].className}`}
                  >
                    {TONES[item.tone].label}
                  </span>
                </p>
                <p className="text-sm text-ink-soft">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
