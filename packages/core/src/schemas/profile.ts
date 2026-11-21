import { z } from 'zod';
import {
  AGE_GROUPS,
  COMMUTE_MODES,
  COOKING_FUELS,
  DAYTIME_PLACES,
  EXERCISE_LEVELS,
  HEALTH_CONDITIONS,
  HEATING_TYPES,
  HOME_TIGHTNESS,
  INDOOR_SOURCES,
  VENTILATION_HABITS,
} from '../catalog/vocabulary.js';

/**
 * The household profile: the only input the engine needs besides air data.
 * One schema validates the form, the server boundary and saved state, and the
 * TypeScript types are inferred from it so they can never drift apart.
 */

/** Limits shared by the schema, the form and the AI extractor prompt. */
export const PROFILE_LIMITS = {
  maxMembers: 8,
  maxNameLength: 30,
  maxCommuteKm: 60,
  maxGeneratorHoursPerWeek: 84,
  maxCommunityHouseholds: 5000,
} as const;

/** A list with no repeated values. */
const uniqueList = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .refine((items) => new Set(items).size === items.length, 'Values must not repeat');

/** One person in the household. */
export const memberSchema = z.object({
  name: z.string().trim().min(1).max(PROFILE_LIMITS.maxNameLength),
  ageGroup: z.enum(AGE_GROUPS),
  conditions: uniqueList(HEALTH_CONDITIONS),
  daytime: z.enum(DAYTIME_PLACES),
  commuteMode: z.enum(COMMUTE_MODES),
  /** One way, in kilometres. Ignored for members who stay home. */
  commuteKm: z.number().min(0).max(PROFILE_LIMITS.maxCommuteKm),
  outdoorExercise: z.enum(EXERCISE_LEVELS),
  /** Local hour (0–23) the member usually exercises outdoors. */
  exerciseHour: z.number().int().min(0).max(23),
});

/** The home and what burns inside it. */
export const homeSchema = z.object({
  tightness: z.enum(HOME_TIGHTNESS),
  ventilation: z.enum(VENTILATION_HABITS),
  hasPurifier: z.boolean(),
  cookingFuel: z.enum(COOKING_FUELS),
  hasKitchenExhaust: z.boolean(),
  heating: z.enum(HEATING_TYPES),
  indoorSources: uniqueList(INDOOR_SOURCES),
});

/** Household routines and the community around it. */
export const lifestyleSchema = z.object({
  workDaysPerWeek: z.number().int().min(0).max(7),
  /** Local hour members usually leave for school or work. */
  departHour: z.number().int().min(4).max(12),
  burnsWaste: z.boolean(),
  generatorHoursPerWeek: z.number().min(0).max(PROFILE_LIMITS.maxGeneratorHoursPerWeek),
  /** A metro or reliable bus within walking distance. */
  transitNearby: z.boolean(),
  /** Households in the society, colony or community group sharing the plan. */
  communityHouseholds: z.number().int().min(1).max(PROFILE_LIMITS.maxCommunityHouseholds),
});

/** A place resolved by the geocoder; coordinates pick the air forecast. */
export const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  region: z.string().trim().max(80),
  country: z.string().trim().max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** The complete, validated household profile. */
export const profileSchema = z.object({
  place: placeSchema,
  members: z.array(memberSchema).min(1).max(PROFILE_LIMITS.maxMembers),
  home: homeSchema,
  lifestyle: lifestyleSchema,
});

export type Member = z.infer<typeof memberSchema>;
export type Home = z.infer<typeof homeSchema>;
export type Lifestyle = z.infer<typeof lifestyleSchema>;
export type Place = z.infer<typeof placeSchema>;
export type HouseholdProfile = z.infer<typeof profileSchema>;
