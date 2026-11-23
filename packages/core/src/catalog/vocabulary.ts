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
  'open-windows',
] as const;

/** What the home already has that changes the advice. */
export const HOME_FEATURES = ['air-purifier', 'n95-masks', 'car'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type HomeFeature = (typeof HOME_FEATURES)[number];

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
