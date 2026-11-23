import { useEffect, useState } from 'react';
import { fetchConfig, type ClientConfig } from '../api/config.js';
import { localAuth, type AuthClient, type SignedInUser } from '../auth/auth.js';
import type { FirebaseApp } from 'firebase/app';

/** Where start-up has got to. */
export type Startup =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly config: ClientConfig;
      readonly auth: AuthClient;
      /** The Firebase app, for push; null when sign-in is off. */
      readonly app: FirebaseApp | null;
      readonly user: SignedInUser | null;
    };

/**
 * Loads the config, then the matching sign-in client, then follows the signed-in
 * user. Firebase is imported only when the server has it configured.
 */
export function useStartup(): Startup {
  const [state, setState] = useState<Startup>({ status: 'loading' });
  useEffect(() => {
    let unsubscribe = (): void => undefined;
    let cancelled = false;
    const start = async (): Promise<void> => {
      const config = await fetchConfig();
      const session = await sessionFor(config);
      if (cancelled) return;
      unsubscribe = session.auth.onChange((user) => {
        setState({ status: 'ready', config, auth: session.auth, app: session.app, user });
      });
    };
    start().catch((cause: unknown) => {
      setState({ status: 'error', message: messageOf(cause) });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  return state;
}

/** The sign-in client the config calls for; Firebase is imported only when it is on. */
async function sessionFor(
  config: ClientConfig,
): Promise<{ readonly app: FirebaseApp | null; readonly auth: AuthClient }> {
  const { firebase } = config;
  if (firebase === null) {
    return { app: null, auth: localAuth };
  }
  const { loadFirebaseAuth } = await import('../auth/firebase-auth.js');
  return loadFirebaseAuth(firebase);
}

/** A failure as people should read it. */
export const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.name === 'ApiError'
    ? cause.message
    : 'Something went wrong. Please try again.';
