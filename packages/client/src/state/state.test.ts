import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client.js';
import { EXTRACTED, PROFILE } from '../test-utils/fixtures.js';
import { readSavedSession, writeSavedSession } from './saved-session.js';
import { INITIAL_SESSION, sessionReducer } from './session.js';
import { failureMessage } from './use-air.js';
import { useRequest } from './use-request.js';

/** Storage whose every call throws, as in some private windows. */
const brokenStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('sessionReducer', () => {
  it('moves through the stages and keeps the language on start over', () => {
    const review = sessionReducer(INITIAL_SESSION, {
      type: 'extracted',
      extracted: { ...EXTRACTED, placeQuery: null },
    });
    expect(review).toMatchObject({ stage: 'review', editing: { placeQuery: '', place: null } });
    const plan = sessionReducer(review, { type: 'confirm', profile: PROFILE });
    expect(plan).toMatchObject({ stage: 'plan', chosenIds: null, editing: null });
    const chosen = sessionReducer(
      sessionReducer(plan, { type: 'choose', chosenIds: ['seal-gaps'] }),
      { type: 'language', language: 'hi' },
    );
    expect(chosen).toMatchObject({ chosenIds: ['seal-gaps'], language: 'hi' });
    expect(sessionReducer(chosen, { type: 'edit' })).toMatchObject({
      stage: 'review',
      editing: { placeQuery: 'New Delhi', assumed: [] },
    });
    expect(sessionReducer(chosen, { type: 'start-over' })).toEqual({
      ...INITIAL_SESSION,
      language: 'hi',
    });
  });

  it('ignores editing when there is no plan yet', () => {
    expect(sessionReducer(INITIAL_SESSION, { type: 'edit' })).toBe(INITIAL_SESSION);
  });
});

describe('saved session', () => {
  it('round-trips a confirmed plan and ignores anything else', () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    };
    writeSavedSession(storage, {
      ...INITIAL_SESSION,
      stage: 'plan',
      profile: PROFILE,
      chosenIds: ['seal-gaps'],
    });
    expect(readSavedSession(storage)).toMatchObject({ stage: 'plan', chosenIds: ['seal-gaps'] });
    writeSavedSession(storage, INITIAL_SESSION);
    expect(readSavedSession(storage)).toEqual(INITIAL_SESSION);
    saved.set('vayu-session-v1', '{"profile":{"members":[]}}');
    expect(readSavedSession(storage)).toEqual(INITIAL_SESSION);
    saved.set('vayu-session-v1', 'not json');
    expect(readSavedSession(storage)).toEqual(INITIAL_SESSION);
    expect(readSavedSession(undefined)).toEqual(INITIAL_SESSION);
  });

  it('survives storage that throws', () => {
    expect(readSavedSession(brokenStorage)).toEqual(INITIAL_SESSION);
    expect(() => {
      writeSavedSession(brokenStorage, { ...INITIAL_SESSION, stage: 'plan', profile: PROFILE });
    }).not.toThrow();
  });
});

describe('requests', () => {
  it('words unexpected failures safely', () => {
    expect(failureMessage(new ApiError('Server said no.'))).toBe('Server said no.');
    expect(failureMessage(new TypeError('boom'))).toContain('could not be loaded');
  });

  it('keeps only the latest answer and can be reset', async () => {
    let resolveFirst: (value: string) => void = () => undefined;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const answers = [first, Promise.resolve('second')];
    const { result } = renderHook(() =>
      useRequest(() => answers.shift() ?? Promise.reject(new Error('none'))),
    );
    act(() => {
      result.current.start();
      result.current.start();
    });
    await act(async () => {
      resolveFirst('first');
      await first;
    });
    expect(result.current.state).toEqual({ status: 'done', value: 'second' });
    act(() => {
      result.current.start();
      result.current.reset();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
