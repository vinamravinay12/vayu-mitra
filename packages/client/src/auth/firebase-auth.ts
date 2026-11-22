import type { FirebaseApp } from 'firebase/app';
import type { FirebaseWebConfig } from '../api/config.js';
import type { AuthClient } from './auth.js';

/** The Firebase app and its auth client, created once the config says sign-in is on. */
export interface FirebaseSession {
  readonly app: FirebaseApp;
  readonly auth: AuthClient;
}

/**
 * Loads Firebase only when the server has it configured, so a local run ships
 * none of it, and the first paint never waits for it. Sign-in uses Google's
 * popup; the server verifies every ID token, so nothing here is trusted.
 */
export async function loadFirebaseAuth(web: FirebaseWebConfig): Promise<FirebaseSession> {
  const [{ initializeApp }, firebaseAuth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = initializeApp(web);
  const auth = firebaseAuth.getAuth(app);
  return {
    app,
    auth: {
      onChange: (listener) =>
        firebaseAuth.onAuthStateChanged(auth, (user) => {
          listener(user === null ? null : { uid: user.uid, name: user.displayName });
        }),
      async signIn() {
        await firebaseAuth.signInWithPopup(auth, new firebaseAuth.GoogleAuthProvider());
      },
      signOut: () => firebaseAuth.signOut(auth),
      token: async () => (auth.currentUser === null ? null : auth.currentUser.getIdToken()),
    },
  };
}
