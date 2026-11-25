/** Tests of CleanerHomeCard and the advice card's impact row. */
import { adviseActivity, categoryOf, EMPTY_MEMORY, type AirReport, type Memory } from '@vayu/core';
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { expectNoViolations } from '../../test-utils/axe.js';
import { makeReport } from '../../test-utils/fixtures.js';
import { AdviceCard } from '../chat/AdviceCard.js';
import { CleanerHomeCard, describeSaving } from './CleanerHomeCard.js';

/** A family with a car and a 45-minute commute. */
const DRIVING: Memory = {
  ...EMPTY_MEMORY,
  routines: [
    { kind: 'routine', id: 'r1', activity: 'commute', personId: null, time: '09:00', minutes: 45 },
  ],
  home: [{ kind: 'home', id: 'h1', feature: 'car' }],
};

it('CleanerHomeCard: tailors low-emission steps to the car and the commute, with their saving', async () => {
  const { container } = render(<CleanerHomeCard memory={DRIVING} />);
  const steps = screen.getByRole('region', { name: 'Add less to the smog' });
  expect(within(steps).getByText('Take the metro or a bus for the commute')).toBeInTheDocument();
  expect(
    within(steps).getByText('About 2.1 kg of CO₂ and 400 mg of PM2.5 less per trip (estimate).'),
  ).toBeInTheDocument();
  expect(
    within(steps).getByText('About 0.3 kg of CO₂ less per 10 minutes (estimate).'),
  ).toBeInTheDocument();
  const indoors = screen.getByRole('region', { name: 'Cleaner air indoors' });
  expect(within(indoors).getByText('Make the bedroom the clean room')).toBeInTheDocument();
  await expectNoViolations(container);
});

it('CleanerHomeCard: offers only what every household can do when there is no car', () => {
  render(<CleanerHomeCard memory={EMPTY_MEMORY} />);
  const steps = screen.getByRole('region', { name: 'Add less to the smog' });
  expect(within(steps).getAllByRole('listitem')).toHaveLength(2);
  expect(describeSaving({ co2Kg: 1, pm25Milligrams: 0, per: 'trip' })).toBe(
    'About 1 kg of CO₂ less per trip (estimate).',
  );
});

it('AdviceCard: shows what the cleanest hour saves in PM2.5 breathed', () => {
  const base = makeReport();
  const report: AirReport = {
    ...base,
    hours: base.hours.map((hour, index) => {
      const [aqi, pm25] = index === 3 ? [90, 40] : [260, 160];
      return { ...hour, aqi, pm25, category: categoryOf(aqi) };
    }),
  };
  const advice = adviseActivity({
    activity: 'walk',
    report,
    now: new Date(report.fetchedAt),
    people: [],
    home: [],
    time: null,
    day: null,
    period: null,
    minutes: 60,
  });
  render(<AdviceCard advice={advice} today={base.hours[0]?.time.slice(0, 10) ?? ''} />);
  expect(screen.getByText('Impact')).toBeInTheDocument();
  expect(
    screen.getByText(
      /^About 75% less PM2\.5 breathed at the cleanest hour: 29 µg instead of 115 µg over 60 min$/,
    ),
  ).toBeInTheDocument();
});
