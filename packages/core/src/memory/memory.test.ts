import { describe, expect, it } from 'vitest';
import { DADI, PAPA } from '../test-utils/fixtures.js';
import {
  applyChange,
  applyChanges,
  EMPTY_MEMORY,
  findPerson,
  forgetFact,
  isEmptyMemory,
  personId,
  saveFact,
  slug,
} from './apply-changes.js';
import { formatTime, memoryChips } from './describe-memory.js';
import { MEMORY_LIMITS, memoryChangeSchema, memorySchema, type Memory } from './memory-schema.js';

const withDadi: Memory = { ...EMPTY_MEMORY, people: [DADI] };

describe('slug', () => {
  it('makes stable keys from labels', () => {
    expect(slug('Dadi ji')).toBe('dadi-ji');
    expect(slug('  My Son! ')).toBe('my-son');
    expect(slug('दादी')).toBe('दादी');
    expect(slug('!!!')).toBe('someone');
    expect(personId('Dadi')).toBe('person:dadi');
  });
});

describe('applyChanges', () => {
  it('remembers a person and links a routine proposed in the same turn', () => {
    const memory = applyChanges(EMPTY_MEMORY, [
      { op: 'remember-routine', activity: 'walk', person: 'dadi', time: '06:30', minutes: null },
      {
        op: 'remember-person',
        label: 'Dadi',
        ageGroup: 'senior',
        conditions: ['asthma', 'asthma'],
      },
    ]);
    expect(memory.people).toEqual([DADI]);
    expect(memory.routines).toEqual([
      {
        kind: 'routine',
        id: 'routine:walk:dadi',
        activity: 'walk',
        personId: 'person:dadi',
        time: '06:30',
        minutes: 30,
      },
    ]);
  });

  it('updates a routine in place and keeps what the change leaves out', () => {
    const first = applyChange(withDadi, {
      op: 'remember-routine',
      activity: 'walk',
      person: 'Dadi',
      time: '06:30',
      minutes: 45,
    });
    const second = applyChange(first, {
      op: 'remember-routine',
      activity: 'walk',
      person: 'Dadi',
      time: null,
      minutes: null,
    });
    expect(second.routines).toEqual(first.routines);
  });

  it('files routines for unknown people under the family', () => {
    const memory = applyChange(EMPTY_MEMORY, {
      op: 'remember-routine',
      activity: 'run',
      person: 'Ravi',
      time: null,
      minutes: 30,
    });
    expect(memory.routines[0]?.id).toBe('routine:run:family');
    expect(memory.routines[0]?.personId).toBeNull();
    const family = applyChange(EMPTY_MEMORY, {
      op: 'remember-routine',
      activity: 'yoga',
      person: null,
      time: '07:00',
      minutes: null,
    });
    expect(family.routines[0]?.minutes).toBe(45);
  });

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

  it('finds people regardless of case and reports emptiness', () => {
    expect(findPerson(withDadi, 'DADI')).toBe(DADI);
    expect(isEmptyMemory(EMPTY_MEMORY)).toBe(true);
    expect(isEmptyMemory(withDadi)).toBe(false);
  });
});

describe('memoryChips', () => {
  it('describes people, routines and the home', () => {
    const memory: Memory = {
      people: [DADI, PAPA],
      routines: [
        {
          kind: 'routine',
          id: 'r1',
          activity: 'walk',
          personId: DADI.id,
          time: '06:30',
          minutes: 30,
        },
        {
          kind: 'routine',
          id: 'r2',
          activity: 'open-windows',
          personId: null,
          time: null,
          minutes: 15,
        },
      ],
      home: [{ kind: 'home', id: 'home:n95-masks', feature: 'n95-masks' }],
    };
    expect(memoryChips(memory).map((chip) => chip.label)).toEqual([
      'Dadi · older adult, asthma',
      'Papa · adult',
      'Walk · 6:30 am · Dadi',
      'Airing the home',
      'N95 masks at home',
    ]);
  });

  it('formats times', () => {
    expect(formatTime('07:00')).toBe('7 am');
    expect(formatTime('18:05')).toBe('6:05 pm');
    expect(formatTime('00:30')).toBe('12:30 am');
  });
});

describe('memory schemas', () => {
  it('accept valid memory and refuse unknown vocabulary', () => {
    expect(memorySchema.safeParse(withDadi).success).toBe(true);
    expect(memoryChangeSchema.safeParse({ op: 'remember-home', feature: 'pool' }).success).toBe(
      false,
    );
    expect(
      memoryChangeSchema.safeParse({
        op: 'remember-routine',
        activity: 'walk',
        person: null,
        time: '25:00',
        minutes: null,
      }).success,
    ).toBe(false);
  });
});
