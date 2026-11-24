/** Tests of slug and applyChanges. */
import { expect, it } from 'vitest';
import { DADI } from '../test-utils/fixtures.js';
import { applyChange, applyChanges, EMPTY_MEMORY, personId, slug } from './apply-changes.js';
import { withDadi } from './memory.fixtures.js';

it('slug: makes stable keys from labels', () => {
  expect(slug('Dadi ji')).toBe('dadi-ji');
  expect(slug('  My Son! ')).toBe('my-son');
  expect(slug('दादी')).toBe('दादी');
  expect(slug('!!!')).toBe('someone');
  expect(personId('Dadi')).toBe('person:dadi');
});

it('applyChanges: remembers a person and links a routine proposed in the same turn', () => {
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

it('applyChanges: updates a routine in place and keeps what the change leaves out', () => {
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

it('applyChanges: files routines for unknown people under the family', () => {
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
