import { ACTIVITY_PROFILES } from '../catalog/activities.js';
import { ACTIVITIES, type Activity, type Day, type Period } from '../catalog/vocabulary.js';

/** Escapes regular-expression metacharacters so a phrase matches literally. */
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the phrase appears as whole words, allowing a plural ("windows", "walks"). */
export const mentions = (text: string, phrase: string): boolean =>
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

/** A 12-hour match ("6:30 pm") as `HH:MM`; null for an hour outside 1 to 12. */
function fromTwelveHour([, hourText = '', minute = '00', meridiem = '']: RegExpExecArray):
  string | null {
  const hour = Number(hourText);
  if (hour < 1 || hour > 12) return null;
  return `${pad((hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0))}:${minute}`;
}

/** A clock time in the message, "6 am", "6:30pm", "17:45", as `HH:MM`; null if none. */
export function detectTime(message: string): string | null {
  const twelve = TWELVE_HOUR.exec(message);
  if (twelve !== null) return fromTwelveHour(twelve);
  const twentyFour = TWENTY_FOUR_HOUR.exec(message);
  return twentyFour === null ? null : `${pad(Number(twentyFour[1]))}:${String(twentyFour[2])}`;
}
