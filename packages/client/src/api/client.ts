import {
  airSnapshotSchema,
  type AirSnapshot,
  type CompletedProfile,
  type HouseholdProfile,
  type Language,
  type Place,
} from '@vayu/core';

/** A failure with a message written for people, safe to show as is. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The extractor's answer: a profile to review and where the family lives. */
export interface ExtractResponse extends CompletedProfile {
  readonly placeQuery: string | null;
}

/** The coach's explanation of a plan. */
export interface CoachResponse {
  readonly headline: string;
  readonly summary: string;
  readonly priorities: readonly { readonly actionId: string; readonly why: string }[];
  readonly source: 'ai' | 'engine';
}

/** An answer to a question about the plan. */
export interface AskResponse {
  readonly answer: string;
  readonly onTopic: boolean;
  readonly verified: boolean;
}

const FALLBACK = 'Something went wrong. Please try again.';

/** The server's error text is written for people; anything else gets a safe generic line. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Sends a request and returns the parsed body, turning any failure into an ApiError. */
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError('We could not reach Vayu Mitra. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response));
  }
  return (await response.json()) as unknown;
}

/** POSTs JSON to an API route. */
const postJson = (path: string, body: unknown): Promise<unknown> =>
  requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Reads a family's description into a profile to review. */
export async function extractProfile(description: string): Promise<ExtractResponse> {
  return (await postJson('/api/extract', { description })) as ExtractResponse;
}

/** Searches places by name. */
export async function searchPlaces(query: string): Promise<readonly Place[]> {
  const body = (await requestJson(
    `/api/places?${new URLSearchParams({ q: query }).toString()}`,
  )) as {
    places: readonly Place[];
  };
  return body.places;
}

/** The hourly forecast for a place, re-validated before the engine sees it. */
export async function fetchAir(place: Place): Promise<AirSnapshot> {
  const query = new URLSearchParams({ lat: String(place.latitude), lon: String(place.longitude) });
  const parsed = airSnapshotSchema.safeParse(await requestJson(`/api/air?${query.toString()}`));
  if (!parsed.success) {
    throw new ApiError('The air forecast came back incomplete. Please try again.');
  }
  return parsed.data;
}

/** What the coach and the question routes need to rebuild the plan on the server. */
export interface PlanContext {
  readonly profile: HouseholdProfile;
  readonly chosenIds: readonly string[];
  readonly language: Language;
}

/** Asks the coach to explain the plan. */
export async function fetchCoach(context: PlanContext): Promise<CoachResponse> {
  return (await postJson('/api/coach', context)) as CoachResponse;
}

/** Asks a question about the plan. */
export async function askQuestion(context: PlanContext, question: string): Promise<AskResponse> {
  return (await postJson('/api/ask', { ...context, question })) as AskResponse;
}
