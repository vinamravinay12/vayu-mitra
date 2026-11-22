import { lazy, Suspense, useState } from 'react';
import { SignInScreen } from './components/start/SignInScreen.js';
import { Alert } from './components/ui/Alert.js';
import { Footer } from './components/ui/Footer.js';
import { Header } from './components/ui/Header.js';
import { SkipLink } from './components/ui/SkipLink.js';
import { useStartup, type Startup } from './state/use-startup.js';
import { useTheme } from './state/use-theme.js';

/** The signed-in screen, with the engine and schemas it needs, loads after the first paint. */
const Home = lazy(() =>
  import('./components/Home.js').then((module) => ({ default: module.Home })),
);

/** The screen for where start-up is: loading, an error, sign-in, or the app. */
function Screen({ startup }: { readonly startup: Startup }): React.JSX.Element {
  const [signInError, setSignInError] = useState<string | null>(null);
  // A new key after deleting data remounts Home, so it starts from a fresh record.
  const [generation, setGeneration] = useState(0);
  if (startup.status === 'loading') return <Alert kind="status">Starting Vayu Mitra…</Alert>;
  if (startup.status === 'error') return <Alert>{startup.message}</Alert>;
  const { auth } = startup;
  if (startup.user === null) {
    const signIn = (): void => {
      setSignInError(null);
      auth.signIn().catch(() => {
        setSignInError('Sign-in did not finish. Please try again.');
      });
    };
    return <SignInScreen onSignIn={signIn} error={signInError} />;
  }
  const onDeleted = (): void => {
    setGeneration((value) => value + 1);
    void auth.signOut();
  };
  return (
    <Suspense fallback={<Alert kind="status">Loading your household…</Alert>}>
      <Home
        key={`${startup.user.uid}-${String(generation)}`}
        config={startup.config}
        auth={auth}
        app={startup.app}
        onDeleted={onDeleted}
      />
    </Suspense>
  );
}

/** The whole app. */
export function App(): React.JSX.Element {
  const theme = useTheme();
  const startup = useStartup();
  const signedIn =
    startup.status === 'ready' && startup.user !== null && startup.config.auth === 'firebase';
  return (
    <>
      <SkipLink />
      <Header
        theme={theme.preference}
        onThemeChange={theme.setPreference}
        onSignOut={
          signedIn
            ? () => {
                void startup.auth.signOut();
              }
            : null
        }
      />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none">
        <Screen startup={startup} />
      </main>
      <Footer />
    </>
  );
}
