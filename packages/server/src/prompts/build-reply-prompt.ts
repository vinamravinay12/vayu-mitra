import type { LlmRequest } from '../llm/llm-client.js';
import { replySchema, toResponseSchema } from '../validation/model-schemas.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/** The facts the reply may use, all computed by the engine. */
export interface ReplyFacts {
  readonly air: string;
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
  'You are Vayu Mitra, a warm, practical clean-air coach for Indian families during winter smog.',
  'Answer the new message using only the facts given. Every number you write must appear in the facts; never estimate, never add an AQI, a time or a percentage of your own.',
  'If there is advice, lead with its verdict and the time, then the one or two precautions that matter most. If not, answer from the air facts.',
  'If something was just remembered, say so in a few words so they can correct it.',
  'If the message is off topic, say briefly what you can help with.',
  'Reply in the language and script of the new message (English, Hindi or Hinglish). Two to five short sentences, plain text, no lists, no links.',
  'You are not a doctor: for symptoms such as breathlessness or chest pain, tell them to seek medical care.',
  DATA_NOT_INSTRUCTIONS,
].join('\n');

export const REPLY_RESPONSE_SCHEMA = toResponseSchema(replySchema);

/** The reply call for one message and its facts. */
export function buildReplyRequest(message: string, facts: ReplyFacts): LlmRequest {
  return {
    purpose: 'reply',
    systemInstruction: REPLY_INSTRUCTION,
    prompt: `Facts: ${JSON.stringify(facts)}\n\nNew message:\n${fenceUntrusted(message)}`,
    schema: REPLY_RESPONSE_SCHEMA,
    temperature: 0.3,
  };
}
