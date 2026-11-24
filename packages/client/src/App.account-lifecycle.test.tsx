/** Tests of with email and password accounts. */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from './App.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold, PASSWORD_CONFIG } from './test-utils/fixtures.js';

it('with email and password accounts: offers alerts when the server has a push key, and deleting the account signs out', async () => {
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

it('with email and password accounts: stays signed in when signing out fails', async () => {
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

it('with email and password accounts: shows start-up failures', async () => {
  const server = installFakeServer();
  server.failures.set('GET /api/config', 'network');
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach Vayu Mitra');
});
