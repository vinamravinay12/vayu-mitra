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

/** One NAQI category, Good to Severe. */
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

/**
 * The other NAQI pollutants, as CPCB's real-time feed reports them. Units are
 * µg/m³ except CO, which CPCB reports in mg/m³. The open top band of each uses
 * the upper concentration CPCB's calculator caps at.
 */
export const NO2_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 40, 0, 50],
  ['satisfactory', 40, 80, 50, 100],
  ['moderate', 80, 180, 100, 200],
  ['poor', 180, 280, 200, 300],
  ['very-poor', 280, 400, 300, 400],
  ['severe', 400, 800, 400, 500],
]);

/** Ozone, 8-hour mean. */
export const O3_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 50, 0, 50],
  ['satisfactory', 50, 100, 50, 100],
  ['moderate', 100, 168, 100, 200],
  ['poor', 168, 208, 200, 300],
  ['very-poor', 208, 748, 300, 400],
  ['severe', 748, 1000, 400, 500],
]);

/** NAQI breakpoints for sulphur dioxide (24-hour µg/m³). */
export const SO2_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 40, 0, 50],
  ['satisfactory', 40, 80, 50, 100],
  ['moderate', 80, 380, 100, 200],
  ['poor', 380, 800, 200, 300],
  ['very-poor', 800, 1600, 300, 400],
  ['severe', 1600, 2400, 400, 500],
]);

/** Carbon monoxide, 8-hour mean, mg/m³. */
export const CO_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 1, 0, 50],
  ['satisfactory', 1, 2, 50, 100],
  ['moderate', 2, 10, 100, 200],
  ['poor', 10, 17, 200, 300],
  ['very-poor', 17, 34, 300, 400],
  ['severe', 34, 50, 400, 500],
]);

/** NAQI breakpoints for ammonia (24-hour µg/m³). */
export const NH3_BREAKPOINTS: readonly Breakpoint[] = toBreakpoints([
  ['good', 0, 200, 0, 50],
  ['satisfactory', 200, 400, 50, 100],
  ['moderate', 400, 800, 100, 200],
  ['poor', 800, 1200, 200, 300],
  ['very-poor', 1200, 1800, 300, 400],
  ['severe', 1800, 2400, 400, 500],
]);

/** Short labels for each category, as people say them. */
export const CATEGORY_LABELS: Readonly<Record<AqiCategory, string>> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  'very-poor': 'Very poor',
  severe: 'Severe',
};
