/** Tests of with email and password accounts, showing the password and confirming the password. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from './App.js';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold, PASSWORD_CONFIG } from './test-utils/fixtures.js';
import { ASHA, PASSWORD, submitCredentials } from './App.accounts.fixtures.js';

/** A household that has already picked Delhi. */
const IN_DELHI = emptyHousehold({ place: DELHI });

it('with email and password accounts: creates an account, signs out, refuses a wrong password, and signs back in', async () => {
  const server = installFakeServer({ config: PASSWORD_CONFIG, household: IN_DELHI });
  const user = userEvent.setup();
  const { container } = render(<App />);
  await screen.findByRole('heading', { name: 'Sign in' });
  await expectNoViolations(container);
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 10 characters.');

  await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
  expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  await submitCredentials(user, ASHA, 'Create account');
  await screen.findByRole('heading', { name: 'Air in New Delhi' });
  expect(server.accounts.get('asha@example.test')).toBe(PASSWORD);

  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Sign in' });
  await submitCredentials(user, { ...ASHA, password: 'not the password' }, 'Sign in');
  expect(await screen.findByRole('alert')).toHaveTextContent('do not match an account');
  await submitCredentials(user, ASHA, 'Sign in');
  await screen.findByRole('heading', { name: 'Air in New Delhi' });
});

it('with email and password accounts: says when an email is taken, and switches back to signing in', async () => {
  const server = installFakeServer({ config: PASSWORD_CONFIG });
  server.accounts.set('asha@example.test', PASSWORD);
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'New here? Create an account' }));
  await submitCredentials(user, ASHA, 'Create account');
  expect(await screen.findByRole('alert')).toHaveTextContent('already has an account');
  await user.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
});

it('showing the password: shows and hides the password, and on sign-up the confirmation with it', async () => {
  installFakeServer({ config: PASSWORD_CONFIG });
  const user = userEvent.setup();
  const { container } = render(<App />);
  const toggle = await screen.findByRole('button', { name: 'Show password' });
  expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  await user.click(toggle);
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Hide password' })).toHaveTextContent('Hide');
  expect(screen.getByText('Your password is shown.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
  const confirm = screen.getByLabelText('Confirm password');
  expect(confirm).toHaveAttribute('type', 'text');
  expect(confirm).toHaveAttribute('autocomplete', 'new-password');
  await user.click(screen.getByRole('button', { name: 'Hide passwords' }));
  expect(confirm).toHaveAttribute('type', 'password');
  expect(screen.getByText('Your passwords are hidden.')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  await expectNoViolations(container);
});

it('confirming the password: refuses two passwords that differ without asking the server, and starts the box empty', async () => {
  const server = installFakeServer({ config: PASSWORD_CONFIG });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'New here? Create an account' }));
  const confirm = screen.getByLabelText('Confirm password');
  await user.type(screen.getByLabelText('Email'), 'asha@example.test');
  await user.type(screen.getByLabelText('Password'), PASSWORD);
  await user.type(confirm, `${PASSWORD}!`);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The two passwords do not match');
  expect(confirm).toHaveAttribute('aria-invalid', 'true');
  expect(server.requests.some((sent) => sent.path === '/api/auth/register')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
  await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
  expect(screen.getByLabelText('Confirm password')).toHaveValue('');
});
