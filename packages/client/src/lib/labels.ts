import type {
  ActionCategory,
  AqiCategory,
  CommuteMode,
  CookingFuel,
  DoseBreakdown,
  DaytimePlace,
  EmissionSource,
  ExerciseLevel,
  HeatingType,
  HomeTightness,
  IndoorSource,
  VentilationHabit,
} from '@vayu/core';
import {
  COMMUTE_MODE_PROFILES,
  COOKING_PROFILES,
  HEATING_PROFILES,
  INDOOR_SOURCE_PROFILES,
} from '@vayu/core';

/** Readable labels for every value the form and the plan show. One place, so wording stays consistent. */

export const AQI_LABELS: Readonly<Record<AqiCategory, string>> = {
  good: 'Good',
  satisfactory: 'Satisfactory',
  moderate: 'Moderate',
  poor: 'Poor',
  'very-poor': 'Very poor',
  severe: 'Severe',
};

export const DAYTIME_LABELS: Readonly<Record<DaytimePlace, string>> = {
  home: 'Stays home',
  school: 'School or college',
  office: 'Office or indoor work',
  outdoors: 'Works outdoors',
};

export const EXERCISE_LABELS: Readonly<Record<ExerciseLevel, string>> = {
  none: 'No outdoor exercise',
  light: 'Light (walks, yoga)',
  vigorous: 'Vigorous (running, sport)',
};

export const TIGHTNESS_LABELS: Readonly<Record<HomeTightness, string>> = {
  leaky: 'Draughty — gaps around doors and windows',
  average: 'Average',
  sealed: 'Well sealed (new airtight windows)',
};

export const VENTILATION_LABELS: Readonly<Record<VentilationHabit, string>> = {
  morning: 'Open in the morning',
  'all-day': 'Open most of the day',
  rarely: 'Rarely opened',
};

export const CATEGORY_TITLES: Readonly<Record<ActionCategory, string>> = {
  routine: 'Low-emission daily routines',
  indoor: 'Indoor air fixes',
  sustainable: 'Sustainable alternatives',
};

export const DOSE_PLACE_LABELS: Readonly<Record<keyof DoseBreakdown, string>> = {
  home: 'at home',
  commute: 'travelling',
  away: 'at school or work',
  exercise: 'exercising',
};

export const SOURCE_LABELS: Readonly<Record<EmissionSource, string>> = {
  commute: 'Commuting',
  cooking: 'Cooking',
  heating: 'Heating',
  indoor: 'Incense, coils and smoking',
  waste: 'Burning waste',
  generator: 'Diesel generator',
};

/** Labels taken from the engine's own data, so they cannot drift from it. */
export const COMMUTE_LABELS = Object.fromEntries(
  Object.entries(COMMUTE_MODE_PROFILES).map(([mode, profile]) => [mode, profile.label]),
) as Readonly<Record<CommuteMode, string>>;

export const COOKING_LABELS = Object.fromEntries(
  Object.entries(COOKING_PROFILES).map(([fuel, profile]) => [fuel, profile.label]),
) as Readonly<Record<CookingFuel, string>>;

export const HEATING_LABELS = Object.fromEntries(
  Object.entries(HEATING_PROFILES).map(([type, profile]) => [type, profile.label]),
) as Readonly<Record<HeatingType, string>>;

export const INDOOR_SOURCE_LABELS = Object.fromEntries(
  Object.entries(INDOOR_SOURCE_PROFILES).map(([source, profile]) => [source, profile.label]),
) as Readonly<Record<IndoorSource, string>>;
