import { describe, expect, it } from 'vitest';
import { REPLY_RESPONSE_SCHEMA } from '../prompts/build-reply-prompt.js';
import { DADI_UNDERSTOOD, fakeLlm, SAFE_VERDICT } from '../test-utils/fake-llm.js';
import { DELHI, testDeps } from '../test-utils/deps.js';
import { runChat } from './run-chat.js';
import { writeReply } from './write-reply.js';
import { ask, TURN, FACTS } from './chat.fixtures.js';

describe('writeReply', () => {
  it('uses the AI wording when it stays within the facts', async () => {
    const llm = fakeLlm({ reply: JSON.stringify({ reply: 'It is AQI 250 now, stay in.' }) });
    expect(await writeReply(llm, TURN, { facts: FACTS, engineText: 'engine' })).toEqual({
      text: 'It is AQI 250 now, stay in.',
      source: 'ai',
    });
    expect(llm.requests[0]?.schema).toBe(REPLY_RESPONSE_SCHEMA);
  });
});

describe('writeReply', () => {
  it('uses the engine sentence for invented numbers, links, bad JSON, errors or no model', async () => {
    const replying = (reply: unknown) => fakeLlm({ reply: JSON.stringify({ reply }) });
    const engine = { text: 'engine', source: 'engine' };
    expect(
      await writeReply(replying('AQI is 412 now'), TURN, { facts: FACTS, engineText: 'engine' }),
    ).toEqual(engine);
    expect(
      await writeReply(replying('see https://x.test'), TURN, {
        facts: FACTS,
        engineText: 'engine',
      }),
    ).toEqual(engine);
    expect(await writeReply(replying(''), TURN, { facts: FACTS, engineText: 'engine' })).toEqual(
      engine,
    );
    expect(
      await writeReply(fakeLlm({ reply: new Error('down') }), TURN, {
        facts: FACTS,
        engineText: 'engine',
      }),
    ).toEqual(engine);
    expect(await writeReply(null, TURN, { facts: FACTS, engineText: 'engine' })).toEqual(engine);
  });
});

describe('runChat', () => {
  const llmFor = (understood: string, reply = 'Dadi should walk at 2 pm instead.') =>
    fakeLlm({
      guard: SAFE_VERDICT,
      understand: understood,
      reply: JSON.stringify({ reply }),
    });
  it('remembers, advises from the engine and saves the place', async () => {
    const deps = testDeps();
    const response = await runChat(
      { ...deps, llm: llmFor(DADI_UNDERSTOOD) },
      'u1',
      ask('Dadi has asthma and walks at 6:30 every morning. Is it ok today?'),
    );
    expect(response.source).toBe('ai');
    expect(response.memory.people[0]?.label).toBe('Dadi');
    expect(response.memory.routines[0]).toMatchObject({ activity: 'walk', time: '06:30' });
    expect(response.advice).toMatchObject({ activity: 'walk', sensitiveFor: ['Dadi'] });
    expect(response.advice?.planned.time).toBe('2026-11-23T06:00');
    expect(response.suggestions[0]).toBe("Is Dadi's walk at 6:30 am OK today?");
    const saved = await deps.store.get('u1');
    expect(saved?.place).toEqual(DELHI);
    expect(saved?.memory).toEqual(response.memory);
  });
});

describe('runChat', () => {
  const llmFor = (understood: string, reply = 'Dadi should walk at 2 pm instead.') =>
    fakeLlm({
      guard: SAFE_VERDICT,
      understand: understood,
      reply: JSON.stringify({ reply }),
    });
  it('tells the reply what was just remembered', async () => {
    const llm = llmFor(DADI_UNDERSTOOD);
    await runChat({ ...testDeps(), llm }, 'u1', ask('Dadi walks at 6:30'));
    const facts = JSON.parse(
      llm.requests
        .find((r) => r.purpose === 'reply')
        ?.prompt.split('\n')[0]
        ?.slice(7) ?? '{}',
    );
    expect(facts.newlyRemembered).toEqual(['Dadi · older adult, asthma', 'Walk · 6:30 am · Dadi']);
    expect(facts.alreadyKnown).toEqual([]);
  });
});
