/** The account form’s inputs: email, password with Show/Hide, and the confirmation on sign-up. */
import { MISMATCH, type CredentialsState } from './use-credentials.js';

/** The email input. */
function EmailField({ form }: { readonly form: CredentialsState }): React.JSX.Element {
  return (
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
  );
}

/** What a password input shares with its confirmation: type, limits and autocomplete. */
const passwordProps = (form: CredentialsState) =>
  ({
    type: form.visible ? 'text' : 'password',
    className: 'field',
    autoComplete: form.mode === 'login' ? 'current-password' : 'new-password',
    autoCapitalize: 'none',
    spellCheck: false,
    required: true,
    minLength: 10,
    maxLength: 128,
  }) as const;

/** "password" alone, or "passwords" when the confirmation box is showing too. */
const noun = (form: CredentialsState): string =>
  form.mode === 'register' ? 'passwords' : 'password';

/**
 * Show/Hide beside the password. Its name follows its visible word ("Show
 * password", "Hide password") and a status line says which, so screen-reader
 * users hear the change; it reveals both boxes at once.
 */
function VisibilityToggle({ form }: { readonly form: CredentialsState }): React.JSX.Element {
  const word = form.visible ? 'Hide' : 'Show';
  const state = `${form.mode === 'register' ? 'passwords are' : 'password is'} ${form.visible ? 'shown' : 'hidden'}`;
  return (
    <>
      <button
        type="button"
        className="btn-secondary shrink-0 px-3 text-sm"
        aria-label={`${word} ${noun(form)}`}
        aria-controls={form.mode === 'register' ? 'password confirm-password' : 'password'}
        onClick={form.toggleVisible}
      >
        {word}
      </button>
      <p className="sr-only" role="status">{`Your ${state}.`}</p>
    </>
  );
}

/** The password, its Show/Hide button, and the length rule. */
function PasswordField({ form }: { readonly form: CredentialsState }): React.JSX.Element {
  return (
    <div>
      <label className="label" htmlFor="password">
        Password
      </label>
      <div className="flex gap-2">
        <input
          id="password"
          {...passwordProps(form)}
          aria-describedby="password-hint"
          value={form.password}
          onChange={(event) => {
            form.setPassword(event.target.value);
          }}
        />
        <VisibilityToggle form={form} />
      </div>
      <p id="password-hint" className="mt-1 text-sm text-muted">
        At least 10 characters.
      </p>
    </div>
  );
}

/** The id of the form's error message, which an invalid field points at. */
export const ACCOUNT_ERROR_ID = 'account-error';

/** On sign-up, the password again; marked invalid, and pointed at the reason, when the two differ. */
function ConfirmField({ form }: { readonly form: CredentialsState }): React.JSX.Element {
  return (
    <div>
      <label className="label" htmlFor="confirm-password">
        Confirm password
      </label>
      <input
        id="confirm-password"
        {...passwordProps(form)}
        aria-invalid={form.error === MISMATCH}
        aria-describedby={form.error === MISMATCH ? ACCOUNT_ERROR_ID : undefined}
        value={form.confirm}
        onChange={(event) => {
          form.setConfirm(event.target.value);
        }}
      />
    </div>
  );
}

/** The email and password inputs of the account form. */
export function CredentialFields({ form }: { readonly form: CredentialsState }): React.JSX.Element {
  return (
    <>
      <EmailField form={form} />
      <PasswordField form={form} />
      {form.mode === 'register' && <ConfirmField form={form} />}
    </>
  );
}
