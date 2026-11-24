/** Tests of AirCard. */
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DELHI, makeReport } from '../../test-utils/fixtures.js';
import { AirCard } from './AirCard.js';

it('AirCard: says when the number is a forecast, not a station reading', () => {
  const report = { ...makeReport(), station: null };
  render(<AirCard air={{ status: 'ready', report }} place={DELHI} />);
  expect(screen.getByText(/^Forecast estimate: no official station/)).toBeInTheDocument();
});

it('AirCard: shows the hours ahead across midnight', () => {
  const report = makeReport([
    300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450,
  ]);
  const late = { ...report, hours: report.hours.slice(4) };
  render(<AirCard air={{ status: 'ready', report: late }} place={DELHI} />);
  expect(screen.getByText('tomorrow 12 am: Severe')).toBeInTheDocument();
});
