import { Alert } from '../ui/Alert.js';
import { CredentialFields } from './CredentialFields.js';
import { useCredentials, type Mode } from './use-credentials.js';

const COPY: Readonly<Record<Mode, { heading: string; submit: string; switchTo: string }>> = {
  login: { heading: 'Sign in', submit: 'Sign in', switchTo: 'New here? Create an account' },
  register: {
    heading: 'Create your account',
    submit: 'Create account',
    switchTo: 'Already have an account? Sign in',
  },
};

/** Email and password, to sign in or to create an account. */
function CredentialsForm({
  onSignedIn,
}: {
  readonly onSignedIn: (email: string) => void;
}): React.JSX.Element {
  const form = useCredentials(onSignedIn);
  const copy = COPY[form.mode];
  return (
    <form
      className="card mx-auto max-w-sm space-y-4 text-left"
      onSubmit={form.submit}
      aria-labelledby="account-heading"
    >
      <h2 id="account-heading" className="text-xl font-bold">
        {copy.heading}
      </h2>
      <CredentialFields form={form} />
      {form.error !== null && <Alert>{form.error}</Alert>}
      <button type="submit" className="btn-primary w-full" disabled={form.pending}>
        {form.pending ? 'Please wait…' : copy.submit}
      </button>
      <button
        type="button"
        className="min-h-11 w-full text-sm font-medium text-brand underline"
        onClick={form.switchMode}
      >
        {copy.switchTo}
      </button>
    </form>
  );
}

/** The first screen when signed out: what this is, and the account form. */
export function SignInScreen({
  onSignedIn,
}: {
  readonly onSignedIn: (email: string) => void;
}): React.JSX.Element {
  return (
    <section
      className="mx-auto max-w-xl space-y-6 py-6 text-center"
      aria-labelledby="signin-heading"
    >
      <h1 id="signin-heading" className="text-3xl font-bold">
        Plan your family’s day around the smog
      </h1>
      <p className="text-ink-soft">
        Vayu Mitra reads the nearest official air station, tells you when it is safest to walk, play
        or open the windows, and can alert you when the air turns bad. An account keeps what it
        learns about your household.
      </p>
      <CredentialsForm onSignedIn={onSignedIn} />
    </section>
  );
}
