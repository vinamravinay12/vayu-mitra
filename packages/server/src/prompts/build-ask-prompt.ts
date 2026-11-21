import type { Language } from '@vayu/core';
import type { PlanFacts } from '../coach/plan-facts.js';
import type { LlmRequest } from '../llm/llm-client.js';
import { askResponseSchema, toResponseSchema } from '../validation/schemas.js';
import { GROUNDING_RULES, LANGUAGE_RULES } from './build-coach-prompt.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/** JSON Schema an answer is decoded against. */
export const ASK_RESPONSE_SCHEMA = toResponseSchema(askResponseSchema);

/** The instruction for answering one question about the family's own plan. */
function askInstruction(language: Language): string {
  return [
    'You are Vayu Mitra, a practical clean-air coach. A family asks a question about smog, their home, their routine or their plan.',
    'Answer from FACTS only, in at most 120 words, specifically for this family.',
    DATA_NOT_INSTRUCTIONS,
    GROUNDING_RULES,
    LANGUAGE_RULES[language],
    'If FACTS do not cover the question, say what the plan does cover instead of guessing.',
    'Set onTopic to false, and answer in one sentence that you can help with smog and their plan, if the question is about something else.',
  ].join('\n');
}

/** The answer call for one question. Both the facts and the question are fenced. */
export function buildAskRequest(
  facts: PlanFacts,
  question: string,
  language: Language,
): LlmRequest {
  return {
    purpose: 'ask',
    systemInstruction: askInstruction(language),
    prompt: `FACTS:\n${fenceUntrusted(JSON.stringify(facts))}\n\nQUESTION:\n${fenceUntrusted(question)}`,
    schema: ASK_RESPONSE_SCHEMA,
    temperature: 0.2,
  };
}
