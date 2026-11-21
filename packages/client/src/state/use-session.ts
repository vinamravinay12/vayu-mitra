import { useEffect, useReducer, type Dispatch } from 'react';
import { readSavedSession, writeSavedSession } from './saved-session.js';
import { sessionReducer, type SessionAction, type SessionState } from './session.js';

/** The session, restored from and saved to local storage, so a refresh never loses the plan. */
export function useSession(): readonly [SessionState, Dispatch<SessionAction>] {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    readSavedSession(globalThis.localStorage),
  );
  useEffect(() => {
    writeSavedSession(globalThis.localStorage, state);
  }, [state]);
  return [state, dispatch];
}
