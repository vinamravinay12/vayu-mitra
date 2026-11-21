import { Router, type Response } from 'express';
import type { AirService } from '../air/air-service.js';
import { answerQuestion } from '../coach/answer-question.js';
import { coachPlan, type CoachDependencies } from '../coach/coach-plan.js';
import { askRequestSchema, planRequestSchema } from '../validation/schemas.js';
import { respondToUpstreamError } from './air.js';
import { respondToLlmError } from './llm-errors.js';
import { loadPlan, profileLooksUnsafe } from './load-plan.js';

/** Shown when an answer could not be checked against the plan. */
export const UNVERIFIED_ANSWER =
  'I could not give an answer I can check against your plan. Try asking about today’s hours, your chosen actions or your family’s exposure.';

/** The message for text that tries to instruct the AI. */
const REJECTED = {
  error: 'That reads like instructions to an AI. Ask about your air, your home or your plan.',
};

/** Maps a failure to a response; rethrows anything unexpected. */
function handleFailure(cause: unknown, response: Response): void {
  if (!respondToUpstreamError(cause, response) && !respondToLlmError(cause, response)) {
    throw cause;
  }
}

/** POST /api/coach and POST /api/ask — the AI coach's explanation and answers. */
export function coachRouter(
  dependencies: CoachDependencies & { readonly air: AirService },
  now: () => Date,
): Router {
  const router = Router();
  router.post('/coach', async (request, response) => {
    const parsed = planRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'The household profile is incomplete or invalid.' });
      return;
    }
    if (profileLooksUnsafe(parsed.data.profile)) {
      response.status(422).json(REJECTED);
      return;
    }
    try {
      const plan = await loadPlan(dependencies.air, parsed.data, now());
      response.json(await coachPlan(dependencies, plan, parsed.data.language));
    } catch (cause) {
      handleFailure(cause, response);
    }
  });
  router.post('/ask', async (request, response) => {
    const parsed = askRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Ask a question of 5 to 300 characters.' });
      return;
    }
    if (profileLooksUnsafe(parsed.data.profile)) {
      response.status(422).json(REJECTED);
      return;
    }
    try {
      const plan = await loadPlan(dependencies.air, parsed.data, now());
      const outcome = await answerQuestion(
        dependencies.llm,
        plan,
        parsed.data.question,
        parsed.data.language,
      );
      if (outcome.status === 'rejected') {
        response.status(422).json(REJECTED);
        return;
      }
      response.json(
        outcome.status === 'answered'
          ? { answer: outcome.answer, onTopic: outcome.onTopic, verified: true }
          : { answer: UNVERIFIED_ANSWER, onTopic: true, verified: false },
      );
    } catch (cause) {
      handleFailure(cause, response);
    }
  });
  return router;
}
