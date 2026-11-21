import { formatAmount, type CleanAirPlan } from '@vayu/core';

/**
 * The running total of the family's choices, always visible above the tabs.
 * It is a live region, so a screen reader hears the new total after each tick.
 */
export function ImpactBar({ plan }: { readonly plan: CleanAirPlan }): React.JSX.Element {
  const { impact } = plan.chosen;
  const count = plan.chosenIds.length;
  return (
    <section aria-labelledby="impact-bar-heading" className="card bg-brand-soft">
      <h2 id="impact-bar-heading" className="sr-only">
        Impact of your choices
      </h2>
      <p aria-live="polite" className="text-sm sm:text-base">
        {count === 0 ? (
          'No actions chosen yet. Tick a few in the Actions tab to see what they change.'
        ) : (
          <>
            <strong>
              {count} {count === 1 ? 'action' : 'actions'} chosen:
            </strong>{' '}
            your family’s smog dose falls{' '}
            <strong>{formatAmount(impact.weightedReductionPercent)}%</strong>
            {impact.pm25GramsWeeklySaved > 0 ? (
              <>
                {' '}
                and you keep{' '}
                <strong>{formatAmount(impact.pm25GramsWeeklySaved)} g of PM2.5 a week</strong> out
                of your neighbourhood’s air
              </>
            ) : null}
            .
          </>
        )}
      </p>
    </section>
  );
}
