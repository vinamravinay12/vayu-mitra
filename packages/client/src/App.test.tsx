import type { MemoryChange } from '@vayu/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DADI_MEMORY, DELHI, emptyHousehold } from './test-utils/fixtures.js';

const DADI_CHANGES: MemoryChange[] = [
  { op: 'remember-person', label: 'Dadi', ageGroup: 'senior', conditions: ['asthma'] },
  { op: 'remember-routine', activity: 'walk', person: 'Dadi', time: '06:30', minutes: null },
  { op: 'remember-home', feature: 'n95-masks' },
];

/** Renders the app and waits until the signed-in screen has loaded. */
async function start(): Promise<void> {
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Starting Vayu Mitra');
  await screen.findByRole('heading', { name: /Where are you|Ask Vayu Mitra/ });
}

describe('a family’s first conversation', () => {
  it('picks a place, asks, gets advice, and builds memory', async () => {
    const server = installFakeServer();
    const user = userEvent.setup();
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Where are you?' });
    await expectNoViolations(container);

    await user.type(screen.getByLabelText('Area or city'), 'Delhi');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await user.click(await screen.findByRole('button', { name: 'New Delhi, Delhi, India' }));
    expect(server.household.place).toEqual(DELHI);

    const air = await screen.findByRole('region', { name: 'Air in New Delhi' });
    await waitFor(() => {
      expect(air).toHaveTextContent('250Poor on India’s National Air Quality Index');
    });
    expect(
      within(air).getByText(/Measured at ITO, Delhi - CPCB, 2.1 km away \(CPCB, 10 am\)/),
    ).toBeInTheDocument();
    expect(within(air).getByRole('list', { name: 'Air index by hour' }).children).toHaveLength(12);
    expect(screen.getByText(/Dadi has asthma and walks at 6:30/)).toBeInTheDocument();

    server.understood = DADI_CHANGES;
    await user.type(
      screen.getByLabelText('Your message'),
      'Dadi has asthma and walks at 6:30. Can she go?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const advice = await screen.findByRole('region', { name: /^Walk: / });
    expect(within(advice).getByText('Planned')).toBeInTheDocument();
    expect(within(advice).getByText('Dadi')).toBeInTheDocument();
    expect(within(advice).getByText(/Wear a well-fitted N95/)).toBeInTheDocument();
    expect(screen.getByText('Dadi · older adult, asthma')).toBeInTheDocument();
    expect(screen.getByText('Walk · 6:30 am · Dadi')).toBeInTheDocument();
    expect(server.requests.find((r) => r.path === '/api/chat')?.body).toMatchObject({
      place: DELHI,
      history: [],
    });
    await expectNoViolations(container);

    await user.click(screen.getByRole('button', { name: "Is Dadi's walk at 6:30 am OK today?" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Vayu Mitra said:/)).toHaveLength(2);
    });
    const second = server.requests.filter((r) => r.path === '/api/chat')[1]?.body as {
      history: unknown[];
    };
    expect(second.history).toHaveLength(2);
  });

  it('answers about the air when no activity is named, and shows a skip verdict', async () => {
    installFakeServer({ household: emptyHousehold({ place: DELHI, memory: DADI_MEMORY }) });
    const user = userEvent.setup();
    await start();
    await user.type(screen.getByLabelText('Your message'), 'How is the air?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/^Right now the air is Poor/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your message'), 'Can Dadi go for a run at 9 pm?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const advice = await screen.findByRole('region', { name: /^Run: / });
    expect(advice).toHaveAccessibleName('Run: Skip it today');
    expect(within(advice).getByText(/^Instead: /)).toBeInTheDocument();
  });
});

describe('memory chips', () => {
  it('edits a person and a routine, and forgets a fact', async () => {
    const server = installFakeServer({ household: emptyHousehold({ place: DELHI }) });
    server.understood = DADI_CHANGES;
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.type(await screen.findByLabelText('Your message'), 'Dadi walks at 6:30');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Dadi · older adult, asthma');

    await user.click(screen.getByRole('button', { name: 'Edit Dadi · older adult, asthma' }));
    await user.selectOptions(screen.getByLabelText('Dadi is a'), 'adult');
    await user.click(screen.getByRole('checkbox', { name: 'asthma' }));
    await user.click(screen.getByRole('checkbox', { name: 'diabetes' }));
    await expectNoViolations(container);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Dadi · adult, diabetes')).toBeInTheDocument();
    expect(server.household.memory.people[0]?.conditions).toEqual(['diabetes']);

    await user.click(screen.getByRole('button', { name: 'Edit Walk · 6:30 am · Dadi' }));
    // jsdom cannot type into time inputs; a change event is what a picker produces.
    fireEvent.change(screen.getByLabelText('Usual time'), { target: { value: '07:15' } });
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '45');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Walk · 7:15 am · Dadi')).toBeInTheDocument();
    expect(server.household.memory.routines[0]?.minutes).toBe(45);

    await user.click(screen.getByRole('button', { name: 'Edit Walk · 7:15 am · Dadi' }));
    fireEvent.change(screen.getByLabelText('Usual time'), { target: { value: '' } });
    await user.clear(screen.getByLabelText('Minutes'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Walk · Dadi')).toBeInTheDocument();
    // An emptied length keeps the one before.
    expect(server.household.memory.routines[0]?.minutes).toBe(45);

    await user.click(screen.getByRole('button', { name: 'Edit Walk · Dadi' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Usual time')).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Edit N95 masks at home' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Forget N95 masks at home' }));
    await waitFor(() => {
      expect(server.household.memory.home).toEqual([]);
    });
  });
});

describe('the family’s data', () => {
  it('can be deleted after a confirmation, which starts over', async () => {
    const server = installFakeServer({ household: emptyHousehold({ place: DELHI }) });
    const user = userEvent.setup();
    await start();
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Keep my data' }));
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    expect(await screen.findByRole('heading', { name: 'Where are you?' })).toBeInTheDocument();
    expect(server.household.place).toBeNull();
  });

  it('says plainly that alerts are not set up without push', async () => {
    installFakeServer({ household: emptyHousehold({ place: DELHI }) });
    await start();
    expect(
      screen.getByText('Background alerts are not set up on this server.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
