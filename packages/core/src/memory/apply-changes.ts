import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import type { Activity } from '../catalog/vocabulary.js';
import {
  EMPTY_MEMORY,
  MEMORY_LIMITS,
  type Memory,
  type MemoryChange,
  type MemoryFact,
  type PersonFact,
  type RoutineFact,
} from './memory-schema.js';

/** A lower-case, hyphenated key: "Dadi ji" → "dadi-ji". */
export const slug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'someone';

/** The stable id of the person a label names. */
export const personId = (label: string): string => `person:${slug(label)}`;

/** Replaces the entry with the same id, or appends; drops the oldest past the limit. */
function upsert<T extends { readonly id: string }>(
  list: readonly T[],
  item: T,
  limit: number,
): T[] {
  const rest = list.filter((entry) => entry.id !== item.id);
  return [...rest, item].slice(-limit);
}

/** The person a label refers to, ignoring case and spacing ("dadi" finds "Dadi"). */
export function findPerson(memory: Memory, label: string): PersonFact | undefined {
  return memory.people.find((person) => person.id === personId(label));
}

/** Upserts any fact: the path chip edits take. Routines are re-keyed by activity and person. */
export function saveFact(memory: Memory, fact: MemoryFact): Memory {
  switch (fact.kind) {
    case 'person':
      return { ...memory, people: upsert(memory.people, fact, MEMORY_LIMITS.people) };
    case 'routine':
      return { ...memory, routines: upsert(memory.routines, fact, MEMORY_LIMITS.routines) };
    case 'home':
      return { ...memory, home: upsert(memory.home, fact, Number.POSITIVE_INFINITY) };
  }
}

/** Removes a fact. Forgetting a person turns their routines into family routines. */
export function forgetFact(memory: Memory, id: string): Memory {
  return {
    people: memory.people.filter((person) => person.id !== id),
    routines: memory.routines
      .filter((routine) => routine.id !== id)
      .map((routine) => (routine.personId === id ? { ...routine, personId: null } : routine)),
    home: memory.home.filter((fact) => fact.id !== id),
  };
}

/** How long an activity usually takes, when the family has not said. */
const defaultMinutes = (activity: Activity): number => ACTIVITY_PROFILES[activity].defaultMinutes;

/** The id of the remembered person a label refers to, or null. */
const ownerOf = (memory: Memory, label: string | null): string | null =>
  label === null ? null : (findPerson(memory, label)?.id ?? null);

/** The routine a change describes, keeping what it leaves out from the one it updates. */
function routineFrom(
  memory: Memory,
  change: Extract<MemoryChange, { op: 'remember-routine' }>,
): RoutineFact {
  const owner = ownerOf(memory, change.person);
  const id = `routine:${change.activity}:${owner?.replace('person:', '') ?? 'family'}`;
  const existing = memory.routines.find((routine) => routine.id === id);
  return {
    kind: 'routine',
    id,
    activity: change.activity,
    personId: owner,
    time: change.time ?? existing?.time ?? null,
    minutes: change.minutes ?? existing?.minutes ?? defaultMinutes(change.activity),
  };
}

/** Applies one change the conversation proposed. */
export function applyChange(memory: Memory, change: MemoryChange): Memory {
  switch (change.op) {
    case 'remember-person':
      return saveFact(memory, {
        kind: 'person',
        id: personId(change.label),
        label: change.label,
        ageGroup: change.ageGroup,
        conditions: [...new Set(change.conditions)],
      });
    case 'remember-routine':
      return saveFact(memory, routineFrom(memory, change));
    case 'remember-home':
      return saveFact(memory, {
        kind: 'home',
        id: `home:${change.feature}`,
        feature: change.feature,
      });
    case 'forget':
      return forgetFact(memory, change.id);
  }
}

/**
 * Applies the changes in order, people first, so a routine proposed in the
 * same turn as its person ("Dadi walks at 6") can link to them.
 */
export function applyChanges(memory: Memory, changes: readonly MemoryChange[]): Memory {
  const rank = (change: MemoryChange): number => (change.op === 'remember-person' ? 0 : 1);
  return [...changes]
    .sort((first, second) => rank(first) - rank(second))
    .reduce(applyChange, memory);
}

/** True when nothing is remembered yet. */
export const isEmptyMemory = (memory: Memory): boolean =>
  memory.people.length === 0 && memory.routines.length === 0 && memory.home.length === 0;

export { EMPTY_MEMORY };
