/** The app shell: start-up, sign-in, theme, and the signed-in screen loaded after first paint. */
import { lazy, Suspense, useState } from 'react';
import { signOut } from './api/config.js';
import { SignInScreen } from './components/start/SignInScreen.js';
import { Alert } from './components/ui/Alert.js';
import { Footer } from './components/ui/Footer.js';
import { Header } from './components/ui/Header.js';
import { SkipLink } from './components/ui/SkipLink.js';
import { useStartup, type StartupState } from './state/use-startup.js';
import { useTheme } from './state/use-theme.js';

/** The signed-in screen, with the engine and schemas it needs, loads after the first paint. */
const Home = lazy(() =>
  import('./components/Home.js').then((module) => ({ default: module.Home })),
);

/** The screen for where start-up is: loading, an error, sign-in, or the app. */
function Screen({ startup, setSignedIn }: StartupState): React.JSX.Element {
  // A new key after deleting data remounts Home, so it starts from a fresh record.
  const [generation, setGeneration] = useState(0);
  if (startup.status === 'loading') return <Alert kind="status">Starting Vayu Mitra…</Alert>;
  if (startup.status === 'error') return <Alert>{startup.message}</Alert>;
  if (!startup.signedIn) {
    return (
      <SignInScreen
        onSignedIn={(email) => {
          setSignedIn(email, true);
        }}
      />
    );
  }
  const onDeleted = (): void => {
    setGeneration((value) => value + 1);
    // With accounts, deleting signs out (the server has cleared the cookie).
    if (startup.config.auth === 'password') setSignedIn(null, false);
  };
  return (
    <Suspense fallback={<Alert kind="status">Loading your household…</Alert>}>
      <Home
        key={`${startup.email ?? 'local'}-${String(generation)}`}
        config={startup.config}
        onDeleted={onDeleted}
      />
    </Suspense>
  );
}

/** The whole app. */
export function App(): React.JSX.Element {
  const theme = useTheme();
  const state = useStartup();
  const { startup, setSignedIn } = state;
  const canSignOut =
    startup.status === 'ready' && startup.signedIn && startup.config.auth === 'password';
  const leave = (): void => {
    signOut().then(
      () => {
        setSignedIn(null, false);
      },
      () => undefined,
    );
  };
  return (
    <>
      <SkipLink />
      <Header
        theme={theme.preference}
        onThemeChange={theme.setPreference}
        onSignOut={canSignOut ? leave : null}
      />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none">
        <Screen startup={startup} setSignedIn={setSignedIn} />
      </main>
      <Footer />
    </>
  );
}
