/** The account form’s state: what was typed, the mode, the request and its error. */
import { useState } from 'react';
import { signIn } from '../../api/config.js';
import { messageOf } from '../../state/use-startup.js';

/** Whether the account form signs in or creates an account. */
export type Mode = 'login' | 'register';

/** Said when the two passwords typed to create an account differ. */
export const MISMATCH = 'The two passwords do not match. Type the same password in both boxes.';

/** What has been typed, and whether the passwords are shown. */
function useTyped() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const toggleVisible = (): void => {
    setVisible(!visible);
  };
  return { email, setEmail, password, setPassword, confirm, setConfirm, visible, toggleVisible };
}

/** The sign-in request: whether it is under way, and the error to show. */
function useRequest(onSignedIn: (email: string) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = (mode: Mode, email: string, password: string): void => {
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
  return { pending, error, setError, send };
}

/**
 * The account form's state and submit, so the form itself stays layout.
 * Creating an account asks for the password twice and stops here, without a
 * request, when the two differ; signing in asks once.
 */
export function useCredentials(onSignedIn: (email: string) => void) {
  const [mode, setMode] = useState<Mode>('login');
  const typed = useTyped();
  const { send, setError, ...request } = useRequest(onSignedIn);
  const submit = (event: React.SubmitEvent): void => {
    event.preventDefault();
    if (mode === 'register' && typed.confirm !== typed.password) setError(MISMATCH);
    else send(mode, typed.email, typed.password);
  };
  const switchMode = (): void => {
    setMode(mode === 'login' ? 'register' : 'login');
    typed.setConfirm('');
    setError(null);
  };
  return { mode, ...typed, ...request, submit, switchMode };
}

/** Everything the account form shows and does. */
export type CredentialsState = ReturnType<typeof useCredentials>;
