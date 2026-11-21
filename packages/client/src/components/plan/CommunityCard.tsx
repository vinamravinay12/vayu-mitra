import { formatAmount, type CommunityImpact } from '@vayu/core';

/** What the family's society or colony could achieve together. */
export function CommunityCard({
  community,
}: {
  readonly community: CommunityImpact;
}): React.JSX.Element {
  return (
    <section className="card space-y-3" aria-labelledby="community-heading">
      <h2 id="community-heading" className="text-lg font-semibold">
        Together with your {community.households} neighbouring homes
      </h2>
      {community.households > 1 ? (
        <p className="text-sm">
          If every home made your choices, your community would keep{' '}
          <strong>{formatAmount(community.sameChoicesPm25KgSeason)} kg of PM2.5</strong> out of its
          air this season.
        </p>
      ) : (
        <p className="text-sm">
          Add the number of homes in your society on your profile to see what you could do together.
        </p>
      )}
      <ul className="space-y-3">
        {community.actions.map(({ action, participatingHouseholds, pm25KgSeasonSaved }) => (
          <li key={action.id} className="border-t border-line pt-3">
            <p className="font-semibold">{action.title}</p>
            <p className="text-sm text-ink-soft">{action.why}</p>
            {pm25KgSeasonSaved > 0 ? (
              <p className="text-sm">
                With a typical {participatingHouseholds}{' '}
                {participatingHouseholds === 1 ? 'home' : 'homes'} taking part:{' '}
                <strong>{formatAmount(pm25KgSeasonSaved)} kg</strong> less PM2.5 this season.
              </p>
            ) : null}
            <ol className="mt-1 list-decimal pl-5 text-sm text-ink-soft">
              {action.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}
