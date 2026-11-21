import {
  EMISSION_SOURCES,
  formatAmount,
  SMOG_SEASON_WEEKS,
  type CleanAirPlan,
  type DoseBreakdown,
} from '@vayu/core';
import { percentChange, wholeNumber } from '../../lib/format.js';
import { DOSE_PLACE_LABELS, SOURCE_LABELS } from '../../lib/labels.js';
import { CommunityCard } from './CommunityCard.js';

/** The places a dose is split into, in a stable order. */
const DOSE_PLACES = ['home', 'commute', 'away', 'exercise'] as const;

/** Shares below this are too small to mention. */
const MIN_SHARE_SHOWN = 0.05;

/** "62% at home, 30% at school or work" — where today's dose is breathed, largest first. */
export function doseSources(breakdown: DoseBreakdown): string {
  const places = DOSE_PLACES.map((place) => ({ place, dose: breakdown[place] }));
  const total = places.reduce((sum, entry) => sum + entry.dose, 0);
  return places
    .filter((entry) => total > 0 && entry.dose / total >= MIN_SHARE_SHOWN)
    .sort((first, second) => second.dose - first.dose)
    .map(
      (entry) =>
        `${String(Math.round((entry.dose / total) * 100))}% ${DOSE_PLACE_LABELS[entry.place]}`,
    )
    .join(', ');
}

/** Where each person's dose comes from today, so the family sees which changes can matter. */
function DoseSources({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  return (
    <div className="space-y-1 text-sm">
      <h3 className="font-semibold">Where today’s dose is breathed (before changes)</h3>
      <ul className="space-y-0.5 text-ink-soft">
        {plan.baseline.exposures.map((exposure) => (
          <li key={exposure.name}>
            <span className="font-medium text-ink">{exposure.name}:</span>{' '}
            {doseSources(exposure.breakdown)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Each member's day before and after the chosen actions. */
function MemberTable({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  return (
    <section className="card space-y-3" aria-labelledby="lungs-heading">
      <h2 id="lungs-heading" className="text-lg font-semibold">
        What each of you breathes
      </h2>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Daily PM2.5 dose per person, now and with your chosen actions
        </caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="py-1">
              Person
            </th>
            <th scope="col">PM2.5 inhaled a day</th>
            <th scope="col">Like smoking</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {plan.chosen.impact.members.map((member) => (
            <tr key={member.name} className="border-t border-line">
              <th scope="row" className="py-2 font-semibold">
                {member.name}
              </th>
              <td>
                {wholeNumber(member.beforeDoseUg)} → {wholeNumber(member.afterDoseUg)} µg
              </td>
              <td>
                {member.beforeCigarettes} → {member.afterCigarettes} cigarettes
              </td>
              <td className="font-semibold">{percentChange(member.reductionPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <DoseSources plan={plan} />
      <p className="text-xs text-muted">
        Modelled for a typical weekday from today’s forecast, your home and your routines. “Like
        smoking” uses Berkeley Earth’s rule of thumb: breathing 22 µg/m³ of PM2.5 for a day is about
        one cigarette.
      </p>
    </section>
  );
}

/** What the household adds to the shared air, by source, before and after. */
function EmissionsCard({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  const before = plan.baseline.emissions;
  const after = plan.chosen.outcome.emissions;
  const sources = EMISSION_SOURCES.filter(
    (source) => before.pm25BySource[source] > 0 || after.pm25BySource[source] > 0,
  );
  return (
    <section className="card space-y-3" aria-labelledby="emissions-heading">
      <h2 id="emissions-heading" className="text-lg font-semibold">
        What your household adds to the smog
      </h2>
      <p className="text-sm">
        PM2.5:{' '}
        <strong>
          {formatAmount(before.pm25Grams)} → {formatAmount(after.pm25Grams)} g a week
        </strong>
        ; CO₂:{' '}
        <strong>
          {formatAmount(before.co2Kg)} → {formatAmount(after.co2Kg)} kg a week
        </strong>
        . Over a {SMOG_SEASON_WEEKS}-week smog season your choices keep{' '}
        <strong>{formatAmount(plan.chosen.impact.pm25GramsSeasonSaved)} g</strong> of PM2.5 out of
        the air your neighbours breathe.
      </p>
      <ul className="space-y-1 text-sm">
        {sources.map((source) => (
          <li key={source} className="flex justify-between gap-3 border-t border-line pt-1">
            <span>{SOURCE_LABELS[source]}</span>
            <span>
              {formatAmount(before.pm25BySource[source])} →{' '}
              {formatAmount(after.pm25BySource[source])} g PM2.5 a week
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The direct impact of the family's choices: on each person, on the neighbourhood, on the community. */
export function ImpactPanel({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  return (
    <div className="space-y-5">
      <MemberTable plan={plan} />
      <EmissionsCard plan={plan} />
      <CommunityCard community={plan.community} />
    </div>
  );
}
