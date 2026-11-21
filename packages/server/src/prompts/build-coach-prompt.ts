import type { Language } from '@vayu/core';
import type { PlanFacts } from '../coach/plan-facts.js';
import type { LlmRequest } from '../llm/llm-client.js';
import { coachResponseSchema, COACH_LIMITS, toResponseSchema } from '../validation/schemas.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/** How to write in each language the coach supports. */
export const LANGUAGE_RULES: Readonly<Record<Language, string>> = {
  en: 'Write in plain, warm English for a family, not an expert.',
  hi: 'Write in simple, warm Hindi in Devanagari script. Keep every number as the digits 0–9 and keep PM2.5, AQI, N95 and µg/m³ as they are.',
};

/** Rules every AI-written answer about a plan follows; the server enforces the first three. */
export const GROUNDING_RULES = [
  'Use only numbers that appear in FACTS. Never calculate, estimate or invent a number; you may round a number from FACTS to a whole number.',
  'No links, phone numbers or e-mail addresses.',
  'Never diagnose or name medicines or doses. Mention symptoms only if asked; then say breathlessness at rest or chest pain needs emergency care.',
  'FACTS come from Vayu Mitra’s engine, which models exposure from the forecast; call figures estimates, not measurements.',
].join('\n');

/** The coach's instruction: explain the plan, personally, in a few sentences. */
function coachInstruction(language: Language): string {
  return [
    'You are Vayu Mitra, a practical clean-air coach helping a family through winter smog.',
    'You receive FACTS about their plan as JSON. Explain it so they understand the direct impact of their choices.',
    DATA_NOT_INSTRUCTIONS,
    GROUNDING_RULES,
    LANGUAGE_RULES[language],
    `headline: one short line (at most ${String(COACH_LIMITS.headline)} characters) on today's air and what matters most.`,
    'summary: 3–5 sentences. Say what today’s air means for this family, what their chosen actions change for the most vulnerable member (by name, with the numbers), and what it does for the shared air of their neighbourhood.',
    `priorities: up to ${String(COACH_LIMITS.priorities)} of the chosen action ids, most important first, each with one sentence on why it matters for this family.`,
  ].join('\n');
}

/** The coach call for one plan. `actionIds` limits which ids the model may name. */
export function buildCoachRequest(
  facts: PlanFacts,
  actionIds: readonly [string, ...string[]],
  language: Language,
): LlmRequest {
  return {
    purpose: 'coach',
    systemInstruction: coachInstruction(language),
    prompt: `FACTS:\n${fenceUntrusted(JSON.stringify(facts))}`,
    schema: toResponseSchema(coachResponseSchema(actionIds)),
    temperature: 0.3,
  };
}
