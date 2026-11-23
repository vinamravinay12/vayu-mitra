import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { ACTIVITIES, type Activity, type Day } from '../catalog/vocabulary.js';
import type { Memory, PersonFact, RoutineFact } from '../memory/memory-schema.js';

/** Escapes regular-expression metacharacters so a phrase matches literally. */
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the phrase appears as whole words, allowing a plural ("windows", "walks"). */
const mentions = (text: string, phrase: string): boolean =>
  new RegExp(
    `(^|[^\\p{L}\\p{M}])${escape(phrase.toLowerCase())}(e?s)?($|[^\\p{L}\\p{M}])`,
    'u',
  ).test(text);

/** The activity a message is about, by its longest matching keyword; null if none. */
export function detectActivity(message: string): Activity | null {
  const text = message.toLowerCase();
  let found: { activity: Activity; length: number } | null = null;
  for (const activity of ACTIVITIES) {
    for (const keyword of ACTIVITY_PROFILES[activity].keywords) {
      if (mentions(text, keyword) && (found === null || keyword.length > found.length)) {
        found = { activity, length: keyword.length };
      }
    }
  }
  return found?.activity ?? null;
}

/** Words that put a question on a day, English and Hinglish ("kal" in a plan means tomorrow). */
const DAY_WORDS: readonly (readonly [Day, RegExp])[] = [
  ['tomorrow', /\b(tomorrow|tmrw|kal)\b/i],
  ['today', /\b(today|tonight|this (morning|afternoon|evening)|aaj)\b/i],
];

/** The day a message is about, or null when it does not say. */
export function detectDay(message: string): Day | null {
  return DAY_WORDS.find(([, pattern]) => pattern.test(message))?.[0] ?? null;
}

const TWELVE_HOUR = /\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i;
const TWENTY_FOUR_HOUR = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;

/** Two-digit zero padding for clock fields. */
const pad = (value: number): string => String(value).padStart(2, '0');

/** A clock time in the message, "6 am", "6:30pm", "17:45", as `HH:MM`; null if none. */
export function detectTime(message: string): string | null {
  const twelve = TWELVE_HOUR.exec(message);
  if (twelve !== null) {
    const [, hourText = '', minute = '00', meridiem = ''] = twelve;
    const hour = Number(hourText);
    if (hour < 1 || hour > 12) return null;
    return `${pad((hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0))}:${minute}`;
  }
  const twentyFour = TWENTY_FOUR_HOUR.exec(message);
  return twentyFour === null ? null : `${pad(Number(twentyFour[1]))}:${String(twentyFour[2])}`;
}

/** What the AI understood from the message, which takes precedence over keywords. */
export interface IntentHints {
  readonly activity: Activity | null;
  readonly person: string | null;
  readonly time: string | null;
  readonly day: Day | null;
}

const NO_HINTS: IntentHints = { activity: null, person: null, time: null, day: null };

/** What a message asks about, resolved against memory. */
export interface ChatIntent {
  readonly activity: Activity;
  readonly people: readonly PersonFact[];
  readonly routine: RoutineFact | null;
  readonly time: string | null;
  readonly day: Day | null;
  readonly minutes: number | null;
}

/**
 * Reads the question: which activity, for whom, when. A person named in the
 * message narrows it to them; otherwise a remembered routine's person, or the
 * whole household. A time in the message beats the routine's usual time. The
 * AI's reading, when there is one, beats the keyword reading: it understands
 * a question written in Devanagari, where the keywords may not.
 */
export function readIntent(
  message: string,
  memory: Memory,
  hints: IntentHints = NO_HINTS,
  previous: string | null = null,
): ChatIntent | null {
  const earlier = followedUp(message, previous);
  const activity = hints.activity ?? detectActivity(message) ?? detectActivity(earlier ?? '');
  if (activity === null) {
    return null;
  }
  const text = `${message} ${hints.person ?? ''}`.toLowerCase();
  const named = memory.people.filter((person) => mentions(text, person.label));
  const routine = findRoutine(memory.routines, activity, named);
  const owner = memory.people.filter((person) => person.id === routine?.personId);
  const people = [named, owner, memory.people].find((group) => group.length > 0) ?? [];
  return { activity, people, routine, ...timing(message, hints, routine, earlier) };
}

/** The earlier question a message follows up ("and tomorrow?" keeps its activity and time), or null. */
const followedUp = (message: string, previous: string | null): string | null =>
  previous !== null && isFollowUp(message) ? previous : null;

/** A message that only changes when, about a question already asked. */
const isFollowUp = (message: string): boolean =>
  detectActivity(message) === null && (detectDay(message) !== null || detectTime(message) !== null);

/**
 * When, and for how long: the AI's reading first, then the message, then the
 * question it follows up, then the routine's usual time.
 */
function timing(
  message: string,
  hints: IntentHints,
  routine: RoutineFact | null,
  earlier: string | null,
): Pick<ChatIntent, 'time' | 'day' | 'minutes'> {
  const fromEarlier = <T>(read: (text: string) => T | null): T | null =>
    earlier === null ? null : read(earlier);
  return {
    time: hints.time ?? detectTime(message) ?? fromEarlier(detectTime) ?? routine?.time ?? null,
    day: hints.day ?? detectDay(message) ?? fromEarlier(detectDay),
    minutes: routine?.minutes ?? null,
  };
}

/** The named person's routine for the activity; with nobody named, the first one. */
function findRoutine(
  routines: readonly RoutineFact[],
  activity: Activity,
  named: readonly PersonFact[],
): RoutineFact | null {
  const matching = routines.filter((routine) => routine.activity === activity);
  if (named.length === 0) {
    return matching[0] ?? null;
  }
  return matching.find((routine) => named.some((person) => person.id === routine.personId)) ?? null;
}
