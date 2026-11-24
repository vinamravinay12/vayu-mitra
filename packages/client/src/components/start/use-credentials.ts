import { useState } from 'react';
import { signIn } from '../../api/config.js';
import { messageOf } from '../../state/use-startup.js';

export type Mode = 'login' | 'register';

/** Said when the two passwords typed to create an account differ. */
export const MISMATCH = 'The two passwords do not match. Type the same password in both boxes.';

/**
 * The account form's state and submit, so the form itself stays layout.
 * Creating an account asks for the password twice and stops here, without a
 * request, when the two differ; signing in asks once.
 */
export function useCredentials(onSignedIn: (email: string) => void) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = (event: React.SubmitEvent): void => {
    event.preventDefault();
    if (mode === 'register' && confirm !== password) {
      setError(MISMATCH);
      return;
    }
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
    setConfirm('');
    setError(null);
  };
  const toggleVisible = (): void => {
    setVisible(!visible);
  };
  return {
    ...{ mode, email, setEmail, password, setPassword, confirm, setConfirm },
    ...{ visible, toggleVisible, pending, error, submit, switchMode },
  };
}

export type CredentialsState = ReturnType<typeof useCredentials>;
