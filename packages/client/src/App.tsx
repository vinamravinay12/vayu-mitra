import { lazy, Suspense, type Dispatch } from 'react';
import { ProfileForm } from './components/profile/ProfileForm.js';
import { StartScreen } from './components/start/StartScreen.js';
import { Alert } from './components/ui/Alert.js';
import { Footer } from './components/ui/Footer.js';
import { Header } from './components/ui/Header.js';
import { SkipLink } from './components/ui/SkipLink.js';
import type { SessionAction, SessionState } from './state/session.js';
import { usePageFocus } from './state/use-page-focus.js';
import { useSession } from './state/use-session.js';
import { useTheme } from './state/use-theme.js';

/** The plan view and the engine it runs are loaded only once a family reaches it. */
const PlanView = lazy(() => import('./components/plan/PlanView.js'));

interface StageProps {
  readonly session: SessionState;
  readonly dispatch: Dispatch<SessionAction>;
}

/** The screen for the current stage of the session. */
function CurrentStage({ session, dispatch }: StageProps): React.JSX.Element | null {
  if (session.stage === 'review' && session.editing !== null) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Check your household</h1>
          <p className="text-ink-soft">
            Anything marked “Guessed” was not in your description — correct it if it is wrong.
          </p>
        </div>
        <ProfileForm
          initial={session.editing}
          onConfirm={(profile) => {
            dispatch({ type: 'confirm', profile });
          }}
        />
      </div>
    );
  }
  if (session.stage === 'plan' && session.profile !== null) {
    return (
      <Suspense fallback={<Alert kind="status">Preparing your plan…</Alert>}>
        <PlanView
          profile={session.profile}
          chosenIds={session.chosenIds}
          language={session.language}
          onChoose={(chosenIds) => {
            dispatch({ type: 'choose', chosenIds });
          }}
          onLanguage={(language) => {
            dispatch({ type: 'language', language });
          }}
          onEdit={() => {
            dispatch({ type: 'edit' });
          }}
        />
      </Suspense>
    );
  }
  return (
    <StartScreen
      onExtracted={(extracted) => {
        dispatch({ type: 'extracted', extracted });
      }}
      onFillManually={() => {
        dispatch({ type: 'fill-manually' });
      }}
    />
  );
}

/** The whole app: three stages, one session saved across reloads. */
export function App(): React.JSX.Element {
  const [session, dispatch] = useSession();
  const theme = useTheme();
  const main = usePageFocus(session.stage);
  return (
    <>
      <SkipLink />
      <Header
        theme={theme.preference}
        onThemeChange={theme.setPreference}
        onStartOver={() => {
          dispatch({ type: 'start-over' });
        }}
      />
      <main id="main" ref={main} tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 outline-none">
        <CurrentStage session={session} dispatch={dispatch} />
      </main>
      <Footer />
    </>
  );
}
