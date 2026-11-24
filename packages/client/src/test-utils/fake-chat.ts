/** The fake server’s chat turn, answered by the real engine over the fixture report. */
import {
  adviseActivity,
  applyChanges,
  describeAdvice,
  describeAir,
  readIntent,
  suggestQuestions,
  type ChatRequest,
} from '@vayu/core';
import type { FakeServer } from './fake-state.js';
import { makeReport } from './fixtures.js';

/** One chat turn, answered by the real engine over the fixture report. */
export function chat(server: FakeServer, request: ChatRequest) {
  const report = makeReport();
  const memory = applyChanges(server.household.memory, server.understood);
  server.understood = [];
  server.household = { ...server.household, memory };
  const intent = readIntent(request.message, memory);
  const now = new Date('2026-11-22T04:30:00Z');
  const advice =
    intent === null
      ? null
      : adviseActivity({ ...intent, report, now, home: memory.home.map((fact) => fact.feature) });
  return {
    reply: advice === null ? describeAir(report) : describeAdvice(advice, report),
    advice,
    memory,
    suggestions: suggestQuestions(memory),
    source: 'engine',
  };
}
