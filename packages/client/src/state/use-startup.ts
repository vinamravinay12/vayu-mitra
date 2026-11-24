/** Start-up: the client config and who is signed in, before the first screen. */
import { useCallback, useEffect, useState } from 'react';
import { fetchConfig, fetchSession, type ClientConfig } from '../api/config.js';

/** Where start-up has got to. */
type Startup =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly config: ClientConfig;
      /** The signed-in email; null when signed out. With sign-in off, always signed in. */
      readonly signedIn: boolean;
      readonly email: string | null;
    };

/** Start-up state, and a way to record signing in or out. */
export interface StartupState {
  readonly startup: Startup;
  readonly setSignedIn: (email: string | null, signedIn: boolean) => void;
}

/** Loads the config and who is signed in, in parallel. */
export function useStartup(): StartupState {
  const [startup, setStartup] = useState<Startup>({ status: 'loading' });
  useEffect(() => {
    let current = true;
    Promise.all([fetchConfig(), fetchSession()]).then(
      ([config, session]) => {
        if (current)
          setStartup({ status: 'ready', config, signedIn: session.signedIn, email: session.email });
      },
      (cause: unknown) => {
        if (current) setStartup({ status: 'error', message: messageOf(cause) });
      },
    );
    return () => {
      current = false;
    };
  }, []);
  const setSignedIn = useCallback((email: string | null, signedIn: boolean) => {
    setStartup((state) => (state.status === 'ready' ? { ...state, email, signedIn } : state));
  }, []);
  return { startup, setSignedIn };
}

/** A failure as people should read it. */
export const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.name === 'ApiError'
    ? cause.message
    : 'Something went wrong. Please try again.';
