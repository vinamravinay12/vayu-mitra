/** Who is signed in, as much as the app shows. */
export interface SignedInUser {
  readonly uid: string;
  readonly name: string | null;
}

/**
 * Sign-in, as the app needs it. One implementation talks to Firebase; the
 * other is the development stand-in, signed in as the one local household.
 */
export interface AuthClient {
  /** Calls back with the current user now and on every change; returns an unsubscribe. */
  onChange(listener: (user: SignedInUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  token(): Promise<string | null>;
}

/** Sign-in off: always the local household, no token. */
export const localAuth: AuthClient = {
  onChange(listener) {
    listener({ uid: 'local-household', name: null });
    return () => undefined;
  },
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  token: () => Promise.resolve(null),
};
