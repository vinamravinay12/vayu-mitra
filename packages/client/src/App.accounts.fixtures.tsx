/** Account-test helpers: the test account and filling the account form. */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** The password every account test uses. */
export const PASSWORD = 'correct horse battery';

/** The account the tests create and sign in to. */
export const ASHA = { email: 'asha@example.test', password: PASSWORD };

/** Fills the account form (the confirmation too, when creating an account) and submits it. */
export async function submitCredentials(
  user: ReturnType<typeof userEvent.setup>,
  { email, password }: { readonly email: string; readonly password: string },
  button: string,
): Promise<void> {
  await user.clear(screen.getByLabelText('Email'));
  await user.type(screen.getByLabelText('Email'), email);
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), password);
  const confirm = screen.queryByLabelText('Confirm password');
  if (confirm !== null) {
    await user.clear(confirm);
    await user.type(confirm, password);
  }
  await user.click(screen.getByRole('button', { name: button }));
}
