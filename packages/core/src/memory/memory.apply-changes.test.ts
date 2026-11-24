import { describe, expect, it } from 'vitest';
import { DADI, PAPA } from '../test-utils/fixtures.js';
import {
  applyChange,
  applyChanges,
  EMPTY_MEMORY,
  findPerson,
  forgetFact,
  isEmptyMemory,
  saveFact,
} from './apply-changes.js';
import { MEMORY_LIMITS } from './memory-schema.js';
import { withDadi } from './memory.fixtures.js';

describe('applyChanges', () => {
  it('remembers home features once and forgets by id', () => {
    const twice = applyChanges(EMPTY_MEMORY, [
      { op: 'remember-home', feature: 'air-purifier' },
      { op: 'remember-home', feature: 'air-purifier' },
    ]);
    expect(twice.home).toEqual([
      { kind: 'home', id: 'home:air-purifier', feature: 'air-purifier' },
    ]);
    expect(applyChange(twice, { op: 'forget', id: 'home:air-purifier' }).home).toEqual([]);
  });
  it('drops the oldest person past the limit', () => {
    const many = Array.from({ length: MEMORY_LIMITS.people + 1 }, (_unused, index) => ({
      op: 'remember-person' as const,
      label: `Person ${String(index)}`,
      ageGroup: 'adult' as const,
      conditions: [],
    }));
    const memory = applyChanges(EMPTY_MEMORY, many);
    expect(memory.people).toHaveLength(MEMORY_LIMITS.people);
    expect(memory.people[0]?.label).toBe('Person 1');
  });
});

describe('forgetFact and saveFact', () => {
  it('turns a forgotten person’s routines into family routines', () => {
    const memory = applyChange(withDadi, {
      op: 'remember-routine',
      activity: 'walk',
      person: 'Dadi',
      time: null,
      minutes: null,
    });
    const both = applyChange(
      { ...memory, people: [DADI, PAPA] },
      { op: 'remember-routine', activity: 'run', person: 'Papa', time: null, minutes: null },
    );
    expect(forgetFact(both, DADI.id).routines[1]?.personId).toBe(PAPA.id);
    const forgotten = forgetFact(memory, DADI.id);
    expect(forgotten.people).toEqual([]);
    expect(forgotten.routines[0]?.personId).toBeNull();
    expect(forgetFact(memory, 'routine:walk:dadi').routines).toEqual([]);
  });
  it('upserts an edited fact of any kind', () => {
    const edited = saveFact(withDadi, { ...DADI, conditions: [] });
    expect(edited.people).toEqual([{ ...DADI, conditions: [] }]);
    expect(
      saveFact(EMPTY_MEMORY, { kind: 'home', id: 'home:car', feature: 'car' }).home,
    ).toHaveLength(1);
  });
});

describe('forgetFact and saveFact', () => {
  it('finds people regardless of case and reports emptiness', () => {
    expect(findPerson(withDadi, 'DADI')).toBe(DADI);
    expect(isEmptyMemory(EMPTY_MEMORY)).toBe(true);
    expect(isEmptyMemory(withDadi)).toBe(false);
  });
});
