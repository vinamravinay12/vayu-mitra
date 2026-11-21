import { describe, expect, it } from 'vitest';
import { planFacts } from '../coach/plan-facts.js';
import { planFor } from '../test-utils/plans.js';
import { buildAskRequest } from './build-ask-prompt.js';
import { buildCoachRequest } from './build-coach-prompt.js';
import { buildExtractionRequest, EXTRACTION_RESPONSE_SCHEMA } from './build-extraction-prompt.js';
import { buildGuardRequest } from './build-guard-prompt.js';

const facts = planFacts(planFor());

describe('prompts', () => {
  it('fence untrusted text and constrain every answer with a schema', () => {
    for (const request of [
      buildGuardRequest('text'),
      buildExtractionRequest('text'),
      buildCoachRequest(facts, ['bedroom-purifier'], 'en'),
      buildAskRequest(facts, 'Can we walk?', 'hi'),
    ]) {
      expect(request.prompt).toContain('<<<UNTRUSTED_USER_TEXT>>>');
      expect(request.schema).toHaveProperty('type', 'object');
      expect(request.schema).not.toHaveProperty('$schema');
    }
  });

  it('keep the extraction schema to closed vocabularies', () => {
    const text = JSON.stringify(EXTRACTION_RESPONSE_SCHEMA);
    expect(text).toContain('"coal-or-wood"');
    expect(text).toContain('"mosquito-coil"');
  });

  it('set the language and grounding rules', () => {
    expect(buildCoachRequest(facts, ['x'], 'hi').systemInstruction).toContain('Devanagari');
    expect(buildAskRequest(facts, 'q', 'en').systemInstruction).toContain(
      'Use only numbers that appear in FACTS',
    );
    expect(buildAskRequest(facts, 'q', 'en').prompt).toContain('QUESTION:');
  });
});
