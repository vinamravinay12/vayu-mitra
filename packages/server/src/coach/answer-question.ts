import type { CleanAirPlan, Language } from '@vayu/core';
import { judgeWithLlm, screenHeuristic } from '../guard/screen-input.js';
import { logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { buildAskRequest } from '../prompts/build-ask-prompt.js';
import { parseJson } from '../prompts/parse-json.js';
import { askResponseSchema } from '../validation/schemas.js';
import { allowedNumbers, outputViolations } from './check-grounding.js';
import { planFacts } from './plan-facts.js';

/** The result of asking a question about the plan. */
export type AskOutcome =
  | { readonly status: 'answered'; readonly answer: string; readonly onTopic: boolean }
  | { readonly status: 'rejected' }
  | { readonly status: 'unverified' };

/**
 * Answers a family's free-text question, grounded in their plan.
 *
 * The question is screened by patterns first, then by the LLM judge in
 * parallel with the answer. An answer that cites a number the engine did not
 * produce, or carries links or instructions, is withheld rather than shown.
 */
export async function answerQuestion(
  llm: LlmClient,
  plan: CleanAirPlan,
  question: string,
  language: Language,
): Promise<AskOutcome> {
  if (!screenHeuristic(question).safe) {
    logEvent('WARNING', 'question rejected by pattern screen');
    return { status: 'rejected' };
  }
  const facts = planFacts(plan);
  const [verdict, raw] = await Promise.all([
    judgeWithLlm(llm, question),
    llm.generate(buildAskRequest(facts, question, language)),
  ]);
  if (!verdict.safe) {
    logEvent('WARNING', 'question rejected by LLM judge');
    return { status: 'rejected' };
  }
  const parsed = askResponseSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    logEvent('WARNING', 'answer off-schema; withheld');
    return { status: 'unverified' };
  }
  const violations = outputViolations([parsed.data.answer], allowedNumbers(facts));
  if (violations.length > 0) {
    logEvent('WARNING', 'answer failed output checks; withheld', { violations });
    return { status: 'unverified' };
  }
  return { status: 'answered', answer: parsed.data.answer, onTopic: parsed.data.onTopic };
}
