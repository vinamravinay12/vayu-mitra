/** The signed-in screen: the conversation beside the air, memory, alerts and privacy. */
import { nowHour, suggestQuestions, type ChatResponse } from '@vayu/core';
import { useCallback, useMemo } from 'react';
import { createApi, type Api, type Household } from '../api/api.js';
import type { ClientConfig } from '../api/config.js';
import { useAir, type AirState } from '../state/use-air.js';
import { useChat } from '../state/use-chat.js';
import { useHousehold, type HouseholdState } from '../state/use-household.js';
import { usePush } from '../state/use-push.js';
import { ChatPanel } from './chat/ChatPanel.js';
import { HouseholdPanels, PlaceColumn } from './SideColumn.js';
import { PlacePicker } from './start/PlacePicker.js';
import { Alert } from './ui/Alert.js';

interface HomeProps {
  readonly config: ClientConfig;
  /** After the family deletes their data. */
  readonly onDeleted: () => void;
}

/** The outlook's first local date, once the air has loaded. */
const firstDate = (air: AirState): string =>
  air.status === 'ready' ? nowHour(air.report).time.slice(0, 10) : '';

interface LoadedProps extends HomeProps {
  readonly api: Api;
  readonly state: HouseholdState;
  readonly household: Household;
}

/** A failed save, across both columns; nothing when all is well. */
function ErrorRow({ error }: { readonly error: string | null }): React.JSX.Element | null {
  return error === null ? null : (
    <div className="lg:col-span-2">
      <Alert>{error}</Alert>
    </div>
  );
}

/** The household's live parts: its air, the conversation, push alerts, and deleting it all. */
function useLoaded({ api, state, household, config, onDeleted }: LoadedProps) {
  const { replace } = state;
  const air = useAir(api, household.place);
  const onReply = useCallback(
    (reply: ChatResponse) => {
      replace({ ...household, memory: reply.memory });
    },
    [household, replace],
  );
  const chat = useChat(api, household.place, onReply);
  const push = usePush(config.vapidKey, api, replace);
  const remove = (): void => {
    api.deleteEverything().then(onDeleted, () => undefined);
  };
  return { air, chat, push, remove };
}

/** The app once the household has loaded: the conversation on the left, the rest beside it. */
function Loaded(props: LoadedProps): React.JSX.Element {
  const { api, state, household } = props;
  const { air, chat, push, remove } = useLoaded(props);
  const place = household.place;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <h1 className="sr-only">Vayu Mitra</h1>
      <ErrorRow error={state.error} />
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
        <HouseholdPanels state={state} household={household} push={push} onDelete={remove} />
      </div>
    </div>
  );
}

/** The signed-in app, once the family's record has loaded. */
export function Home(props: HomeProps): React.JSX.Element {
  const api = useMemo(() => createApi(), []);
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
