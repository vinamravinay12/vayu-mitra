/** Tests of understand. */
import { EMPTY_MEMORY } from '@vayu/core';
import { describe, expect, it } from 'vitest';
import { formatHistory, UNDERSTAND_RESPONSE_SCHEMA } from '../prompts/build-understand-prompt.js';
import { FENCE_OPEN } from '../prompts/fence-untrusted.js';
import {
  DADI_UNDERSTOOD,
  fakeLlm,
  flatChange,
  NOTHING_UNDERSTOOD,
} from '../test-utils/fake-llm.js';
import { NOT_UNDERSTOOD, understand } from './understand.js';

/** Dadi's changes plus a nameless person (dropped) and two valid flat changes. */
const WITH_MISFITS = JSON.stringify({
  ...JSON.parse(DADI_UNDERSTOOD),
  memoryChanges: [
    ...JSON.parse(DADI_UNDERSTOOD).memoryChanges,
    flatChange({ op: 'remember-person', label: null, ageGroup: 'adult' }),
    flatChange({ op: 'remember-home', feature: 'air-purifier' }),
    flatChange({ op: 'forget', id: 'home:car' }),
  ],
});

describe('understand', () => {
  it('turns flat changes into strict ones and drops misfits', async () => {
    const result = await understand(
      fakeLlm({ understand: WITH_MISFITS }),
      { message: 'msg', history: [] },
      EMPTY_MEMORY,
    );
    expect(result.changes.map((change) => change.op)).toEqual([
      'remember-person',
      'remember-routine',
      'remember-home',
      'forget',
    ]);
    expect(result.hints).toEqual({
      activity: 'walk',
      person: 'Dadi',
      time: null,
      day: null,
      period: null,
    });
  });
});

describe('understand', () => {
  it('falls back to nothing when off, off-schema or failing', async () => {
    expect(await understand(null, { message: 'm', history: [] }, EMPTY_MEMORY)).toBe(
      NOT_UNDERSTOOD,
    );
    expect(
      await understand(
        fakeLlm({ understand: '{"x":1}' }),
        { message: 'm', history: [] },
        EMPTY_MEMORY,
      ),
    ).toBe(NOT_UNDERSTOOD);
    expect(
      await understand(
        fakeLlm({ understand: new Error('503') }),
        { message: 'm', history: [] },
        EMPTY_MEMORY,
      ),
    ).toBe(NOT_UNDERSTOOD);
  });
});

describe('understand', () => {
  it('fences the message and the history and shows remembered ids', async () => {
    const llm = fakeLlm({ understand: NOTHING_UNDERSTOOD });
    const memory = {
      ...EMPTY_MEMORY,
      home: [{ kind: 'home' as const, id: 'home:car', feature: 'car' as const }],
    };
    await understand(
      llm,
      { message: 'hello', history: [{ role: 'user', text: 'earlier' }] },
      memory,
    );
    const [request] = llm.requests;
    expect(request?.prompt).toContain('"id":"home:car"');
    expect(request?.prompt.split(FENCE_OPEN)).toHaveLength(3);
    expect(request?.schema).toBe(UNDERSTAND_RESPONSE_SCHEMA);
    expect(formatHistory([])).toBe('(none)');
  });
});
