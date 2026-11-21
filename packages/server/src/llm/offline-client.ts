import { EMPTY_DRAFT, type AgeGroup, type DraftMember, type ProfileDraft } from '@vayu/core';
import { extractFenced } from '../prompts/fence-untrusted.js';
import type { LlmClient, LlmRequest } from './llm-client.js';

/** Words that name a family member, and the life stage they imply. */
const MEMBER_WORDS: readonly (readonly [RegExp, string, AgeGroup])[] = [
  [/\b(grand(father|pa)|dadaji|nanaji)\b/i, 'Grandfather', 'senior'],
  [/\b(grand(mother|ma)|dadi|nani)\b/i, 'Grandmother', 'senior'],
  [/\b(father|dad|papa)\b/i, 'Father', 'adult'],
  [/\b(mother|mom|mum|mummy)\b/i, 'Mother', 'adult'],
  [/\b(baby|infant|toddler)\b/i, 'Baby', 'infant'],
  [/\b(son|daughter|kid|child)\b/i, 'Child', 'child'],
];

/** The first keyword-matched value, or null. */
const firstMatch = <T extends string>(
  text: string,
  table: readonly (readonly [T, RegExp])[],
): T | null => table.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

/** A best-effort keyword reading of a description, in the draft's shape. */
export function readDescription(text: string): ProfileDraft {
  const elderWithAsthma = /\basthma\b/i.test(text);
  const elderWalks = /\bmorning walk\b/i.test(text);
  const members = MEMBER_WORDS.filter(([pattern]) => pattern.test(text)).map(
    ([, name, ageGroup]): DraftMember => ({
      name,
      ageGroup,
      conditions: elderWithAsthma && ageGroup === 'senior' ? ['asthma'] : [],
      daytime: null,
      commuteMode: null,
      commuteKm: null,
      outdoorExercise: elderWalks && ageGroup === 'senior' ? 'light' : null,
      exerciseHour: null,
    }),
  );
  const place = /\b(?:in|at|from)\s+([A-Z][\w ]{1,40}?)(?:[,.]|$)/.exec(text);
  return {
    placeQuery: place?.[1]?.trim() ?? null,
    members,
    home: {
      ...EMPTY_DRAFT.home,
      cookingFuel: firstMatch(text, [
        ['lpg', /\b(lpg|gas cylinder)\b/i],
        ['biomass', /\b(chulha|wood|dung)\b/i],
        ['induction', /\binduction\b/i],
      ]),
      heating: firstMatch(text, [
        ['coal-or-wood', /\b(angithi|bukhari|coal)\b/i],
        ['electric', /\b(room heater|blower)\b/i],
      ]),
      hasPurifier: /\bpurifier\b/i.test(text)
        ? !/\b(no|without|don't have)\b[^.]{0,20}purifier/i.test(text)
        : null,
      indoorSources: [
        ...(/\b(incense|agarbatti|dhoop)\b/i.test(text) ? (['incense'] as const) : []),
        ...(/\bmosquito coil\b/i.test(text) ? (['mosquito-coil'] as const) : []),
      ],
    },
    lifestyle: {
      ...EMPTY_DRAFT.lifestyle,
      burnsWaste: /\bburn(s|ing)?\b[^.]{0,30}\b(leaves|garbage|waste)\b/i.test(text) ? true : null,
    },
  };
}

/** The offline answer to a question: honest about what it cannot do, and grounded. */
const OFFLINE_ANSWER = {
  onTopic: true,
  answer:
    'The AI coach is offline in this demo, so it cannot answer free questions. Your routine and chosen actions above show what to do today.',
};

/**
 * A deterministic, keyword-based stand-in used when no API key is configured —
 * in tests, CI end-to-end runs and local development. Production refuses to
 * start without a key (see config.ts), so this never answers a real family.
 * Its coach answer is deliberately empty, so the server shows its own engine
 * summary, exactly as it does when Gemini is unavailable.
 */
export function createOfflineClient(): LlmClient {
  return {
    generate(request: LlmRequest): Promise<string> {
      const responses = {
        guard: () => ({ verdict: 'safe', reason: 'Offline mode: heuristic screening only.' }),
        extract: () => readDescription(extractFenced(request.prompt)),
        coach: () => ({}),
        ask: () => OFFLINE_ANSWER,
      };
      return Promise.resolve(JSON.stringify(responses[request.purpose]()));
    },
  };
}
