import {
  adviseActivity,
  applyChanges,
  describeAdvice,
  describeAir,
  memoryChips,
  readIntent,
  suggestQuestions,
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
import { understand } from './understand.js';
import { writeReply } from './write-reply.js';

export interface ChatDependencies {
  readonly llm: LlmClient | null;
  readonly air: AirService;
  readonly store: UserStore;
  readonly now: () => Date;
}

/** The answer to anything that tries to steer the assistant. */
export const REFUSAL =
  'I can help with the air where you live and your family’s plans around it, but not with that.';

const refusal = (memory: Memory): ChatResponse => ({
  reply: REFUSAL,
  advice: null,
  memory,
  suggestions: suggestQuestions(memory),
  source: 'engine',
});

/** The independent judge, when there is a model; the heuristic result otherwise. */
const screen = (llm: LlmClient | null, message: string): Promise<ScreenResult> =>
  llm === null
    ? Promise.resolve({ safe: true, judgedBy: 'heuristic' })
    : judgeWithLlm(llm, message);

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
  const intent = readIntent(request.message, memory, understood.hints);
  const advice =
    intent === null
      ? null
      : adviseActivity({
          ...intent,
          report,
          now,
          home: memory.home.map((fact) => fact.feature),
        });
  const engineText = advice === null ? describeAir(report) : describeAdvice(advice, report);
  const before = new Set(memoryChips(record.memory).map((chip) => chip.label));
  const chips = memoryChips(memory).map((chip) => chip.label);
  const reply = await writeReply(
    deps.llm,
    request.message,
    {
      air: describeAir(report),
      advice: advice === null ? null : describeAdvice(advice, report),
      remembered: chips,
      justRemembered: chips.filter((label) => !before.has(label)),
      onTopic: understood.onTopic || advice !== null,
    },
    engineText,
  );
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
