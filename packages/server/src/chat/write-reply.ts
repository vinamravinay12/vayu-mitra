/** The second model call: the engine’s facts worded, or the engine’s own sentence. */
import type { ChatTurn } from '@vayu/core';
import { describeCause, logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { buildReplyRequest, type ReplyFacts } from '../prompts/build-reply-prompt.js';
import { parseJson } from '../prompts/parse-json.js';
import { replySchema } from '../validation/model-schemas.js';
import { allowedNumbers, outputViolations } from './check-grounding.js';

/** The reply and who wrote it. */
export interface WrittenReply {
  readonly text: string;
  readonly source: 'ai' | 'engine';
}

/**
 * The AI's wording of the facts, if it stays within them; otherwise the
 * engine's own sentence. An AI reply with a number the facts do not contain,
 * a link, or text that reads like instructions is never shown.
 */
export async function writeReply(
  llm: LlmClient | null,
  turn: { readonly message: string; readonly history: readonly ChatTurn[] },
  { facts, engineText }: { readonly facts: ReplyFacts; readonly engineText: string },
): Promise<WrittenReply> {
  const fallback: WrittenReply = { text: engineText, source: 'engine' };
  if (llm === null) {
    return fallback;
  }
  try {
    const parsed = replySchema.safeParse(
      parseJson(await llm.generate(buildReplyRequest(turn.message, turn.history, facts))),
    );
    if (!parsed.success) {
      logEvent('WARNING', 'reply answered off-schema; engine reply used');
      return fallback;
    }
    const violations = outputViolations([parsed.data.reply], allowedNumbers(facts));
    if (violations.length > 0) {
      logEvent('WARNING', 'reply rejected; engine reply used', { violations });
      return fallback;
    }
    return { text: parsed.data.reply, source: 'ai' };
  } catch (cause) {
    logEvent('WARNING', 'reply unavailable; engine reply used', { cause: describeCause(cause) });
    return fallback;
  }
}
