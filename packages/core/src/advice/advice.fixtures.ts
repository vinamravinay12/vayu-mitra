/** Advice-test helpers: advice input with defaults. */
import { makeReport, NOW, PAPA } from '../test-utils/fixtures.js';
import { type AdviceInput } from './advise-activity.js';

/** 10:00 … 21:00 today, then tomorrow from 22:00 on. */
export const DAY = [180, 160, 140, 120, 110, 130, 170, 220, 260, 300, 320, 340, 360, 380];

/** Advice input for a healthy adult’s walk now, with any fields given. */
export const input = (overrides: Partial<AdviceInput> = {}): AdviceInput => ({
  activity: 'walk',
  report: makeReport(DAY),
  now: NOW,
  people: [PAPA],
  home: [],
  time: null,
  day: null,
  period: null,
  minutes: null,
  ...overrides,
});
