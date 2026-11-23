import {
  adviseActivity,
  applyChanges,
  comparePlaces,
  describeAdvice,
  describeAir,
  describePlace,
  memoryChips,
  readIntent,
  suggestQuestions,
  type ActivityAdvice,
  type AirReport,
  type ChatRequest,
  type ChatResponse,
  type Memory,
} from '@vayu/core';
import type { AirService } from '../air/air-service.js';
import { judgeWithLlm, screenHeuristic, type ScreenResult } from '../guard/screen-input.js';
import { logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { newUserRecord } from '../store/user-record.js';
import type { UserStore } from '../store/user-store.js';
import { airElsewhere } from './other-places.js';
import { understand, type Understood } from './understand.js';
import { writeReply, type WrittenReply } from './write-reply.js';

export interface ChatDependencies {
  readonly llm: LlmClient | null;
  readonly air: AirService;
  readonly store: UserStore;
  readonly now: () => Date;
}

/** The answer to anything that tries to steer the assistant. */
export const REFUSAL =
  'I can help with the air where you live and your family’s plans around it, but not with that.';

/** The refusal turn: no advice, memory unchanged. */
const refusal = (memory: Memory): ChatResponse => ({
  reply: REFUSAL,
  advice: null,
  memory,
  suggestions: suggestQuestions(memory),
  source: 'engine',
});

/** The family's last message before this one, which a follow-up like "and tomorrow?" refers to. */
const previousQuestion = (request: ChatRequest): string | null =>
  [...request.history].reverse().find((turn) => turn.role === 'user')?.text ?? null;

/** The independent judge, when there is a model; the heuristic result otherwise. */
const screen = (llm: LlmClient | null, message: string): Promise<ScreenResult> =>
  llm === null
    ? Promise.resolve({ safe: true, judgedBy: 'heuristic' })
    : judgeWithLlm(llm, message);

/** What the reply is built from. */
interface AnswerParts {
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
async function answer(
  deps: ChatDependencies,
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
  return writeReply(deps.llm, request, facts, engineText);
}

/**
 * One turn of the conversation.
 *
 * The judge, the air report and the understand call run in parallel. Then the
 * engine, not the model, applies the memory changes, reads the intent and
 * decides the advice; the model only words it. Memory and place are saved
 * for the family, and the reply comes back with the advice card and chips.
 */
export async function runChat(
  deps: ChatDependencies,
  uid: string,
  request: ChatRequest,
): Promise<ChatResponse> {
  const now = deps.now();
  const record = (await deps.store.get(uid)) ?? newUserRecord(now);
  if (!screenHeuristic(request.message).safe) {
    logEvent('WARNING', 'chat message refused', { judgedBy: 'heuristic' });
    return refusal(record.memory);
  }
  const [verdict, report, understood] = await Promise.all([
    screen(deps.llm, request.message),
    deps.air.report(request.place.latitude, request.place.longitude),
    understand(deps.llm, request.message, request.history, record.memory),
  ]);
  if (!verdict.safe) {
    logEvent('WARNING', 'chat message refused', { judgedBy: verdict.judgedBy });
    return refusal(record.memory);
  }
  const memory = applyChanges(record.memory, understood.changes);
  const intent = readIntent(request.message, memory, understood.hints, previousQuestion(request));
  const advice =
    intent === null
      ? null
      : adviseActivity({
          ...intent,
          report,
          now,
          home: memory.home.map((fact) => fact.feature),
        });
  const reply = await answer(deps, request, {
    report,
    advice,
    understood,
    before: record.memory,
    memory,
  });
  await deps.store.put(uid, {
    ...record,
    memory,
    place: request.place,
    updatedAt: now.toISOString(),
  });
  return {
    reply: reply.text,
    advice,
    memory,
    suggestions: suggestQuestions(memory),
    source: reply.source,
  };
}
