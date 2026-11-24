/**
 * Characters that render as nothing or reorder what is shown: zero-width
 * spaces and joiners, bidirectional controls, word joiners, the byte-order
 * mark, and Unicode tag characters. They can hide instructions from a person
 * reading a message while a model still reads them, so they are removed
 * before any check or prompt sees the text.
 */
const INVISIBLE =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/gu;

/** The text without invisible and direction-control characters. */
export const stripInvisible = (text: string): string => text.replace(INVISIBLE, '');
