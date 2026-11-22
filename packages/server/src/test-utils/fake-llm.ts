import type { LlmClient, LlmPurpose, LlmRequest } from '../llm/llm-client.js';

type Responder = string | Error | ((request: LlmRequest) => string);

/**
 * A scripted model: each purpose answers with a fixed string, a thrown error,
 * or a function of the request. Every request is recorded for assertions.
 */
export function fakeLlm(responses: Partial<Record<LlmPurpose, Responder>>): LlmClient & {
  readonly requests: LlmRequest[];
} {
  const requests: LlmRequest[] = [];
  return {
    requests,
    generate(request) {
      requests.push(request);
      const responder = responses[request.purpose];
      if (responder === undefined) {
        return Promise.reject(new Error(`No scripted response for ${request.purpose}`));
      }
      if (responder instanceof Error) {
        return Promise.reject(responder);
      }
      return Promise.resolve(typeof responder === 'function' ? responder(request) : responder);
    },
  };
}

export const SAFE_VERDICT = JSON.stringify({ verdict: 'safe', reason: 'Describes a household.' });
export const UNSAFE_VERDICT = JSON.stringify({
  verdict: 'manipulation',
  reason: 'Asks for hidden rules.',
});

/** An understand answer with nothing to remember and no activity. */
export const NOTHING_UNDERSTOOD = JSON.stringify({
  memoryChanges: [],
  activity: null,
  person: null,
  time: null,
  onTopic: true,
});

/** A flat memory change with every field null but the op, for building answers. */
export const flatChange = (fields: Record<string, unknown>) => ({
  op: 'remember-home',
  label: null,
  ageGroup: null,
  conditions: null,
  activity: null,
  person: null,
  time: null,
  minutes: null,
  feature: null,
  id: null,
  ...fields,
});

/** What the understand call returned for "Dadi has asthma and walks at 6:30 every morning, is it ok today?" in probing. */
export const DADI_UNDERSTOOD = JSON.stringify({
  memoryChanges: [
    flatChange({
      op: 'remember-person',
      label: 'Dadi',
      ageGroup: 'senior',
      conditions: ['asthma'],
    }),
    flatChange({ op: 'remember-routine', activity: 'walk', person: 'Dadi', time: '06:30' }),
  ],
  activity: 'walk',
  person: 'Dadi',
  time: null,
  onTopic: true,
});

/** 10:00 IST on 22 November 2026. */
export const NOW = (): Date => new Date('2026-11-22T04:30:00Z');
