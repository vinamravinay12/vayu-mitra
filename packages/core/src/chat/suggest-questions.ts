/** One-tap questions, from what the family has told Vayu Mitra. */
import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { CHAT_LIMITS } from './chat-schema.js';
import { formatTime } from '../memory/describe-memory.js';
import type { Memory } from '../memory/memory-schema.js';

/** Starters for a family Vayu Mitra knows nothing about yet. */
export const STARTER_QUESTIONS: readonly string[] = [
  'Can I go for a walk this evening?',
  'When should I open the windows today?',
  'Is it OK for the kids to play outside after school?',
  'When is the air cleanest today?',
];

/**
 * Questions worth one tap: one for each remembered routine first, so a family
 * that told Vayu Mitra about Dadi's morning walk is offered "Is Dadi's walk at
 * 6:30 am OK?" every day, then general ones.
 */
export function suggestQuestions(memory: Memory): string[] {
  const fromRoutines = memory.routines.map((routine) => {
    const who = memory.people.find((person) => person.id === routine.personId)?.label;
    const name = ACTIVITY_PROFILES[routine.activity].label;
    const subject = who === undefined ? `our ${name}` : `${who}'s ${name}`;
    return routine.time === null
      ? `When is the best time for ${subject} today?`
      : `Is ${subject} at ${formatTime(routine.time)} OK today?`;
  });
  return [...new Set([...fromRoutines, ...STARTER_QUESTIONS])].slice(0, CHAT_LIMITS.suggestions);
}
