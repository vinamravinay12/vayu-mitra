import type { Api, Household } from '../api/api.js';
import type { AirState } from '../state/use-air.js';
import type { HouseholdState } from '../state/use-household.js';
import type { PushControls } from '../state/use-push.js';
import type { Place } from '@vayu/core';
import { AirCard } from './air/AirCard.js';
import { MemoryPanel } from './memory/MemoryPanel.js';
import { AlertSettings } from './settings/AlertSettings.js';
import { PrivacyPanel } from './settings/PrivacyPanel.js';
import { PlacePicker } from './start/PlacePicker.js';

interface PlaceColumnProps {
  readonly api: Api;
  readonly air: AirState;
  readonly place: Place;
  readonly onPick: (place: Place) => void;
}

/** The air for the chosen place, and a way to change it. */
export function PlaceColumn({ api, air, place, onPick }: PlaceColumnProps): React.JSX.Element {
  return (
    <>
      <AirCard air={air} place={place} />
      <details className="card">
        <summary className="cursor-pointer py-2.5 font-semibold">Change place</summary>
        <div className="mt-3">
          <PlacePicker api={api} onPick={onPick} embedded />
        </div>
      </details>
    </>
  );
}

/** What is remembered, the alert settings and the privacy controls. */
export function HouseholdPanels({
  state,
  household,
  push,
  onDelete,
}: {
  readonly state: HouseholdState;
  readonly household: Household;
  readonly push: PushControls;
  readonly onDelete: () => void;
}): React.JSX.Element {
  return (
    <>
      <MemoryPanel memory={household.memory} onChange={state.setMemory} />
      <AlertSettings settings={household.alerts} push={push} onChange={state.setAlerts} />
      <PrivacyPanel onDelete={onDelete} />
    </>
  );
}
