import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.js';
import { EXAMPLE_DESCRIPTION } from './components/start/DescribeForm.js';
import { expectNoViolations } from './test-utils/axe.js';
import { HAPPY_ROUTES, storePlan, stubFetch } from './test-utils/fixtures.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('takes a family from a description to a plan, accessibly at every step', async () => {
    const fetchStub = stubFetch(HAPPY_ROUTES);
    vi.stubGlobal('fetch', fetchStub);
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'A clean-air plan for your family',
    );
    await expectNoViolations(container);

    await user.click(screen.getByRole('button', { name: 'Use an example' }));
    expect(screen.getByLabelText('Describe your household')).toHaveValue(EXAMPLE_DESCRIPTION);
    await user.click(screen.getByRole('button', { name: 'Build my clean-air plan' }));

    expect(
      await screen.findByRole('heading', { name: 'Check your household' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Forecast for New Delhi, Delhi, India.')).toBeInTheDocument();
    expect(screen.getAllByText('Guessed — please check')).toHaveLength(3);
    expect(fetchStub.calls.find((call) => call.path === '/api/places')).toBeDefined();
    await expectNoViolations(container);

    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    expect(await screen.findByRole('heading', { name: 'Today’s air' })).toBeInTheDocument();
    expect(screen.getByText(/actions chosen:/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Carbon monoxide risk from the heater' }),
    ).toBeInTheDocument();
    await expectNoViolations(container);
  });

  it('lets a family choose actions and see the impact change at once', async () => {
    storePlan([]);
    vi.stubGlobal('fetch', stubFetch(HAPPY_ROUTES));
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(await screen.findByText(/No actions chosen yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Actions/ }));
    const purifier = screen.getByRole('checkbox', { name: 'Run a HEPA purifier in the bedroom' });
    await user.click(purifier);
    expect(purifier).toBeChecked();
    expect(screen.getByText(/1 action chosen:/)).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: 'Build a box-fan filter for under ₹3,000' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Run a HEPA purifier in the bedroom' }),
    ).not.toBeChecked();
    await expectNoViolations(container);

    await user.click(screen.getByRole('tab', { name: 'Impact' }));
    const table = screen.getByRole('table', { name: /Daily PM2.5 dose per person/ });
    expect(within(table).getByRole('rowheader', { name: 'Dadaji' })).toBeInTheDocument();
    expect(screen.getByText(/Together with your 120 neighbouring homes/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Where today’s dose is breathed/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/% at home/).length).toBeGreaterThan(0);
    await expectNoViolations(container);
    expect(JSON.parse(globalThis.localStorage.getItem('vayu-session-v1') ?? '{}')).toMatchObject({
      chosenIds: ['diy-box-fan-filter'],
    });
  });

  it('explains the plan and answers questions through the AI coach', async () => {
    storePlan();
    const fetchStub = stubFetch(HAPPY_ROUTES);
    vi.stubGlobal('fetch', fetchStub);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(await screen.findByRole('tab', { name: 'AI coach' }));
    await user.click(screen.getByRole('radio', { name: 'हिन्दी' }));
    await user.click(screen.getByRole('button', { name: 'Explain my plan' }));
    expect(
      await screen.findByText('AQI 323 today: keep Dadaji indoors this morning'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Written by Gemini/)).toBeInTheDocument();
    expect(fetchStub.calls.find((call) => call.path === '/api/coach')?.body).toMatchObject({
      language: 'hi',
    });

    await user.click(screen.getByRole('button', { name: 'Is it safe to open the windows?' }));
    expect(
      await screen.findByText('Walk after 1 pm, when the air is cleanest.'),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Your question'));
    await user.type(screen.getByLabelText('Your question'), 'Can Dadaji go out at 4?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('You asked: Can Dadaji go out at 4?')).toBeInTheDocument();
    await expectNoViolations(container);
  });

  it('restores a saved plan on reload, edits it, and starts over', async () => {
    storePlan();
    vi.stubGlobal('fetch', stubFetch(HAPPY_ROUTES));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your clean-air plan' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit household' }));
    expect(screen.getByRole('heading', { name: 'Check your household' })).toBeInTheDocument();
    expect(screen.queryByText('Guessed — please check')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    expect(await screen.findByRole('heading', { name: 'Your clean-air plan' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByLabelText('Describe your household')).toBeInTheDocument();
    expect(globalThis.localStorage.getItem('vayu-session-v1')).toBeNull();
  });

  it('starts over from the logo and offers the form without AI', async () => {
    storePlan();
    vi.stubGlobal('fetch', stubFetch(HAPPY_ROUTES));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Your clean-air plan' });
    await user.click(screen.getByRole('link', { name: /Vayu Mitra/ }));
    await user.click(screen.getByRole('button', { name: 'Fill in the form yourself' }));
    expect(screen.getByRole('heading', { name: 'Check your household' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See today’s plan' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose where you live');
  });

  it('reports a forecast that will not load, and retries', async () => {
    storePlan();
    vi.stubGlobal(
      'fetch',
      stubFetch({
        '/api/air': {
          status: 502,
          body: { error: 'The air-quality service is not answering right now.' },
        },
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('not answering');
    vi.stubGlobal('fetch', stubFetch(HAPPY_ROUTES));
    await user.click(screen.getByRole('button', { name: 'Refresh forecast' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Today’s air' })).toBeInTheDocument();
    });
  });
});
