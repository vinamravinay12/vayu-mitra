import type { MemoryChange } from '@vayu/core';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';
import { App } from './App.js';
import { installFakeServer, type FakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold } from './test-utils/fixtures.js';

/** What the understand call yields for "Dadi has asthma and walks at 6:30", and N95s at home. */
export const DADI_CHANGES: MemoryChange[] = [
  { op: 'remember-person', label: 'Dadi', ageGroup: 'senior', conditions: ['asthma'] },
  { op: 'remember-routine', activity: 'walk', person: 'Dadi', time: '06:30', minutes: null },
  { op: 'remember-home', feature: 'n95-masks' },
];

/** A user-event session, as the tests drive the app. */
export type User = ReturnType<typeof userEvent.setup>;

/** Renders the app and waits until the signed-in screen has loaded. */
export async function start(): Promise<void> {
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Starting Vayu Mitra');
  await screen.findByRole('heading', { name: /Where are you|Ask Vayu Mitra/ });
}

/** Searches for Delhi and picks it, as a family does on the first screen. */
export async function pickDelhi(user: User): Promise<void> {
  await user.type(screen.getByLabelText('Area or city'), 'Delhi');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await user.click(await screen.findByRole('button', { name: 'New Delhi, Delhi, India' }));
}

/** Waits for Delhi's air card and checks the index, its station and the twelve-hour strip. */
export async function expectDelhiAir(): Promise<void> {
  const air = await screen.findByRole('region', { name: 'Air in New Delhi' });
  await waitFor(() => {
    expect(air).toHaveTextContent('250Poor on India’s National Air Quality Index');
  });
  const source = /Measured at ITO, Delhi - CPCB, 2.1 km away \(CPCB, 10 am\)/;
  expect(within(air).getByText(source)).toBeInTheDocument();
  expect(within(air).getByRole('list', { name: 'Air index by hour' }).children).toHaveLength(12);
}

/** Types a message and sends it. */
export async function say(user: User, message: string): Promise<void> {
  await user.type(screen.getByLabelText('Your message'), message);
  await user.click(screen.getByRole('button', { name: 'Send' }));
}

/** A family in Delhi that has just told the app about Dadi; returns the fake and the session. */
export async function withDadi(): Promise<{
  server: FakeServer;
  user: User;
  container: HTMLElement;
}> {
  const server = installFakeServer({ household: emptyHousehold({ place: DELHI }) });
  server.understood = DADI_CHANGES;
  const user = userEvent.setup();
  const { container } = render(<App />);
  await screen.findByLabelText('Your message');
  await say(user, 'Dadi walks at 6:30');
  await screen.findByText('Dadi · older adult, asthma');
  return { server, user, container };
}
