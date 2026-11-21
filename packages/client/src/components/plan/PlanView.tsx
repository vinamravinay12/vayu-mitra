import { buildPlan, type CleanAirPlan, type HouseholdProfile, type Language } from '@vayu/core';
import { useMemo, useState } from 'react';
import { useAir } from '../../state/use-air.js';
import { placeLabel } from '../profile/PlaceSearch.js';
import { Alert } from '../ui/Alert.js';
import { ActionsPanel } from './ActionsPanel.js';
import { CoachPanel } from './CoachPanel.js';
import { ImpactBar } from './ImpactBar.js';
import { ImpactPanel } from './ImpactPanel.js';
import { Tabs } from './Tabs.js';
import { TodayPanel } from './TodayPanel.js';

export interface PlanViewProps {
  readonly profile: HouseholdProfile;
  readonly chosenIds: readonly string[] | null;
  readonly language: Language;
  readonly onChoose: (chosenIds: readonly string[]) => void;
  readonly onLanguage: (language: Language) => void;
  readonly onEdit: () => void;
}

/** The four sections of a computed plan. */
function PlanTabs({
  plan,
  props,
}: {
  readonly plan: CleanAirPlan;
  readonly props: PlanViewProps;
}): React.JSX.Element {
  const [tab, setTab] = useState('today');
  const context = { profile: props.profile, chosenIds: plan.chosenIds, language: props.language };
  return (
    <Tabs
      label="Plan sections"
      active={tab}
      onSelect={setTab}
      tabs={[
        { id: 'today', label: 'Today', content: <TodayPanel plan={plan} /> },
        {
          id: 'actions',
          label: `Actions (${String(plan.actions.length)})`,
          content: <ActionsPanel plan={plan} onChoose={props.onChoose} />,
        },
        { id: 'impact', label: 'Impact', content: <ImpactPanel plan={plan} /> },
        {
          id: 'coach',
          label: 'AI coach',
          content: <CoachPanel context={context} onLanguage={props.onLanguage} />,
        },
      ]}
    />
  );
}

/**
 * The plan. The forecast is fetched once; everything else — AQI, routine,
 * ranked actions, every impact number — is computed here in the browser by
 * the same engine the server uses, so ticking an action updates it instantly.
 */
export default function PlanView(props: PlanViewProps): React.JSX.Element {
  const { profile, chosenIds, onEdit } = props;
  const { air, reload } = useAir(profile.place);
  const plan = useMemo(
    () =>
      air.status === 'ready'
        ? buildPlan({ profile, air: air.snapshot, now: air.loadedAt, chosenIds })
        : null,
    [air, profile, chosenIds],
  );
  const people = profile.members.length === 1 ? 'person' : 'people';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Your clean-air plan</h1>
          <p className="text-ink-soft">
            {placeLabel(profile.place)} · {profile.members.length} {people}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit household
          </button>
          <button type="button" className="btn-secondary" onClick={reload}>
            Refresh forecast
          </button>
        </div>
      </div>
      {air.status === 'loading' ? <Alert kind="status">Loading today’s forecast…</Alert> : null}
      {air.status === 'error' ? <Alert>{air.message}</Alert> : null}
      {plan === null ? null : (
        <>
          {plan.airSource === 'fixture' ? (
            <Alert kind="status">
              Demo mode: this forecast is a built-in sample, not live data.
            </Alert>
          ) : null}
          <ImpactBar plan={plan} />
          <PlanTabs plan={plan} props={props} />
        </>
      )}
    </div>
  );
}
