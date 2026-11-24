import { EMPTY_MEMORY } from '@vayu/core';
import { describe, expect, it } from 'vitest';
import { newUserRecord } from '../store/user-record.js';
import {
  DADI_UNDERSTOOD,
  fakeLlm,
  NOTHING_UNDERSTOOD,
  NOW,
  SAFE_VERDICT,
} from '../test-utils/fake-llm.js';
import { testDeps } from '../test-utils/deps.js';
import { runChat } from './run-chat.js';
import { ask } from './chat.fixtures.js';

describe('runChat', () => {
  const llmFor = (understood: string, reply = 'Dadi should walk at 2 pm instead.') =>
    fakeLlm({
      guard: SAFE_VERDICT,
      understand: understood,
      reply: JSON.stringify({ reply }),
    });
  it('does not present what was already known as new on a later turn', async () => {
    const deps = testDeps();
    await runChat({ ...deps, llm: llmFor(DADI_UNDERSTOOD) }, 'u1', ask('Dadi walks at 6:30'));
    const llm = llmFor(DADI_UNDERSTOOD);
    await runChat({ ...deps, llm }, 'u1', ask('Is it advisable to walk in the morning?'));
    const prompt = llm.requests.find((r) => r.purpose === 'reply')?.prompt ?? '';
    const facts = JSON.parse(prompt.split('\n')[0]?.slice(7) ?? '{}');
    expect(facts.newlyRemembered).toEqual([]);
    expect(facts.alreadyKnown).toHaveLength(2);
  });
  it('answers about the air when there is no activity', async () => {
    const response = await runChat({ ...testDeps(), llm: null }, 'u1', ask('How bad is it today?'));
    expect(response).toMatchObject({ advice: null, source: 'engine' });
    expect(response.reply).toMatch(/^Right now the air is /);
  });
});

describe('runChat', () => {
  it('uses what the home has in the advice', async () => {
    const deps = testDeps();
    await deps.store.put('u1', {
      ...newUserRecord(NOW()),
      memory: {
        ...EMPTY_MEMORY,
        people: [
          { kind: 'person', id: 'person:dadi', label: 'Dadi', ageGroup: 'senior', conditions: [] },
        ],
        home: [{ kind: 'home', id: 'home:n95-masks', feature: 'n95-masks' }],
      },
    });
    const response = await runChat({ ...deps, llm: null }, 'u1', ask('Can Dadi go for a walk?'));
    expect(response.advice?.tips).toContain('wear-n95');
  });
});

describe('runChat', () => {
  const llmFor = (understood: string, reply = 'Dadi should walk at 2 pm instead.') =>
    fakeLlm({
      guard: SAFE_VERDICT,
      understand: understood,
      reply: JSON.stringify({ reply }),
    });
  it('tells the reply when a message is off topic', async () => {
    const offTopic = JSON.stringify({ ...JSON.parse(NOTHING_UNDERSTOOD), onTopic: false });
    const llm = llmFor(offTopic, 'I can help with the air and your family plans.');
    const response = await runChat({ ...testDeps(), llm }, 'u1', ask('Tell me a joke'));
    expect(response.source).toBe('ai');
    const prompt = llm.requests.find((r) => r.purpose === 'reply')?.prompt ?? '';
    expect(prompt).toContain('"onTopic":false');
  });
});
