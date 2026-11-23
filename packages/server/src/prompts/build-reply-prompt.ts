import type { ChatTurn } from '@vayu/core';
import type { LlmRequest } from '../llm/llm-client.js';
import { formatHistory } from './build-understand-prompt.js';
import { replySchema, toResponseSchema } from '../validation/model-schemas.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/** The facts the reply may use, all computed by the engine. */
export interface ReplyFacts {
  /** The air at the family's own place. */
  readonly air: string;
  /** The air now in other places the message asked about, one line each. */
  readonly otherPlaces: readonly string[];
  /** The engine's verdict in words, when the message asked about an activity. */
  readonly advice: string | null;
  readonly remembered: readonly string[];
  readonly justRemembered: readonly string[];
  readonly onTopic: boolean;
}

/**
 * The second model call: put the engine's facts into a short, kind reply in
 * the family's own language. It may rephrase and order; it may not add.
 */
const REPLY_INSTRUCTION = [
  'You are Vayu Mitra, a warm, practical clean-air coach for Indian families during winter smog, in the middle of a conversation.',
  'Answer the new message using only the facts given. Every number you write must appear in the facts; never estimate, never add an AQI, a time or a percentage of your own.',
  'Read the earlier turns. Answer the question actually being asked now: if the family corrects or narrows an earlier question ("I meant by car", "I am asking about tomorrow"), say briefly that you have it and answer the corrected question.',
  "If there is advice, lead with its verdict and its day and time, then the one or two precautions that matter most. If the message asks about other places, answer from otherPlaces: say each one's air now and which is cleaner. Otherwise answer from the air facts.",
  'Do not repeat precautions or sentences you already gave in an earlier turn unless the advice changed; say only what is new.',
  'If something was just remembered, confirm it from your side in a few words, such as "Noted: you have a car.", so they can correct it.',
  'If the message is off topic, say briefly what you can help with.',
  'Reply in the language and script of the new message (English, Hindi or Hinglish). Two to five short sentences, plain text, no lists, no links.',
  'You are not a doctor: for symptoms such as breathlessness or chest pain, tell them to seek medical care.',
  DATA_NOT_INSTRUCTIONS,
].join('\n');

export const REPLY_RESPONSE_SCHEMA = toResponseSchema(replySchema);

/** The reply call for one message, the turns before it, and its facts. */
export function buildReplyRequest(
  message: string,
  history: readonly ChatTurn[],
  facts: ReplyFacts,
): LlmRequest {
  return {
    purpose: 'reply',
    systemInstruction: REPLY_INSTRUCTION,
    prompt: [
      `Facts: ${JSON.stringify(facts)}`,
      `Earlier in the conversation:\n${formatHistory(history)}`,
      `New message:\n${fenceUntrusted(message)}`,
    ].join('\n\n'),
    schema: REPLY_RESPONSE_SCHEMA,
    temperature: 0.3,
  };
}
