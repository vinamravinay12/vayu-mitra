/** One turn of the conversation, from screening the message to saving what was learnt. */
import {
  adviseActivity,
  applyChanges,
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
import { answer } from './answer.js';
import { understand, type Understood } from './understand.js';

/** What a chat turn needs: the model, the air, the store and the clock. */
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
  const gathered = await gather(deps, request, record.memory);
  if (gathered === null) return refusal(record.memory);
  const { report, understood } = gathered;
  const memory = applyChanges(record.memory, understood.changes);
  const advice = adviceFor({ request, memory, understood }, report, now);
  const parts = { report, advice, understood, before: record.memory, memory };
  const reply = await answer(deps, request, parts);
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

/**
 * Screens the message and, in parallel with the judge, fetches the air and
 * reads the message. Null when either screen refuses it.
 */
async function gather(
  deps: ChatDependencies,
  request: ChatRequest,
  memory: Memory,
): Promise<{ report: AirReport; understood: Understood } | null> {
  if (!screenHeuristic(request.message).safe) {
    logEvent('WARNING', 'chat message refused', { judgedBy: 'heuristic' });
    return null;
  }
  const [verdict, report, understood] = await Promise.all([
    screen(deps.llm, request.message),
    deps.air.report(request.place.latitude, request.place.longitude),
    understand(deps.llm, request, memory),
  ]);
  if (!verdict.safe) {
    logEvent('WARNING', 'chat message refused', { judgedBy: verdict.judgedBy });
    return null;
  }
  return { report, understood };
}

/** The engine's advice for what the message asks, or null when it names no activity. */
function adviceFor(
  turn: { readonly request: ChatRequest; readonly memory: Memory; readonly understood: Understood },
  report: AirReport,
  now: Date,
): ActivityAdvice | null {
  const { request, memory, understood } = turn;
  const intent = readIntent(request.message, memory, {
    hints: understood.hints,
    previous: previousQuestion(request),
  });
  const home = memory.home.map((fact) => fact.feature);
  return intent === null ? null : adviseActivity({ ...intent, report, now, home });
}
