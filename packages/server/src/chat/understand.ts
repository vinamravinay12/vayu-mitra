import type { ChatTurn, IntentHints, Memory, MemoryChange } from '@vayu/core';
import { describeCause, logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { buildUnderstandRequest } from '../prompts/build-understand-prompt.js';
import { parseJson } from '../prompts/parse-json.js';
import { toMemoryChange, understandingSchema } from '../validation/model-schemas.js';

/** What the first call understood; empty when the model is off or fails. */
export interface Understood {
  readonly changes: readonly MemoryChange[];
  readonly hints: IntentHints;
  /** Other places the message asks about. */
  readonly places: readonly string[];
  readonly onTopic: boolean;
}

/** With no understanding, the engine's keyword reading takes over and nothing is remembered. */
export const NOT_UNDERSTOOD: Understood = {
  changes: [],
  hints: { activity: null, person: null, time: null, day: null, period: null },
  places: [],
  onTopic: true,
};

/**
 * Reads a message into memory changes and hints. A failed or off-schema
 * answer is logged and treated as no understanding: the family still gets an
 * answer from keywords, it just is not remembered this turn.
 */
export async function understand(
  llm: LlmClient | null,
  { message, history }: { readonly message: string; readonly history: readonly ChatTurn[] },
  memory: Memory,
): Promise<Understood> {
  if (llm === null) {
    return NOT_UNDERSTOOD;
  }
  try {
    const raw = await llm.generate(buildUnderstandRequest(message, history, memory));
    const parsed = understandingSchema.safeParse(parseJson(raw));
    if (!parsed.success) {
      logEvent('WARNING', 'understand answered off-schema');
      return NOT_UNDERSTOOD;
    }
    const { memoryChanges, activity, person, time, day, period, places, onTopic } = parsed.data;
    return {
      changes: memoryChanges.flatMap((flat) => toMemoryChange(flat) ?? []),
      hints: { activity, person, time, day, period },
      places,
      onTopic,
    };
  } catch (cause) {
    logEvent('WARNING', 'understand unavailable; keywords only', { cause: describeCause(cause) });
    return NOT_UNDERSTOOD;
  }
}
