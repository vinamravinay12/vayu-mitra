import { detectInjection } from '../guard/detect-injection.js';

/**
 * Output checks for AI-written text. The engine owns every number; the model
 * only words them. So an answer is accepted only when every number in it can
 * be found in the facts it was given, it carries no links or contact details,
 * and it does not read like instructions to another AI.
 */

/** Names and units that contain digits but are not quantities. */
const DIGIT_BEARING_TERMS = /PM\s?2\.5|PM\s?10|CO[2₂]|N95|FFP2|MERV[- ]?13|µg\/m³|m³|₹/gi;

/** A number, allowing Indian and Western digit grouping and a decimal part. */
const NUMBER = /\d+(?:,\d+)*(?:\.\d+)?/g;

/** Devanagari digits ० to ९, which Hindi answers may use. */
const DEVANAGARI_DIGITS = /[०-९]/g;

/** Whole numbers this small are counts, clock hours or "10–15 minutes", always fine to say. */
const ALWAYS_ALLOWED_UP_TO = 24;

/** Links, e-mail addresses and phone-number shapes never belong in an answer. */
const CONTACT_PATTERN = /https?:\/\/|www\.|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\+\d{2}[\s-]?\d{4}/i;

/** Converts Devanagari digits to ASCII so they cannot slip past the number check. */
const asciiDigits = (text: string): string =>
  text.replace(DEVANAGARI_DIGITS, (digit) => String(digit.charCodeAt(0) - 0x0966));

/** Every number written in `text`, as a value. */
export function numbersIn(text: string): number[] {
  const cleaned = asciiDigits(text).replace(DIGIT_BEARING_TERMS, ' ');
  return [...cleaned.matchAll(NUMBER)].map((match) => Number(match[0].replace(/,/g, '')));
}

/** Canonical spellings of a value: as is, whole, and to one decimal place. */
const spellings = (value: number): string[] => [
  String(value),
  String(Math.round(value)),
  String(Math.round(value * 10) / 10),
];

/** Every number a fact object contains, in each spelling an answer may round it to. */
export function allowedNumbers(facts: unknown): Set<string> {
  return new Set(numbersIn(JSON.stringify(facts)).flatMap(spellings));
}

/** Numbers in `text` that the facts do not support. */
export function ungroundedNumbers(text: string, allowed: ReadonlySet<string>): number[] {
  return numbersIn(text).filter(
    (value) =>
      !(Number.isInteger(value) && value <= ALWAYS_ALLOWED_UP_TO) && !allowed.has(String(value)),
  );
}

/** Why an AI answer was rejected, or an empty list when it may be shown. */
export function outputViolations(texts: readonly string[], allowed: ReadonlySet<string>): string[] {
  const joined = texts.join('\n');
  const violations: string[] = [];
  if (ungroundedNumbers(joined, allowed).length > 0) {
    violations.push('ungrounded-number');
  }
  if (CONTACT_PATTERN.test(joined)) {
    violations.push('contact-or-link');
  }
  if (detectInjection(joined).length > 0) {
    violations.push('instruction-like-text');
  }
  return violations;
}
