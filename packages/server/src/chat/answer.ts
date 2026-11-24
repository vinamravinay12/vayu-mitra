import {
  comparePlaces,
  describeAdvice,
  describeAir,
  describePlace,
  memoryChips,
  type ActivityAdvice,
  type AirReport,
  type ChatRequest,
  type Memory,
} from '@vayu/core';
import type { AirService } from '../air/air-service.js';
import type { LlmClient } from '../llm/llm-client.js';
import { airElsewhere } from './other-places.js';
import type { Understood } from './understand.js';
import { writeReply, type WrittenReply } from './write-reply.js';

/** What the reply is built from. */
export interface AnswerParts {
  readonly report: AirReport;
  readonly advice: ActivityAdvice | null;
  readonly understood: Understood;
  readonly before: Memory;
  readonly memory: Memory;
}

/**
 * The reply: the advice, else other places asked about, else the air here,
 * worded by the model within the engine's facts, or by the engine itself.
 */
export async function answer(
  deps: { readonly llm: LlmClient | null; readonly air: AirService },
  request: ChatRequest,
  { report, advice, understood, before, memory }: AnswerParts,
): Promise<WrittenReply> {
  const elsewhere = await airElsewhere(deps.air, understood.places);
  const engineText =
    advice !== null
      ? describeAdvice(advice, report)
      : elsewhere.length > 0
        ? comparePlaces(elsewhere)
        : describeAir(report);
  const known = new Set(memoryChips(before).map((chip) => chip.label));
  const chips = memoryChips(memory).map((chip) => chip.label);
  const newlyRemembered = chips.filter((label) => !known.has(label));
  const facts = {
    air: describeAir(report),
    otherPlaces: elsewhere.map(describePlace),
    advice: advice === null ? null : describeAdvice(advice, report),
    newlyRemembered,
    alreadyKnown: chips.filter((label) => known.has(label)),
    onTopic: understood.onTopic || advice !== null || elsewhere.length > 0,
  };
  return writeReply(deps.llm, request, { facts, engineText });
}
