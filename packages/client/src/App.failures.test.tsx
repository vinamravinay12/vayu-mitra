/** Tests of when something fails. */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold } from './test-utils/fixtures.js';

describe('when something fails', () => {
  it('shows a generic message for a malformed answer', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('not json', { status: 200 })));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });
  it('shows when the household cannot load', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/me', 500);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed with 500.');
  });
});

/** A household in Delhi that has said only that it has a car. */
const WITH_A_CAR = emptyHousehold({
  place: DELHI,
  memory: { people: [], routines: [], home: [{ kind: 'home', id: 'home:car', feature: 'car' }] },
});

describe('when something fails', () => {
  it('shows failures of the air, a chat turn, a save and a delete', async () => {
    const server = installFakeServer({ household: WITH_A_CAR });
    server.failures.set('GET /api/air', 502);
    server.failures.set('POST /api/chat', 502);
    server.failures.set('PUT /api/me/memory', 400);
    server.failures.set('DELETE /api/me', 500);
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText('Failed with 502.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your message'), 'walk?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(screen.getAllByText('Failed with 502.')).toHaveLength(2);
    });
    await user.click(screen.getByRole('button', { name: 'Forget Has a car' }));
    expect(await screen.findByText('Failed with 400.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    expect(screen.getByRole('heading', { name: 'Your data' })).toBeInTheDocument();
  });
});
