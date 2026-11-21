import { profileDraftSchema, PROFILE_LIMITS } from '@vayu/core';
import type { LlmRequest } from '../llm/llm-client.js';
import { toResponseSchema } from '../validation/schemas.js';
import { DATA_NOT_INSTRUCTIONS, fenceUntrusted } from './fence-untrusted.js';

/**
 * The extractor reads a family's own description into the closed vocabulary.
 * It only reads; it never advises. Every value it may choose is an enum in
 * the response schema, and the engine re-checks every value again afterwards.
 */
const EXTRACTION_INSTRUCTION = [
  'You read a family’s description of their household and daily life during winter smog, and fill in a structured profile. You only extract; you never advise.',
  DATA_NOT_INSTRUCTIONS,
  'Use null for anything not stated or clearly implied. Never guess health conditions.',
  `members: one entry per person, at most ${String(PROFILE_LIMITS.maxMembers)}. "Family of four with two kids" means two adults and two children. The person writing is "You"; name everyone else by their name or role ("Father", "Grandmother", "Child 1"), at most ${String(PROFILE_LIMITS.maxNameLength)} characters.`,
  'ageGroup: infant (under 2), child (2–12), teen (13–17), adult, senior (60+). Parents of school children are adults; grandparents are seniors.',
  'daytime: school, office (any indoor workplace or college), home, or outdoors (outdoor jobs such as delivery, street vending, construction, traffic duty).',
  'commuteMode and commuteKm (one way) only for people who leave home. "Scooter" or "bike" is two-wheeler; "cab" is car-petrol unless a fuel is named.',
  'outdoorExercise: light (walks, yoga in the park) or vigorous (running, cricket, sport cycling). exerciseHour is the local hour 0–23; "morning walk" with no time is 6, "evening" is 18.',
  'home.tightness: leaky for old or draughty windows, sealed for new airtight (UPVC) windows. ventilation: when windows are usually open. hasKitchenExhaust: a chimney or exhaust fan.',
  'heating: angithi, bukhari, coal or wood fires are coal-or-wood; room heaters, blowers and oil radiators are electric. indoorSources: agarbatti or dhoop is incense; a mosquito coil is mosquito-coil; diyas count as candles.',
  'lifestyle: burnsWaste if they or their society burn leaves or garbage; generatorHoursPerWeek for a diesel generator (DG set); transitNearby if a metro or reliable bus is within walking distance; communityHouseholds for the number of homes in their society or colony.',
  'placeQuery: the city and neighbourhood they live in, as written, or null.',
].join('\n');

/** JSON Schema the extraction is decoded against. */
export const EXTRACTION_RESPONSE_SCHEMA = toResponseSchema(profileDraftSchema);

/** The extraction call for one description. */
export function buildExtractionRequest(description: string): LlmRequest {
  return {
    purpose: 'extract',
    systemInstruction: EXTRACTION_INSTRUCTION,
    prompt: `Extract the household profile from this description:\n${fenceUntrusted(description)}`,
    schema: EXTRACTION_RESPONSE_SCHEMA,
    temperature: 0,
  };
}
