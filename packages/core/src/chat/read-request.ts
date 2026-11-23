import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { ACTIVITIES, type Activity, type Day, type Period } from '../catalog/vocabulary.js';
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

/** Words for parts of the day, English and Hinglish. */
const PERIOD_WORDS: readonly (readonly [Period, RegExp])[] = [
  ['morning', /\b(morning|subah|subha)\b/i],
  ['afternoon', /\b(afternoon|noon|dopahar|dopaher)\b/i],
  ['evening', /\b(evening|shaam|sham)\b/i],
  ['night', /\b(night|tonight|raat)\b/i],
];

/** The part of the day a message is about, or null when it does not say. */
export function detectPeriod(message: string): Period | null {
  return PERIOD_WORDS.find(([, pattern]) => pattern.test(message))?.[0] ?? null;
}

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
  readonly period: Period | null;
}

const NO_HINTS: IntentHints = { activity: null, person: null, time: null, day: null, period: null };

/** What a message asks about, resolved against memory. */
export interface ChatIntent {
  readonly activity: Activity;
  readonly people: readonly PersonFact[];
  readonly routine: RoutineFact | null;
  readonly time: string | null;
  readonly day: Day | null;
  readonly period: Period | null;
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

/**
 * The earlier question a message follows up, or null: one that only changes
 * when ("and tomorrow?"), or one about the same activity again ("but is it
 * OK to run in the morning?"). It lends its activity, day and time.
 */
function followedUp(message: string, previous: string | null): string | null {
  if (previous === null) return null;
  const activity = detectActivity(message);
  const sameActivity = activity !== null && activity === detectActivity(previous);
  return sameActivity || (activity === null && saysWhen(message)) ? previous : null;
}

/** True when a message names a day, a part of the day or a clock time. */
const saysWhen = (message: string): boolean =>
  detectDay(message) !== null || detectPeriod(message) !== null || detectTime(message) !== null;

/** What a function reads from the earlier question, or null when there is none. */
const fromEarlier = <T>(earlier: string | null, read: (text: string) => T | null): T | null =>
  earlier === null ? null : read(earlier);

/**
 * The clock time or the part of the day: a clock time asked for wins; else a
 * part of the day, from the message or the question it follows up; else the
 * earlier clock time, or the routine's usual one.
 */
function clockOrPeriod(
  message: string,
  hints: IntentHints,
  routine: RoutineFact | null,
  earlier: string | null,
): Pick<ChatIntent, 'time' | 'period'> {
  const clock = hints.time ?? detectTime(message);
  if (clock !== null) return { time: clock, period: null };
  const period = hints.period ?? detectPeriod(message) ?? fromEarlier(earlier, detectPeriod);
  if (period !== null) return { time: null, period };
  return { time: fromEarlier(earlier, detectTime) ?? routine?.time ?? null, period: null };
}

/** When, and for how long, the AI's reading first, then the message, then what it follows up. */
function timing(
  message: string,
  hints: IntentHints,
  routine: RoutineFact | null,
  earlier: string | null,
): Pick<ChatIntent, 'time' | 'day' | 'period' | 'minutes'> {
  return {
    ...clockOrPeriod(message, hints, routine, earlier),
    day: hints.day ?? detectDay(message) ?? fromEarlier(earlier, detectDay),
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
