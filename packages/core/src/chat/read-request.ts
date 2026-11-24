/** Reading what a question asks: which activity, for whom, when, and what it follows up. */
import type { Activity, Day, Period } from '../catalog/vocabulary.js';
import type { Memory, PersonFact, RoutineFact } from '../memory/memory-schema.js';
import { detectActivity, detectDay, detectPeriod, detectTime, mentions } from './detect.js';

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
  { hints = NO_HINTS, previous = null }: ReadContext = {},
): ChatIntent | null {
  const earlier = followedUp(message, previous);
  const activity = activityOf(message, hints, earlier);
  if (activity === null) {
    return null;
  }
  const { people, routine } = whoAndRoutine(memory, activity, `${message} ${hints.person ?? ''}`);
  return { activity, people, routine, ...timing({ message, hints, routine, earlier }) };
}

/** The activity: the AI's reading, else a keyword in the message, else in the question it follows up. */
const activityOf = (message: string, hints: IntentHints, earlier: string | null): Activity | null =>
  hints.activity ?? detectActivity(message) ?? fromEarlier(earlier, detectActivity);

/** What else a message is read with: the AI's reading of it, and the question before it. */
export interface ReadContext {
  readonly hints?: IntentHints;
  readonly previous?: string | null;
}

/**
 * Who a question is for and the routine it is about: the people named, else
 * the routine's owner, else the whole household.
 */
function whoAndRoutine(
  memory: Memory,
  activity: Activity,
  text: string,
): Pick<ChatIntent, 'people' | 'routine'> {
  const named = memory.people.filter((person) => mentions(text.toLowerCase(), person.label));
  const routine = findRoutine(memory.routines, activity, named);
  const owner = memory.people.filter((person) => person.id === routine?.personId);
  const people = [named, owner, memory.people].find((group) => group.length > 0) ?? [];
  return { people, routine };
}

/** Everything the timing of a question is read from. */
interface Clues {
  readonly message: string;
  readonly hints: IntentHints;
  readonly routine: RoutineFact | null;
  readonly earlier: string | null;
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
function clockOrPeriod({
  message,
  hints,
  routine,
  earlier,
}: Clues): Pick<ChatIntent, 'time' | 'period'> {
  const clock = hints.time ?? detectTime(message);
  if (clock !== null) return { time: clock, period: null };
  const period = hints.period ?? detectPeriod(message) ?? fromEarlier(earlier, detectPeriod);
  if (period !== null) return { time: null, period };
  return { time: fromEarlier(earlier, detectTime) ?? usualTime(routine), period: null };
}

/** The routine's usual time, or null without a routine or a time. */
const usualTime = (routine: RoutineFact | null): string | null =>
  routine === null ? null : routine.time;

/** When, and for how long, the AI's reading first, then the message, then what it follows up. */
function timing(clues: Clues): Pick<ChatIntent, 'time' | 'day' | 'period' | 'minutes'> {
  const { message, hints, routine, earlier } = clues;
  return {
    ...clockOrPeriod(clues),
    day: hints.day ?? detectDay(message) ?? fromEarlier(earlier, detectDay),
    minutes: routine === null ? null : routine.minutes,
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
