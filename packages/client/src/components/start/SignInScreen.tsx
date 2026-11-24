import { useState } from 'react';
import { signIn } from '../../api/config.js';
import { messageOf } from '../../state/use-startup.js';
import { Alert } from '../ui/Alert.js';

type Mode = 'login' | 'register';

const COPY: Readonly<Record<Mode, { heading: string; submit: string; switchTo: string }>> = {
  login: { heading: 'Sign in', submit: 'Sign in', switchTo: 'New here? Create an account' },
  register: {
    heading: 'Create your account',
    submit: 'Create account',
    switchTo: 'Already have an account? Sign in',
  },
};

/** The form's state and submit, so the form itself stays layout. */
function useCredentials(onSignedIn: (email: string) => void) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = (event: React.SubmitEvent): void => {
    event.preventDefault();
    setPending(true);
    setError(null);
    signIn(mode, email, password).then(
      (session) => {
        onSignedIn(session.email);
      },
      (cause: unknown) => {
        setPending(false);
        setError(messageOf(cause));
      },
    );
  };
  const switchMode = (): void => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };
  return { mode, email, setEmail, password, setPassword, pending, error, submit, switchMode };
}

/** The email and password inputs. */
function Fields({ form }: { readonly form: ReturnType<typeof useCredentials> }): React.JSX.Element {
  return (
    <>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          autoComplete="email"
          required
          maxLength={254}
          value={form.email}
          onChange={(event) => {
            form.setEmail(event.target.value);
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="field"
          autoComplete={form.mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={10}
          maxLength={128}
          aria-describedby="password-hint"
          value={form.password}
          onChange={(event) => {
            form.setPassword(event.target.value);
          }}
        />
        <p id="password-hint" className="mt-1 text-sm text-muted">
          At least 10 characters.
        </p>
      </div>
    </>
  );
}

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
      <Fields form={form} />
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
