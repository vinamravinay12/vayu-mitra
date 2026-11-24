/**
 * Closed vocabularies. Every value the memory, the AI and the advice can use is
 * listed here once; schemas, prompts and labels all read from these lists.
 */

/** Life stages that change breathing rate and vulnerability. */
export const AGE_GROUPS = ['infant', 'child', 'teen', 'adult', 'senior'] as const;

/** Health conditions that make smog more dangerous. */
export const HEALTH_CONDITIONS = [
  'asthma',
  'copd',
  'heart-disease',
  'pregnancy',
  'diabetes',
  'allergies',
] as const;

/** Things a family does that the air changes the answer to. */
export const ACTIVITIES = [
  'walk',
  'run',
  'cycle',
  'outdoor-play',
  'school-run',
  'commute',
  'yoga',
  'outdoor-chores',
  'car-trip',
  'open-windows',
] as const;

/** Which day a question is about; the outlook covers today and tomorrow. */
export const DAYS = ['today', 'tomorrow'] as const;

/** What the home already has that changes the advice. */
export const HOME_FEATURES = ['air-purifier', 'n95-masks', 'car'] as const;

/** A life stage the engine knows. */
export type AgeGroup = (typeof AGE_GROUPS)[number];
/** A health condition the engine takes into account. */
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];
/** An activity the engine advises on. */
export type Activity = (typeof ACTIVITIES)[number];
/** Something a home may have that changes the advice. */
export type HomeFeature = (typeof HOME_FEATURES)[number];
/** Today or tomorrow. */
export type Day = (typeof DAYS)[number];

/** Parts of the day people plan by, when they give no clock time. */
export const PERIODS = ['morning', 'afternoon', 'evening', 'night'] as const;

/** A part of the day: morning, afternoon, evening or night. */
export type Period = (typeof PERIODS)[number];

/** The local hours each part of the day covers, inclusive. */
export const PERIOD_HOURS: Readonly<Record<Period, { first: number; last: number }>> = {
  morning: { first: 5, last: 11 },
  afternoon: { first: 12, last: 16 },
  evening: { first: 17, last: 20 },
  night: { first: 21, last: 23 },
};

/** Readable labels for life stages. */
export const AGE_LABELS: Readonly<Record<AgeGroup, string>> = {
  infant: 'baby',
  child: 'child',
  teen: 'teen',
  adult: 'adult',
  senior: 'older adult',
};

/** Readable labels for conditions. */
export const CONDITION_LABELS: Readonly<Record<HealthCondition, string>> = {
  asthma: 'asthma',
  copd: 'COPD',
  'heart-disease': 'heart disease',
  pregnancy: 'pregnant',
  diabetes: 'diabetes',
  allergies: 'allergies',
};

/** Readable labels for home features. */
export const HOME_FEATURE_LABELS: Readonly<Record<HomeFeature, string>> = {
  'air-purifier': 'Air purifier at home',
  'n95-masks': 'N95 masks at home',
  car: 'Has a car',
};

/** Groups WHO and CPCB name as most at risk from particulate smog. */
export const SENSITIVE_AGES: readonly AgeGroup[] = ['infant', 'child', 'senior'];

/** Lung conditions, for which carrying a reliever inhaler matters. */
export const RESPIRATORY_CONDITIONS: readonly HealthCondition[] = ['asthma', 'copd'];
