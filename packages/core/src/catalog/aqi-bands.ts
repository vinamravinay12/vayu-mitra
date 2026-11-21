/**
 * India's National Air Quality Index (CPCB, 2014) for particulate matter.
 *
 * Each breakpoint maps a 24-hour concentration range (µg/m³) onto an index
 * range; the sub-index is interpolated linearly inside the band. The top band
 * is open-ended in the standard, so its upper concentration is the value CPCB's
 * own calculator uses, and anything above it is reported as 500.
 */

/** NAQI categories, cleanest first. */
export const AQI_CATEGORIES = [
  'good',
  'satisfactory',
  'moderate',
  'poor',
  'very-poor',
  'severe',
] as const;

export type AqiCategory = (typeof AQI_CATEGORIES)[number];

/** One band of the index: a concentration range and the index range it maps to. */
export interface Breakpoint {
  readonly category: AqiCategory;
  readonly concentrationLow: number;
  readonly concentrationHigh: number;
  readonly indexLow: number;
  readonly indexHigh: number;
}

/** One row per category: [category, concentration low, high, index low, high]. */
type BandRow = readonly [AqiCategory, number, number, number, number];

/** Turns compact table rows into breakpoints. */
const toBreakpoints = (rows: readonly BandRow[]): Breakpoint[] =>
  rows.map(([category, concentrationLow, concentrationHigh, indexLow, indexHigh]) => ({
    category,
    concentrationLow,
    concentrationHigh,
    indexLow,
    indexHigh,
  }));

/** PM2.5 bands (24-hour mean, µg/m³). */
export const PM25_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 30, 0, 50],
  ['satisfactory', 30, 60, 50, 100],
  ['moderate', 60, 90, 100, 200],
  ['poor', 90, 120, 200, 300],
  ['very-poor', 120, 250, 300, 400],
  ['severe', 250, 380, 400, 500],
]);

/** PM10 bands (24-hour mean, µg/m³). */
export const PM10_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 50, 0, 50],
  ['satisfactory', 50, 100, 50, 100],
  ['moderate', 100, 250, 100, 200],
  ['poor', 250, 350, 200, 300],
  ['very-poor', 350, 430, 300, 400],
  ['severe', 430, 510, 400, 500],
]);

/** What each category means for health, paraphrasing CPCB's guidance. */
export const CATEGORY_GUIDANCE: Readonly<Record<AqiCategory, string>> = {
  good: 'Minimal impact. A good day to air the home and be active outdoors.',
  satisfactory: 'Minor breathing discomfort for sensitive people.',
  moderate:
    'Breathing discomfort for people with asthma, lung or heart disease, children and older adults.',
  poor: 'Breathing discomfort for most people on prolonged exposure.',
  'very-poor': 'Respiratory illness on prolonged exposure. Limit time outdoors.',
  severe:
    'Affects healthy people and seriously affects those with existing disease. Stay indoors as much as possible.',
};

/** WHO 2021 guideline for 24-hour mean PM2.5, in µg/m³. */
export const WHO_PM25_24H_GUIDELINE = 15;

/**
 * Breathing air at this 24-hour PM2.5 average does roughly the damage of one
 * cigarette a day (Berkeley Earth, Muller & Muller 2015). Used only to make
 * numbers relatable, never as a medical claim.
 */
export const PM25_PER_CIGARETTE = 22;
