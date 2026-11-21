import type { AgeGroup, HomeTightness, VentilationHabit } from './vocabulary.js';

/**
 * Constants of the personal exposure model, kept together as data so the
 * model's assumptions can be read, tested and challenged in one place.
 * Sources are listed in docs/ASSUMPTIONS.md.
 */

/** Activities that set how much air a person breathes in an hour. */
export type Activity = 'sleep' | 'rest' | 'light' | 'moderate' | 'vigorous';

/**
 * Breathing rate in m³ per hour, by life stage and activity (US EPA Exposure
 * Factors Handbook, ch. 6, rounded). Children breathe far more air for their
 * body weight, which is part of why they are more vulnerable.
 */
export const BREATHING_RATES: Readonly<Record<AgeGroup, Readonly<Record<Activity, number>>>> = {
  infant: { sleep: 0.2, rest: 0.25, light: 0.35, moderate: 0.4, vigorous: 0.45 },
  child: { sleep: 0.3, rest: 0.4, light: 0.9, moderate: 1.4, vigorous: 1.8 },
  teen: { sleep: 0.3, rest: 0.5, light: 1.1, moderate: 1.8, vigorous: 2.5 },
  adult: { sleep: 0.3, rest: 0.5, light: 1.1, moderate: 1.9, vigorous: 2.9 },
  senior: { sleep: 0.3, rest: 0.45, light: 1, moderate: 1.6, vigorous: 2 },
};

/**
 * Indoor/outdoor ratio for outdoor PM2.5 that leaks into a closed home.
 * Typical measured ratios for Indian homes in winter are 0.4–0.9.
 */
export const INFILTRATION: Readonly<Record<HomeTightness, number>> = {
  leaky: 0.8,
  average: 0.6,
  sealed: 0.4,
};

/** Indoor/outdoor ratio while windows are open: nearly outdoor air. */
export const OPEN_WINDOW_RATIO = 0.95;

/** Indoor/outdoor ratio in a school or office without filtration. */
export const NON_RESIDENTIAL_RATIO = 0.7;

/** Local hours windows are open for each habit. */
export const WINDOW_HOURS: Readonly<Record<VentilationHabit, readonly number[]>> = {
  morning: [7, 8, 9],
  'all-day': [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  rarely: [],
};

/** People are asleep from 22:00 for 8 hours. */
export const SLEEP = { startHour: 22, hours: 8 } as const;

/** Local hours people are asleep (22:00 to 06:00). */
export const SLEEP_HOURS: readonly number[] = Array.from(
  { length: SLEEP.hours },
  (_unused, offset) => (SLEEP.startHour + offset) % 24,
);

/** Hours spent at the destination, by daytime place. */
export const AWAY_HOURS = { school: 6, office: 9, outdoors: 8 } as const;

/** Waking hours considered when looking for the cleanest window (07:00 to 20:00). */
export const DAYLIGHT_WINDOW = { firstHour: 7, lastHour: 20 } as const;

/** Length of the cleanest window the routine recommends, in hours. */
export const CLEAN_WINDOW_HOURS = 2;

/** A purifier loses most of its effect while windows are open. */
export const PURIFIER_OPEN_WINDOW_EFFECTIVENESS = 0.3;

/** Hours a bedroom purifier runs in the routine: evening through morning. */
export const PURIFIER_HOURS: readonly number[] = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];

/** Outdoor exercise sessions are modelled as one hour. */
export const EXERCISE_SESSION_HOURS = 1;

/** Weeks in a north-Indian smog season (mid-October to mid-February). */
export const SMOG_SEASON_WEEKS = 16;

/** Above this hourly PM2.5, even a short airing lets in more than it clears. */
export const NO_AIRING_PM25 = 250;
