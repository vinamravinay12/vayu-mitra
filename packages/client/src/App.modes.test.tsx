import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.js';
import type { SignedInUser } from './auth/auth.js';
import { expectNoViolations } from './test-utils/axe.js';
import { installFakeServer } from './test-utils/fake-server.js';
import { DELHI, emptyHousehold, FIREBASE_CONFIG } from './test-utils/fixtures.js';

const firebase = vi.hoisted(() => {
  let listener: (user: SignedInUser | null) => void = () => undefined;
  return {
    setUser: (user: SignedInUser | null) => {
      listener(user);
    },
    auth: {
      onChange: (next: (user: SignedInUser | null) => void) => {
        listener = next;
        next(null);
        return () => undefined;
      },
      signIn: vi.fn(() => Promise.resolve()),
      signOut: vi.fn(() => Promise.resolve()),
      token: () => Promise.resolve('id-token'),
    },
  };
});

vi.mock('./auth/firebase-auth.js', () => ({
  loadFirebaseAuth: () => Promise.resolve({ app: { name: 'vayu' }, auth: firebase.auth }),
}));

describe('with Google sign-in', () => {
  it('asks to sign in, retries after a failure, then shows the signed-in app', async () => {
    const server = installFakeServer({
      config: FIREBASE_CONFIG,
      household: emptyHousehold({ place: DELHI }),
    });
    const user = userEvent.setup();
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Plan your family’s day around the smog' });
    await expectNoViolations(container);
    firebase.auth.signIn.mockRejectedValueOnce(new Error('popup closed'));
    await user.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in did not finish');
    await user.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    firebase.setUser({ uid: 'u1', name: 'Asha' });
    await screen.findByRole('heading', { name: 'Air in New Delhi' });
    expect(server.requests.find((request) => request.path === '/api/me')?.auth).toBe(
      'Bearer id-token',
    );
    await user.selectOptions(screen.getByLabelText('From'), 'severe');
    await waitFor(() => {
      expect(server.household.alerts.threshold).toBe('severe');
    });
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(firebase.auth.signOut).toHaveBeenCalled();
  });

  it('signs out after deleting the data', async () => {
    installFakeServer({ config: FIREBASE_CONFIG, household: emptyHousehold({ place: DELHI }) });
    firebase.auth.signOut.mockClear();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: 'Sign in with Google' });
    firebase.setUser({ uid: 'u2', name: null });
    await user.click(await screen.findByRole('button', { name: 'Delete my data' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    await waitFor(() => {
      expect(firebase.auth.signOut).toHaveBeenCalled();
    });
  });
});

describe('when something fails', () => {
  it('shows a start-up failure', async () => {
    const server = installFakeServer();
    server.failures.set('GET /api/config', 'network');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach Vayu Mitra');
  });

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

  it('shows failures of the air, a chat turn, a save and a delete', async () => {
    const server = installFakeServer({
      household: emptyHousehold({
        place: DELHI,
        memory: {
          people: [],
          routines: [],
          home: [{ kind: 'home', id: 'home:car', feature: 'car' }],
        },
      }),
    });
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
