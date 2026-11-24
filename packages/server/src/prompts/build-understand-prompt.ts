/** The understand prompt: one message read into memory changes and hints. */
import {
  ACTIVITIES,
  DAYS,
  PERIODS,
  AGE_GROUPS,
  HEALTH_CONDITIONS,
  HOME_FEATURES,
  memoryChips,
  type ChatTurn,
  type Memory,
} from '@vayu/core';
import type { LlmRequest } from '../llm/llm-client.js';
import { toResponseSchema, understandingSchema } from '../validation/model-schemas.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/**
 * The first model call: read one message into structured facts. It decides
 * nothing about the air; it only says what the family told us and asked.
 */
const UNDERSTAND_INSTRUCTION = [
  'You read messages sent to Vayu Mitra, a clean-air assistant for Indian families during winter smog. Messages may be in English, Hindi or Hinglish.',
  'Return:',
  '- memoryChanges: only facts the family stated about their own household, never guesses.',
  `  remember-person: someone in the household, by how they are called (label, e.g. "Dadi", "my son"), with ageGroup (${AGE_GROUPS.join(', ')}) and conditions (${HEALTH_CONDITIONS.join(', ')}). Never store real names unless that is how they refer to the person.`,
  `  remember-routine: something they do regularly: activity (${ACTIVITIES.join(', ')}), person (a label, or null for the family), time as HH:MM 24-hour or null, minutes or null.`,
  `  remember-home: something the home has: feature (${HOME_FEATURES.join(', ')}).`,
  '  forget: when they say something remembered is wrong or ask to forget it; id from the remembered list.',
  '  Fill only the fields that op uses; set the others to null.',
  `- activity: what they ask about doing now or soon, from the list (${ACTIVITIES.join(', ')}), or null.`,
  '- person: the label of who the question is about, or null.',
  '- time: when they plan to do it, HH:MM 24-hour, only if they give a clock time; else null.',
  `- period: ${PERIODS.join(', ')} when they name a part of the day instead of a clock time ("tomorrow morning", "subah", "shaam"), else null.`,
  `- day: ${DAYS.join(' or ')} when they say which day (Hindi "kal" about a plan means tomorrow, "aaj" today), or null.`,
  '- If the new message follows up an earlier question ("and tomorrow?", "I meant by car", "what about at 9?"), take the activity, person, time, day and period from the earlier turns and change only what the new message changes.',
  '- places: names of places other than their own that the message asks about, such as cities or areas to compare ("Is Gurgaon better than Ghaziabad?"), at most 3, as written; [] if none.',
  '- onTopic: false only if the message has nothing to do with air, pollution, health, weather, their household or plans. Questions about the air anywhere are on topic.',
  DATA_NOT_INSTRUCTIONS,
].join('\n');

/** The JSON Schema the understand call’s answer is constrained to. */
export const UNDERSTAND_RESPONSE_SCHEMA = toResponseSchema(understandingSchema);

/** Earlier turns, oldest first, each fenced: assistant turns can quote the family. */
export const formatHistory = (history: readonly ChatTurn[]): string =>
  history.length === 0
    ? '(none)'
    : history.map((turn) => `${turn.role}:\n${fenceUntrusted(turn.text)}`).join('\n');

/** The understand call for one message. */
export function buildUnderstandRequest(
  message: string,
  history: readonly ChatTurn[],
  memory: Memory,
): LlmRequest {
  const remembered = memoryChips(memory).map((chip) => ({ id: chip.id, fact: chip.label }));
  return {
    purpose: 'understand',
    systemInstruction: UNDERSTAND_INSTRUCTION,
    prompt: [
      `Remembered about this household: ${JSON.stringify(remembered)}`,
      `Earlier in the conversation:\n${formatHistory(history)}`,
      `New message:\n${fenceUntrusted(message)}`,
    ].join('\n\n'),
    schema: UNDERSTAND_RESPONSE_SCHEMA,
    temperature: 0,
  };
}
