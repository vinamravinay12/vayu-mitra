import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { AGE_LABELS, CONDITION_LABELS, HOME_FEATURE_LABELS } from '../catalog/vocabulary.js';
import { formatHour, minutesOfDay } from '../time/local-clock.js';
import type { Memory, MemoryFact, PersonFact, RoutineFact } from './memory-schema.js';

/** One remembered fact as the family sees it. */
export interface MemoryChip {
  readonly id: string;
  readonly kind: MemoryFact['kind'];
  readonly label: string;
}

/** "6:30 am", or "7 am" on the hour. */
export function formatTime(time: string): string {
  const total = minutesOfDay(time);
  const minute = total % 60;
  const hour = formatHour(Math.floor(total / 60));
  return minute === 0 ? hour : hour.replace(' ', `:${String(minute).padStart(2, '0')} `);
}

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export function describePerson(person: PersonFact): string {
  const details = [
    AGE_LABELS[person.ageGroup],
    ...person.conditions.map((c) => CONDITION_LABELS[c]),
  ];
  return `${person.label} · ${details.join(', ')}`;
}

export function describeRoutine(routine: RoutineFact, people: readonly PersonFact[]): string {
  const who = people.find((person) => person.id === routine.personId)?.label;
  const parts = [
    capitalise(ACTIVITY_PROFILES[routine.activity].label),
    routine.time === null ? null : formatTime(routine.time),
    who ?? null,
  ];
  return parts.filter((part) => part !== null).join(' · ');
}

/** Chips for everything remembered: people, then routines, then the home. */
export function memoryChips(memory: Memory): MemoryChip[] {
  return [
    ...memory.people.map((person) => ({
      id: person.id,
      kind: person.kind,
      label: describePerson(person),
    })),
    ...memory.routines.map((routine) => ({
      id: routine.id,
      kind: routine.kind,
      label: describeRoutine(routine, memory.people),
    })),
    ...memory.home.map((fact) => ({
      id: fact.id,
      kind: fact.kind,
      label: HOME_FEATURE_LABELS[fact.feature],
    })),
  ];
}
