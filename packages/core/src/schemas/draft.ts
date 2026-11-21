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
import { homeSchema, lifestyleSchema, memberSchema, PROFILE_LIMITS } from './profile.js';

/**
 * What the AI extractor may return: the profile's shape with every scalar
 * nullable ("not mentioned"). Enums are the closed vocabularies, so the model
 * can only choose among values the engine understands.
 */

/** A member as read from free text. */
export const draftMemberSchema = z.object({
  name: z.string().max(PROFILE_LIMITS.maxNameLength).nullable(),
  ageGroup: z.enum(AGE_GROUPS).nullable(),
  conditions: z.array(z.enum(HEALTH_CONDITIONS)),
  daytime: z.enum(DAYTIME_PLACES).nullable(),
  commuteMode: z.enum(COMMUTE_MODES).nullable(),
  commuteKm: z.number().nullable(),
  outdoorExercise: z.enum(EXERCISE_LEVELS).nullable(),
  exerciseHour: z.number().int().nullable(),
});

/** The home as read from free text. */
export const draftHomeSchema = z.object({
  tightness: z.enum(HOME_TIGHTNESS).nullable(),
  ventilation: z.enum(VENTILATION_HABITS).nullable(),
  hasPurifier: z.boolean().nullable(),
  cookingFuel: z.enum(COOKING_FUELS).nullable(),
  hasKitchenExhaust: z.boolean().nullable(),
  heating: z.enum(HEATING_TYPES).nullable(),
  indoorSources: z.array(z.enum(INDOOR_SOURCES)),
});

/** Routines as read from free text. */
export const draftLifestyleSchema = z.object({
  workDaysPerWeek: z.number().int().nullable(),
  departHour: z.number().int().nullable(),
  burnsWaste: z.boolean().nullable(),
  generatorHoursPerWeek: z.number().nullable(),
  transitNearby: z.boolean().nullable(),
  communityHouseholds: z.number().int().nullable(),
});

/** The extractor's whole answer. `placeQuery` is geocoded separately. */
export const profileDraftSchema = z.object({
  placeQuery: z.string().max(80).nullable(),
  members: z.array(draftMemberSchema).max(PROFILE_LIMITS.maxMembers),
  home: draftHomeSchema,
  lifestyle: draftLifestyleSchema,
});

export type DraftMember = z.infer<typeof draftMemberSchema>;
export type DraftHome = z.infer<typeof draftHomeSchema>;
export type DraftLifestyle = z.infer<typeof draftLifestyleSchema>;
export type ProfileDraft = z.infer<typeof profileDraftSchema>;

/** The strict per-field schemas a draft value must also pass to be kept. */
export const STRICT_FIELDS = {
  member: memberSchema.shape,
  home: homeSchema.shape,
  lifestyle: lifestyleSchema.shape,
} as const;
