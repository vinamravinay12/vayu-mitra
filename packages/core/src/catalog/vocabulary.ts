/**
 * Closed vocabularies. Every value the profile, the AI extractor and the
 * catalogue can use is listed here once; schemas, prompts and UI labels all
 * read from these lists, so a value cannot exist in one place and not another.
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

/** Where a household member spends the working day. */
export const DAYTIME_PLACES = ['home', 'school', 'office', 'outdoors'] as const;

/** How a member travels to school or work. */
export const COMMUTE_MODES = [
  'walk',
  'cycle',
  'two-wheeler',
  'auto-rickshaw',
  'car-petrol',
  'car-diesel',
  'car-cng',
  'car-electric',
  'bus',
  'metro',
] as const;

/** Private cars: the modes where cabin recirculation and carpooling apply. */
export const CAR_MODES = ['car-petrol', 'car-diesel', 'car-cng', 'car-electric'] as const;

/** Main cooking fuel. */
export const COOKING_FUELS = ['lpg', 'piped-gas', 'induction', 'biomass', 'kerosene'] as const;

/** Main way the home is heated in winter. */
export const HEATING_TYPES = ['none', 'electric', 'gas', 'coal-or-wood', 'kerosene'] as const;

/** When windows are usually open. */
export const VENTILATION_HABITS = ['morning', 'all-day', 'rarely'] as const;

/** How draughty the home is; sets how much outdoor smog gets in. */
export const HOME_TIGHTNESS = ['leaky', 'average', 'sealed'] as const;

/** Everyday indoor smoke sources beyond cooking and heating. */
export const INDOOR_SOURCES = ['incense', 'mosquito-coil', 'indoor-smoking', 'candles'] as const;

/** How hard a member exercises outdoors, if at all. */
export const EXERCISE_LEVELS = ['none', 'light', 'vigorous'] as const;

/** Languages the AI coach can answer in. */
export const LANGUAGES = ['en', 'hi'] as const;

/** Which part of the plan an action belongs to, mirroring the problem statement. */
export const ACTION_CATEGORIES = ['routine', 'indoor', 'sustainable'] as const;

/** Relative upfront cost of an action. */
export const COST_TIERS = ['free', 'low', 'medium', 'high'] as const;

/** How much change an action asks of a family. */
export const EFFORT_LEVELS = ['easy', 'moderate', 'hard'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number];
export type DaytimePlace = (typeof DAYTIME_PLACES)[number];
export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];
export type HeatingType = (typeof HEATING_TYPES)[number];
export type VentilationHabit = (typeof VENTILATION_HABITS)[number];
export type HomeTightness = (typeof HOME_TIGHTNESS)[number];
export type IndoorSource = (typeof INDOOR_SOURCES)[number];
export type ExerciseLevel = (typeof EXERCISE_LEVELS)[number];
export type Language = (typeof LANGUAGES)[number];
export type ActionCategory = (typeof ACTION_CATEGORIES)[number];
export type CostTier = (typeof COST_TIERS)[number];
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

/** True when the commute mode is a private car. */
export const isCarMode = (mode: CommuteMode): boolean =>
  (CAR_MODES as readonly string[]).includes(mode);
