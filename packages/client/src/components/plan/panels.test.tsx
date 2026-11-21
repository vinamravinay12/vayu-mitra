import type { HouseholdProfile } from '@vayu/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoViolations } from '../../test-utils/axe.js';
import {
  airSnapshot,
  COACH,
  COMMUTER,
  HAPPY_ROUTES,
  PROFILE,
  stubFetch,
} from '../../test-utils/fixtures.js';
import PlanView from './PlanView.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A single healthy adult at home with nothing burning: very little applies. */
const CLEAN_LIVING: HouseholdProfile = {
  ...PROFILE,
  members: [{ ...COMMUTER, daytime: 'home' }],
  home: {
    ...PROFILE.home,
    tightness: 'sealed',
    ventilation: 'rarely',
    heating: 'none',
    indoorSources: [],
    hasKitchenExhaust: true,
    cookingFuel: 'induction',
    hasPurifier: true,
  },
  lifestyle: {
    ...PROFILE.lifestyle,
    burnsWaste: false,
    transitNearby: false,
    communityHouseholds: 1,
  },
};

/** Renders the plan for a profile against the given API routes. */
function renderPlan(
  profile: HouseholdProfile,
  routes = HAPPY_ROUTES,
  chosenIds: readonly string[] | null = null,
) {
  vi.stubGlobal('fetch', stubFetch(routes));
  return render(
    <PlanView
      profile={profile}
      chosenIds={chosenIds}
      language="en"
      onChoose={vi.fn()}
      onLanguage={vi.fn()}
      onEdit={vi.fn()}
    />,
  );
}

describe('PlanView edge cases', () => {
  it('handles a clean day, a one-day forecast, a household of one and empty categories', async () => {
    const user = userEvent.setup();
    const oneDay = { ...airSnapshot(25, 'fixture'), hours: airSnapshot(25).hours.slice(0, 24) };
    const { container } = renderPlan(CLEAN_LIVING, {
      ...HAPPY_ROUTES,
      '/api/air': { body: oneDay },
    });
    expect(await screen.findByText(/Demo mode/)).toBeInTheDocument();
    expect(screen.getByText(/· 1 person$/)).toBeInTheDocument();
    expect(screen.queryByText(/^Tomorrow:/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Safety for your family' })).toBeNull();
    await user.click(screen.getByRole('tab', { name: /^Actions/ }));
    expect(
      screen.getAllByText('Nothing here would make a real difference for your household today.')
        .length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: 'Impact' }));
    expect(screen.getByText(/Add the number of homes in your society/)).toBeInTheDocument();
    expect(screen.getAllByText(/With a typical 1 home taking part/).length).toBeGreaterThan(0);
    await expectNoViolations(container);
  });

  it('shows the engine summary honestly and reports coach and question errors', async () => {
    const user = userEvent.setup();
    renderPlan(
      PROFILE,
      {
        ...HAPPY_ROUTES,
        '/api/coach': { body: { ...COACH, priorities: [], source: 'engine' } },
        '/api/ask': { status: 503, body: { error: 'The AI assistant is busy right now.' } },
      },
      [],
    );
    await user.click(await screen.findByRole('tab', { name: 'AI coach' }));
    await user.click(screen.getByRole('button', { name: 'Explain my plan' }));
    expect(await screen.findByText(/the engine’s own summary/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /priorities/ })).toBeNull();
    await user.click(
      screen.getByRole('button', { name: 'When is the safest time for a walk today?' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('busy');
    await user.type(screen.getByLabelText('Your question'), '{Enter}');
  });

  it('reports a coach that cannot be reached', async () => {
    const user = userEvent.setup();
    renderPlan(PROFILE, {
      ...HAPPY_ROUTES,
      '/api/coach': {
        status: 429,
        body: { error: 'The AI assistant has reached its daily limit.' },
      },
    });
    await user.click(await screen.findByRole('tab', { name: 'AI coach' }));
    await user.click(screen.getByRole('button', { name: 'Explain my plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('daily limit');
  });

  it('marks unverified answers as English', async () => {
    const user = userEvent.setup();
    renderPlan(PROFILE, {
      ...HAPPY_ROUTES,
      '/api/ask': {
        body: { answer: 'I could not give an answer I can check.', onTopic: true, verified: false },
      },
    });
    await user.click(await screen.findByRole('tab', { name: 'AI coach' }));
    await user.click(screen.getByRole('button', { name: 'Is it safe to open the windows?' }));
    expect(await screen.findByText('I could not give an answer I can check.')).toHaveAttribute(
      'lang',
      'en',
    );
  });
});
