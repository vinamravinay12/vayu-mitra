import { nowHour, suggestQuestions, type ChatResponse, type Place } from '@vayu/core';
import type { FirebaseApp } from 'firebase/app';
import { useCallback, useMemo } from 'react';
import { createApi, type Api, type ClientConfig, type Household } from '../api/api.js';
import type { AuthClient } from '../auth/auth.js';
import { useAir, type AirState } from '../state/use-air.js';
import { useChat } from '../state/use-chat.js';
import { useHousehold, type HouseholdState } from '../state/use-household.js';
import { usePush } from '../state/use-push.js';
import { AirCard } from './air/AirCard.js';
import { ChatPanel } from './chat/ChatPanel.js';
import { MemoryPanel } from './memory/MemoryPanel.js';
import { AlertSettings } from './settings/AlertSettings.js';
import { PrivacyPanel } from './settings/PrivacyPanel.js';
import { PlacePicker } from './start/PlacePicker.js';
import { Alert } from './ui/Alert.js';

interface HomeProps {
  readonly config: ClientConfig;
  readonly auth: AuthClient;
  readonly app: FirebaseApp | null;
  /** After the family deletes their data. */
  readonly onDeleted: () => void;
}

/** The outlook's first local date, once the air has loaded. */
const firstDate = (air: AirState): string =>
  air.status === 'ready' ? nowHour(air.report).time.slice(0, 10) : '';

interface PlaceColumnProps {
  readonly api: Api;
  readonly air: AirState;
  readonly place: Place;
  readonly onPick: (place: Place) => void;
}

/** The air for the chosen place, and a way to change it. */
function PlaceColumn({ api, air, place, onPick }: PlaceColumnProps): React.JSX.Element {
  return (
    <>
      <AirCard air={air} place={place} />
      <details className="card">
        <summary className="cursor-pointer font-semibold">Change place</summary>
        <div className="mt-3">
          <PlacePicker api={api} onPick={onPick} embedded />
        </div>
      </details>
    </>
  );
}

interface LoadedProps extends Omit<HomeProps, 'auth'> {
  readonly api: Api;
  readonly state: HouseholdState;
  readonly household: Household;
}

/** The app once the household has loaded: the air, the conversation, what is remembered. */
function Loaded({ api, state, household, config, app, onDeleted }: LoadedProps): React.JSX.Element {
  const { replace } = state;
  const place = household.place;
  const air = useAir(api, place);
  const onReply = useCallback(
    (reply: ChatResponse) => {
      replace({ ...household, memory: reply.memory });
    },
    [household, replace],
  );
  const chat = useChat(api, place, onReply);
  const push = usePush(app, config.vapidKey, api, replace);
  const remove = (): void => {
    api.deleteEverything().then(onDeleted, () => undefined);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <h1 className="sr-only">Vayu Mitra</h1>
      {state.error !== null && (
        <div className="lg:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <div className="space-y-5">
        {place === null ? (
          <PlacePicker api={api} onPick={state.setPlace} />
        ) : (
          <ChatPanel
            chat={chat}
            today={firstDate(air)}
            suggestions={suggestQuestions(household.memory)}
          />
        )}
      </div>
      <div className="space-y-5">
        {place !== null && (
          <PlaceColumn api={api} air={air} place={place} onPick={state.setPlace} />
        )}
        <MemoryPanel memory={household.memory} onChange={state.setMemory} />
        <AlertSettings settings={household.alerts} push={push} onChange={state.setAlerts} />
        <PrivacyPanel onDelete={remove} />
      </div>
    </div>
  );
}

/** The signed-in app, once the family's record has loaded. */
export function Home({ auth, ...props }: HomeProps): React.JSX.Element {
  const api = useMemo(() => createApi(() => auth.token()), [auth]);
  const state = useHousehold(api);
  if (state.household === null) {
    return state.error === null ? (
      <Alert kind="status">Loading your household…</Alert>
    ) : (
      <Alert>{state.error}</Alert>
    );
  }
  return <Loaded {...props} api={api} state={state} household={state.household} />;
}
