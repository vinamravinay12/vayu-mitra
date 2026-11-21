import type { z } from 'zod';
import { STRICT_FIELDS, type DraftMember, type ProfileDraft } from '../schemas/draft.js';
import type { Home, Lifestyle, Member } from '../schemas/profile.js';

/** Everything in a profile except the place, which is geocoded separately. */
export interface CompletedProfile {
  readonly members: readonly Member[];
  readonly home: Home;
  readonly lifestyle: Lifestyle;
  /** Dotted paths of fields filled with a default, so the form can ask about them. */
  readonly assumed: readonly string[];
}

/** Defaults for a home nobody has described: the common urban Indian case. */
export const DEFAULT_HOME: Home = {
  tightness: 'average',
  ventilation: 'morning',
  hasPurifier: false,
  cookingFuel: 'lpg',
  hasKitchenExhaust: false,
  heating: 'none',
  indoorSources: [],
};

/** Defaults for routines nobody has described. */
export const DEFAULT_LIFESTYLE: Lifestyle = {
  workDaysPerWeek: 5,
  departHour: 8,
  burnsWaste: false,
  generatorHoursPerWeek: 0,
  transitNearby: false,
  communityHouseholds: 1,
};

/** A member default that depends on life stage: children go to school, adults to work. */
export function defaultMember(ageGroup: Member['ageGroup'], position: number): Member {
  const goesToSchool = ageGroup === 'child' || ageGroup === 'teen';
  const staysHome = ageGroup === 'infant' || ageGroup === 'senior';
  return {
    name: position === 0 ? 'You' : `Member ${String(position + 1)}`,
    ageGroup,
    conditions: [],
    daytime: staysHome ? 'home' : goesToSchool ? 'school' : 'office',
    commuteMode: 'bus',
    commuteKm: goesToSchool ? 4 : 10,
    outdoorExercise: 'none',
    exerciseHour: 7,
  };
}

/** Records `path` as assumed and returns the fallback when `value` fails `schema`. */
function keepOrDefault<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallback: T,
  onAssumed: () => void,
): T {
  const parsed = schema.safeParse(value);
  if (value !== null && parsed.success) {
    return parsed.data;
  }
  onAssumed();
  return fallback;
}

/** Fills every field of `fallback` from `draft` where the draft value is valid. */
function completeObject<T extends object>(
  shape: Readonly<Record<keyof T, z.ZodType>>,
  draft: Readonly<Record<keyof T, unknown>>,
  fallback: T,
  assume: (field: string) => void,
): T {
  const keys = Object.keys(fallback) as (keyof T)[];
  const entries = keys.map((key) => [
    key,
    keepOrDefault(shape[key], draft[key], fallback[key], () => {
      assume(String(key));
    }),
  ]);
  return Object.fromEntries(entries) as T;
}

/** One member with defaults chosen for that member's life stage. */
function completeMember(draft: DraftMember, position: number, assumed: string[]): Member {
  const ageGroup = draft.ageGroup ?? 'adult';
  return completeObject<Member>(
    STRICT_FIELDS.member,
    { ...draft, conditions: [...new Set(draft.conditions)] },
    defaultMember(ageGroup, position),
    (field) => {
      assumed.push(`members.${String(position)}.${field}`);
    },
  );
}

/**
 * Turns an AI (or empty) draft into a complete profile.
 *
 * Every value is re-checked against the strict schema: an out-of-range number
 * from the model becomes the default and is listed in `assumed`, so the form
 * shows the family exactly which answers were guessed.
 */
export function completeProfile(draft: ProfileDraft): CompletedProfile {
  const assumed: string[] = [];
  const memberDrafts: readonly DraftMember[] =
    draft.members.length > 0 ? draft.members : [EMPTY_MEMBER];
  const members = memberDrafts.map((member, index) => completeMember(member, index, assumed));
  const home = completeObject<Home>(
    STRICT_FIELDS.home,
    { ...draft.home, indoorSources: [...new Set(draft.home.indoorSources)] },
    DEFAULT_HOME,
    (field) => assumed.push(`home.${field}`),
  );
  const lifestyle = completeObject<Lifestyle>(
    STRICT_FIELDS.lifestyle,
    draft.lifestyle,
    DEFAULT_LIFESTYLE,
    (field) => assumed.push(`lifestyle.${field}`),
  );
  return { members, home, lifestyle, assumed };
}

/** A member the extractor knew nothing about. */
const EMPTY_MEMBER: DraftMember = {
  name: null,
  ageGroup: null,
  conditions: [],
  daytime: null,
  commuteMode: null,
  commuteKm: null,
  outdoorExercise: null,
  exerciseHour: null,
};

/** A draft with nothing in it: the starting point for filling in the form by hand. */
export const EMPTY_DRAFT: ProfileDraft = {
  placeQuery: null,
  members: [],
  home: {
    tightness: null,
    ventilation: null,
    hasPurifier: null,
    cookingFuel: null,
    hasKitchenExhaust: null,
    heating: null,
    indoorSources: [],
  },
  lifestyle: {
    workDaysPerWeek: null,
    departHour: null,
    burnsWaste: null,
    generatorHoursPerWeek: null,
    transitNearby: null,
    communityHouseholds: null,
  },
};
