import { describe, expect, it } from 'vitest';
import { DADI, PAPA } from '../test-utils/fixtures.js';
import { formatTime, memoryChips } from './describe-memory.js';
import { memoryChangeSchema, memorySchema, type Memory } from './memory-schema.js';
import { withDadi } from './memory.fixtures.js';

/** Two people, a personal and a family routine, and one home feature. */
const HOUSEHOLD: Memory = {
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

describe('memoryChips', () => {
  it('describes people, routines and the home', () => {
    expect(memoryChips(HOUSEHOLD).map((chip) => chip.label)).toEqual([
      'Dadi · older adult, asthma',
      'Papa · adult',
      'Walk · 6:30 am · Dadi',
      'Airing the home',
      'N95 masks at home',
    ]);
  });
});

describe('memoryChips', () => {
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
