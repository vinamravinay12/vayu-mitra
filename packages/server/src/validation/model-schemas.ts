import {
  ACTIVITIES,
  AGE_GROUPS,
  CHAT_LIMITS,
  HEALTH_CONDITIONS,
  HOME_FEATURES,
  memoryChangeSchema,
  TIME_OF_DAY_PATTERN,
  type MemoryChange,
} from '@vayu/core';
import { z } from 'zod';

/**
 * What the model may answer, as Zod schemas that double as the JSON Schema
 * Gemini decodes against. A model cannot produce a field the server does not
 * know, and every vocabulary is the engine's own closed list.
 */

/** The injection judge's answer. */
export const guardVerdictSchema = z.object({
  verdict: z.enum(['safe', 'manipulation']),
  reason: z.string().max(200),
});

const time = z.string().regex(TIME_OF_DAY_PATTERN).nullable();

/**
 * One memory change, flattened: every op's fields side by side, unused ones
 * null. Flat objects decode more reliably than a union; each is then checked
 * against the engine's strict union, and anything that does not fit is dropped.
 */
export const flatChangeSchema = z.object({
  op: z.enum(['remember-person', 'remember-routine', 'remember-home', 'forget']),
  label: z.string().max(40).nullable(),
  ageGroup: z.enum(AGE_GROUPS).nullable(),
  conditions: z.array(z.enum(HEALTH_CONDITIONS)).max(HEALTH_CONDITIONS.length).nullable(),
  activity: z.enum(ACTIVITIES).nullable(),
  person: z.string().max(40).nullable(),
  time,
  minutes: z.number().int().nullable(),
  feature: z.enum(HOME_FEATURES).nullable(),
  id: z.string().max(80).nullable(),
});

/** The understand call's answer. */
export const understandingSchema = z.object({
  memoryChanges: z.array(flatChangeSchema).max(6),
  activity: z.enum(ACTIVITIES).nullable(),
  person: z.string().max(40).nullable(),
  time,
  onTopic: z.boolean(),
});

/** The reply call's answer. */
export const replySchema = z.object({ reply: z.string().min(1).max(CHAT_LIMITS.reply) });

type FlatChange = z.infer<typeof flatChangeSchema>;

/** The strict change a flat one describes, or null when its fields do not fit its op. */
export function toMemoryChange(flat: FlatChange): MemoryChange | null {
  const candidates: Record<FlatChange['op'], unknown> = {
    'remember-person': {
      op: flat.op,
      label: flat.label,
      ageGroup: flat.ageGroup,
      conditions: flat.conditions ?? [],
    },
    'remember-routine': {
      op: flat.op,
      activity: flat.activity,
      person: flat.person,
      time: flat.time,
      minutes: flat.minutes,
    },
    'remember-home': { op: flat.op, feature: flat.feature },
    forget: { op: flat.op, id: flat.id },
  };
  const parsed = memoryChangeSchema.safeParse(candidates[flat.op]);
  return parsed.success ? parsed.data : null;
}

/** Zod to JSON Schema, minus the `$schema` marker the Gemini API does not accept. */
export function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

export type GuardVerdict = z.infer<typeof guardVerdictSchema>;
export type Understanding = z.infer<typeof understandingSchema>;
