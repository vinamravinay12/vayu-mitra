import {
  completeProfile,
  EMPTY_DRAFT,
  profileDraftSchema,
  type CompletedProfile,
} from '@vayu/core';
import { cacheKey, type TtlCache } from '../cache/ttl-cache.js';
import { judgeWithLlm, screenHeuristic } from '../guard/screen-input.js';
import { logEvent } from '../logging/log.js';
import type { LlmClient } from '../llm/llm-client.js';
import { buildExtractionRequest } from '../prompts/build-extraction-prompt.js';
import { parseJson } from '../prompts/parse-json.js';

/** What the extractor hands back: a complete profile to review, and where they live. */
export interface ExtractedProfile extends CompletedProfile {
  readonly placeQuery: string | null;
}

export type ExtractOutcome =
  { readonly status: 'ok'; readonly profile: ExtractedProfile } | { readonly status: 'rejected' };

export interface ExtractDependencies {
  readonly llm: LlmClient;
  readonly cache: TtlCache<ExtractedProfile>;
}

/** Parses the model's draft; an off-schema answer becomes an empty draft, never an error. */
function readDraft(raw: string) {
  const parsed = profileDraftSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    logEvent('WARNING', 'extraction answered off-schema; starting from an empty form');
    return EMPTY_DRAFT;
  }
  return parsed.data;
}

/**
 * Reads a family's description into a profile for them to review.
 *
 * Blatant injections are stopped by patterns before any model call. Otherwise
 * the independent LLM judge and the extractor run in parallel, so screening
 * adds no latency; the extraction is discarded if the judge objects.
 */
export async function extractProfile(
  { llm, cache }: ExtractDependencies,
  description: string,
): Promise<ExtractOutcome> {
  if (!screenHeuristic(description).safe) {
    logEvent('WARNING', 'description rejected by pattern screen');
    return { status: 'rejected' };
  }
  const key = cacheKey('extract', description);
  const hit = cache.get(key);
  if (hit !== undefined) {
    return { status: 'ok', profile: hit };
  }
  const [verdict, raw] = await Promise.all([
    judgeWithLlm(llm, description),
    llm.generate(buildExtractionRequest(description)),
  ]);
  if (!verdict.safe) {
    logEvent('WARNING', 'description rejected by LLM judge');
    return { status: 'rejected' };
  }
  const draft = readDraft(raw);
  const profile = { ...completeProfile(draft), placeQuery: draft.placeQuery };
  cache.set(key, profile);
  return { status: 'ok', profile };
}
