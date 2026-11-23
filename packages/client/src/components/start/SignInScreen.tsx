import { Alert } from '../ui/Alert.js';

/** The first screen when sign-in is on: what this is, and one button. */
export function SignInScreen({
  onSignIn,
  error,
}: {
  readonly onSignIn: () => void;
  readonly error: string | null;
}): React.JSX.Element {
  return (
    <section
      className="mx-auto max-w-xl space-y-5 py-8 text-center"
      aria-labelledby="signin-heading"
    >
      <h1 id="signin-heading" className="text-3xl font-bold">
        Plan your family’s day around the smog
      </h1>
      <p className="text-ink-soft">
        Vayu Mitra reads the nearest official air station, tells you when it is safest to walk, play
        or open the windows, and can alert you when the air turns bad. Sign in so it remembers your
        household.
      </p>
      <button type="button" className="btn-primary" onClick={onSignIn}>
        Sign in with Google
      </button>
      {error !== null && <Alert>{error}</Alert>}
    </section>
  );
}
