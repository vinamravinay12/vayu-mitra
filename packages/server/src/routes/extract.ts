import { Router } from 'express';
import { extractProfile, type ExtractDependencies } from '../extract/extract-profile.js';
import { extractRequestSchema, TEXT_LIMITS } from '../validation/schemas.js';
import { respondToLlmError } from './llm-errors.js';

/** POST /api/extract — reads a family's description into a profile to review. */
export function extractRouter(dependencies: ExtractDependencies): Router {
  const router = Router();
  router.post('/extract', async (request, response) => {
    const parsed = extractRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: `Describe your household in ${String(TEXT_LIMITS.descriptionMin)} to ${String(TEXT_LIMITS.descriptionMax)} characters.`,
      });
      return;
    }
    try {
      const outcome = await extractProfile(dependencies, parsed.data.description);
      if (outcome.status === 'rejected') {
        response.status(422).json({
          error:
            'That reads like instructions to an AI rather than a description of your household. Describe your family in your own words, or fill in the form.',
        });
        return;
      }
      response.json(outcome.profile);
    } catch (cause) {
      if (!respondToLlmError(cause, response)) {
        throw cause;
      }
    }
  });
  return router;
}
