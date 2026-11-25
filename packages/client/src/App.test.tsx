/** Tests of a family’s first conversation. */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { App } from './App.js';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DADI_MEMORY, DELHI, emptyHousehold } from './test-utils/fixtures.js';
import { DADI_CHANGES, expectDelhiAir, pickDelhi, say, start } from './App.fixtures.js';

it('a family’s first conversation: picks a place, asks, gets advice, and builds memory', async () => {
  const server = installFakeServer();
  const user = userEvent.setup();
  const { container } = render(<App />);
  await screen.findByRole('heading', { name: 'Where are you?' });
  await expectNoViolations(container);
  await pickDelhi(user);
  expect(server.household.place).toEqual(DELHI);
  await expectDelhiAir();
  expect(screen.getByText(/Dadi has asthma and walks at 6:30/)).toBeInTheDocument();
  server.understood = DADI_CHANGES;
  await say(user, 'Dadi has asthma and walks at 6:30. Can she go?');
  const advice = await screen.findByRole('region', { name: /^Walk: / });
  expect(within(advice).getByText('Planned')).toBeInTheDocument();
  expect(within(advice).getByText('Dadi')).toBeInTheDocument();
  expect(within(advice).getByText(/Wear a well-fitted N95/)).toBeInTheDocument();
  expect(screen.getByText('Dadi · older adult, asthma')).toBeInTheDocument();
  expect(screen.getByText('Walk · 6:30 am · Dadi')).toBeInTheDocument();
  const chats = () => server.requests.filter((sent) => sent.path === '/api/chat');
  expect(chats()[0]?.body).toMatchObject({ place: DELHI, history: [] });
  await expectNoViolations(container);
  await user.click(screen.getByRole('button', { name: "Is Dadi's walk at 6:30 am OK today?" }));
  await waitFor(() => {
    expect(screen.getAllByText(/Vayu Mitra said:/)).toHaveLength(2);
  });
  expect(chats()[1]?.body).toMatchObject({ history: [{}, {}] });
});

it('a family’s first conversation: answers about the air when no activity is named, and shows a skip verdict', async () => {
  installFakeServer({ household: emptyHousehold({ place: DELHI, memory: DADI_MEMORY }) });
  const user = userEvent.setup();
  await start();
  expect(screen.getByLabelText('Your message')).toHaveAccessibleDescription(
    'Up to 500 characters.',
  );
  await user.type(screen.getByLabelText('Your message'), 'How is the air?');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText(/^Right now the air is Poor/)).toBeInTheDocument();
  await user.type(screen.getByLabelText('Your message'), 'Can Dadi go for a run at 9 pm?');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  const advice = await screen.findByRole('region', { name: /^Run: / });
  expect(advice).toHaveAccessibleName('Run: Skip it today');
  expect(within(advice).getByText(/^Instead: /)).toBeInTheDocument();
});
