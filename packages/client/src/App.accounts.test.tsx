import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold, PASSWORD_CONFIG } from './test-utils/fixtures.js';

const PASSWORD = 'correct horse battery';

/** Fills the account form and submits it. */
async function submitCredentials(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
  button: string,
): Promise<void> {
  await user.clear(screen.getByLabelText('Email'));
  await user.type(screen.getByLabelText('Email'), email);
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: button }));
}

describe('with email and password accounts', () => {
  it('creates an account, signs out, refuses a wrong password, and signs back in', async () => {
    const server = installFakeServer({
      config: PASSWORD_CONFIG,
      household: emptyHousehold({ place: DELHI }),
    });
    const user = userEvent.setup();
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Sign in' });
    await expectNoViolations(container);
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 10 characters.',
    );

    await user.click(screen.getByRole('button', { name: 'New here? Create an account' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    await submitCredentials(user, 'asha@example.test', PASSWORD, 'Create account');
    await screen.findByRole('heading', { name: 'Air in New Delhi' });
    expect(server.accounts.get('asha@example.test')).toBe(PASSWORD);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Sign in' });
    await submitCredentials(user, 'asha@example.test', 'not the password', 'Sign in');
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match an account');
    await submitCredentials(user, 'asha@example.test', PASSWORD, 'Sign in');
    await screen.findByRole('heading', { name: 'Air in New Delhi' });
  });

  it('says when an email is taken, and switches back to signing in', async () => {
    const server = installFakeServer({ config: PASSWORD_CONFIG });
    server.accounts.set('asha@example.test', PASSWORD);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'New here? Create an account' }));
    await submitCredentials(user, 'asha@example.test', PASSWORD, 'Create account');
    expect(await screen.findByRole('alert')).toHaveTextContent('already has an account');
    await user.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('offers alerts when the server has a push key, and deleting the account signs out', async () => {
    const server = installFakeServer({
      config: PASSWORD_CONFIG,
      email: 'asha@example.test',
      household: emptyHousehold({ place: DELHI }),
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Air in New Delhi' });
    expect(screen.getByRole('checkbox', { name: /Alert me/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('From'), 'severe');
    await waitFor(() => {
      expect(server.household.alerts.threshold).toBe('severe');
    });
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(server.email).toBeNull();
  });

  it('stays signed in when signing out fails', async () => {
    const server = installFakeServer({
      config: PASSWORD_CONFIG,
      email: 'asha@example.test',
      household: emptyHousehold({ place: DELHI }),
    });
    server.failures.set('POST /api/auth/logout', 'network');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('heading', { name: 'Air in New Delhi' })).toBeInTheDocument();
  });

  it('shows start-up failures', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/config', 'network');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach Vayu Mitra');
  });
});
