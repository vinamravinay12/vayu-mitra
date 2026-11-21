import type { HouseholdProfile } from '@vayu/core';
import type { LlmClient, LlmPurpose, LlmRequest } from '../llm/llm-client.js';

type Responder = string | Error | ((request: LlmRequest) => string);

/**
 * A scripted model: each purpose answers with a fixed string, a thrown error,
 * or a function of the request. Every request is recorded for assertions.
 */
export function fakeLlm(responses: Partial<Record<LlmPurpose, Responder>>): LlmClient & {
  readonly requests: LlmRequest[];
} {
  const requests: LlmRequest[] = [];
  return {
    requests,
    generate(request) {
      requests.push(request);
      const responder = responses[request.purpose];
      if (responder === undefined) {
        return Promise.reject(new Error(`No scripted response for ${request.purpose}`));
      }
      if (responder instanceof Error) {
        return Promise.reject(responder);
      }
      return Promise.resolve(typeof responder === 'function' ? responder(request) : responder);
    },
  };
}

export const SAFE_VERDICT = JSON.stringify({ verdict: 'safe', reason: 'Describes a household.' });
export const UNSAFE_VERDICT = JSON.stringify({
  verdict: 'manipulation',
  reason: 'Asks for hidden rules.',
});

/** What Gemini returned for a real Lajpat Nagar description during probing. */
export const FAMILY_EXTRACTION = JSON.stringify({
  placeQuery: 'Lajpat Nagar, Delhi',
  members: [
    {
      name: 'Father',
      ageGroup: 'senior',
      conditions: ['asthma'],
      daytime: 'home',
      commuteMode: null,
      commuteKm: null,
      outdoorExercise: 'light',
      exerciseHour: 6,
    },
    {
      name: 'You',
      ageGroup: 'adult',
      conditions: [],
      daytime: 'office',
      commuteMode: 'car-petrol',
      commuteKm: 14,
      outdoorExercise: null,
      exerciseHour: null,
    },
  ],
  home: {
    tightness: null,
    ventilation: null,
    hasPurifier: false,
    cookingFuel: 'lpg',
    hasKitchenExhaust: null,
    heating: 'coal-or-wood',
    indoorSources: ['incense'],
  },
  lifestyle: {
    workDaysPerWeek: null,
    departHour: null,
    burnsWaste: true,
    generatorHoursPerWeek: null,
    transitNearby: true,
    communityHouseholds: 120,
  },
});

/** A valid household profile in New Delhi. */
export const PROFILE: HouseholdProfile = {
  place: {
    name: 'New Delhi',
    region: 'Delhi',
    country: 'India',
    latitude: 28.61,
    longitude: 77.21,
  },
  members: [
    {
      name: 'Dadaji',
      ageGroup: 'senior',
      conditions: ['asthma'],
      daytime: 'home',
      commuteMode: 'bus',
      commuteKm: 0,
      outdoorExercise: 'light',
      exerciseHour: 6,
    },
    {
      name: 'Asha',
      ageGroup: 'adult',
      conditions: [],
      daytime: 'office',
      commuteMode: 'car-petrol',
      commuteKm: 14,
      outdoorExercise: 'none',
      exerciseHour: 7,
    },
  ],
  home: {
    tightness: 'leaky',
    ventilation: 'morning',
    hasPurifier: false,
    cookingFuel: 'lpg',
    hasKitchenExhaust: false,
    heating: 'coal-or-wood',
    indoorSources: ['incense'],
  },
  lifestyle: {
    workDaysPerWeek: 5,
    departHour: 8,
    burnsWaste: true,
    generatorHoursPerWeek: 0,
    transitNearby: true,
    communityHouseholds: 120,
  },
};

/** 10:00 IST on 21 November 2026. */
export const NOW = (): Date => new Date('2026-11-21T04:30:00Z');
