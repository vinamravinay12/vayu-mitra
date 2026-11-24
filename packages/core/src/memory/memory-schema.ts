/**
 * What Vayu Mitra remembers about a household. It is built up from the
 * conversation, shown back as chips the family can edit or forget, and kept
 * deliberately small: no names are needed, only how someone is referred to
 * ("Dadi", "my son"), their life stage and conditions that change the advice.
 */
import { z } from 'zod';
import { ACTIVITIES, AGE_GROUPS, HEALTH_CONDITIONS, HOME_FEATURES } from '../catalog/vocabulary.js';
import { TIME_OF_DAY_PATTERN } from '../time/local-clock.js';

/** How much a household’s memory may hold. */
export const MEMORY_LIMITS = {
  people: 8,
  routines: 12,
  labelLength: 40,
  minutes: 240,
} as const;

const label = z.string().trim().min(1).max(MEMORY_LIMITS.labelLength);

const personFactSchema = z.strictObject({
  kind: z.literal('person'),
  id: z.string().min(1).max(80),
  /** How the family refers to them. */
  label,
  ageGroup: z.enum(AGE_GROUPS),
  conditions: z.array(z.enum(HEALTH_CONDITIONS)).max(HEALTH_CONDITIONS.length),
});

const routineFactSchema = z.strictObject({
  kind: z.literal('routine'),
  id: z.string().min(1).max(80),
  activity: z.enum(ACTIVITIES),
  /** The id of the person it is for, or null for the whole family. */
  personId: z.string().min(1).max(80).nullable(),
  /** Usual start, `HH:MM`, or null when it varies. */
  time: z.string().regex(TIME_OF_DAY_PATTERN).nullable(),
  minutes: z.number().int().min(5).max(MEMORY_LIMITS.minutes),
});

const homeFactSchema = z.strictObject({
  kind: z.literal('home'),
  id: z.string().min(1).max(80),
  feature: z.enum(HOME_FEATURES),
});

/** A household’s memory: people, routines and home features. */
export const memorySchema = z.strictObject({
  people: z.array(personFactSchema).max(MEMORY_LIMITS.people),
  routines: z.array(routineFactSchema).max(MEMORY_LIMITS.routines),
  home: z.array(homeFactSchema).max(HOME_FEATURES.length),
});

/**
 * A change the conversation asks for. The AI proposes these; the engine
 * applies them, so the AI can never write arbitrary data into memory.
 */
export const memoryChangeSchema = z.discriminatedUnion('op', [
  z.strictObject({
    op: z.literal('remember-person'),
    label,
    ageGroup: z.enum(AGE_GROUPS),
    conditions: z.array(z.enum(HEALTH_CONDITIONS)).max(HEALTH_CONDITIONS.length),
  }),
  z.strictObject({
    op: z.literal('remember-routine'),
    activity: z.enum(ACTIVITIES),
    /** The person's label as the family said it, or null for everyone. */
    person: label.nullable(),
    time: z.string().regex(TIME_OF_DAY_PATTERN).nullable(),
    minutes: z.number().int().min(5).max(MEMORY_LIMITS.minutes).nullable(),
  }),
  z.strictObject({ op: z.literal('remember-home'), feature: z.enum(HOME_FEATURES) }),
  z.strictObject({ op: z.literal('forget'), id: z.string().min(1).max(80) }),
]);

/** A remembered person: how the family refers to them, life stage and conditions. */
export type PersonFact = z.infer<typeof personFactSchema>;
/** A remembered routine: the activity, whose, its usual time and length. */
export type RoutineFact = z.infer<typeof routineFactSchema>;
/** Any one remembered fact. */
export type MemoryFact = PersonFact | RoutineFact | z.infer<typeof homeFactSchema>;
/** A household’s memory. */
export type Memory = z.infer<typeof memorySchema>;
/** One change the conversation proposes to the memory. */
export type MemoryChange = z.infer<typeof memoryChangeSchema>;

/** A household Vayu Mitra knows nothing about yet. */
export const EMPTY_MEMORY: Memory = { people: [], routines: [], home: [] };
