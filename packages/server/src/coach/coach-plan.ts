import type { CleanAirPlan, Language } from '@vayu/core';
import { cacheKey, type TtlCache } from '../cache/ttl-cache.js';
import { describeCause, logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { buildCoachRequest } from '../prompts/build-coach-prompt.js';
import { parseJson } from '../prompts/parse-json.js';
import { coachResponseSchema } from '../validation/schemas.js';
import { allowedNumbers, outputViolations } from './check-grounding.js';
import { engineSummary, type CoachSummary } from './engine-summary.js';
import { planFacts } from './plan-facts.js';

export interface CoachDependencies {
  readonly llm: LlmClient;
  readonly cache: TtlCache<CoachSummary>;
}

/** Asks Gemini for the summary and returns it only if it passes every check, else null. */
async function aiSummary(
  llm: LlmClient,
  plan: CleanAirPlan,
  language: Language,
): Promise<CoachSummary | null> {
  const [firstId, ...otherIds] = plan.chosenIds;
  if (firstId === undefined) {
    return null;
  }
  const facts = planFacts(plan);
  const raw = await llm.generate(buildCoachRequest(facts, [firstId, ...otherIds], language));
  const parsed = coachResponseSchema([firstId, ...otherIds]).safeParse(parseJson(raw));
  if (!parsed.success) {
    logEvent('WARNING', 'coach answered off-schema; using engine summary');
    return null;
  }
  const { headline, summary, priorities } = parsed.data;
  const violations = outputViolations(
    [headline, summary, ...priorities.map((item) => item.why)],
    allowedNumbers(facts),
  );
  if (violations.length > 0) {
    logEvent('WARNING', 'coach answer failed output checks; using engine summary', { violations });
    return null;
  }
  return { headline, summary, priorities, source: 'ai' };
}

/**
 * The personal explanation of a plan.
 *
 * Gemini writes it from the engine's facts; the server checks that the
 * answer's schema, numbers and content are all sound. If the model is down,
 * slow, off-schema or ungrounded, the family gets the engine's own summary
 * instead of an error: the explanation is never the thing that fails.
 */
export async function coachPlan(
  { llm, cache }: CoachDependencies,
  plan: CleanAirPlan,
  language: Language,
): Promise<CoachSummary> {
  const key = cacheKey(
    'coach',
    plan.place,
    plan.today.date,
    plan.chosenIds,
    plan.chosen.impact,
    language,
  );
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  try {
    const summary = (await aiSummary(llm, plan, language)) ?? engineSummary(plan);
    cache.set(key, summary);
    return summary;
  } catch (cause) {
    logEvent('WARNING', 'coach unavailable; using engine summary', { cause: describeCause(cause) });
    return engineSummary(plan);
  }
}
