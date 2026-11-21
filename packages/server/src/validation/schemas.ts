import { LANGUAGES, profileSchema } from '@vayu/core';
import { z } from 'zod';

/**
 * Every boundary the server has, as Zod schemas: requests from the browser,
 * answers from Gemini. Response schemas double as the JSON Schema Gemini
 * decodes against, so the model cannot produce a field the server does not know.
 */

/** Accepted lengths, in characters, for free text from the browser. */
export const TEXT_LIMITS = {
  descriptionMin: 15,
  descriptionMax: 2000,
  questionMin: 5,
  questionMax: 300,
  placeQueryMin: 2,
  placeQueryMax: 80,
} as const;

/** Most actions a family can choose at once (the catalogue has 20). */
const MAX_CHOICES = 25;

// ---- Requests from the browser ------------------------------------------------

export const extractRequestSchema = z.object({
  description: z.string().trim().min(TEXT_LIMITS.descriptionMin).max(TEXT_LIMITS.descriptionMax),
});

export const placesQuerySchema = z.object({
  q: z.string().trim().min(TEXT_LIMITS.placeQueryMin).max(TEXT_LIMITS.placeQueryMax),
});

/** Query-string coordinates arrive as text. */
export const airQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** A plan request: the server rebuilds the plan itself rather than trusting the browser's numbers. */
export const planRequestSchema = z.object({
  profile: profileSchema,
  chosenIds: z.array(z.string().max(60)).max(MAX_CHOICES),
  language: z.enum(LANGUAGES),
});

export const askRequestSchema = planRequestSchema.extend({
  question: z.string().trim().min(TEXT_LIMITS.questionMin).max(TEXT_LIMITS.questionMax),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;
export type AskRequest = z.infer<typeof askRequestSchema>;

// ---- Responses from the model -------------------------------------------------

/** The injection judge's answer. */
export const guardVerdictSchema = z.object({
  verdict: z.enum(['safe', 'manipulation']),
  reason: z.string().max(200),
});

/** How long the coach's text may be. */
export const COACH_LIMITS = { headline: 120, summary: 900, why: 300, priorities: 3 } as const;

/** The coach's answer; `actionId` is limited to the actions in this family's plan. */
export function coachResponseSchema(actionIds: readonly [string, ...string[]]) {
  return z.object({
    headline: z.string().min(5).max(COACH_LIMITS.headline),
    summary: z.string().min(20).max(COACH_LIMITS.summary),
    priorities: z
      .array(
        z.object({ actionId: z.enum(actionIds), why: z.string().min(5).max(COACH_LIMITS.why) }),
      )
      .max(COACH_LIMITS.priorities),
  });
}

/** How long an answer may be. */
export const ASK_LIMITS = { answer: 900 } as const;

/** The answer to a family's question about their plan. */
export const askResponseSchema = z.object({
  onTopic: z.boolean(),
  answer: z.string().min(5).max(ASK_LIMITS.answer),
});

/** Zod to JSON Schema, minus the `$schema` marker the Gemini API does not accept. */
export function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

export type GuardVerdict = z.infer<typeof guardVerdictSchema>;
export type CoachResponse = z.infer<ReturnType<typeof coachResponseSchema>>;
export type AskResponse = z.infer<typeof askResponseSchema>;
