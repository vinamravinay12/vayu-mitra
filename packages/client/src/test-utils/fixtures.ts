import type { AirSnapshot, HouseholdProfile, Member, Place } from '@vayu/core';
import type { CoachResponse, ExtractResponse } from '../api/client.js';

/** A scripted API answer. */
export interface Route {
  readonly status?: number;
  readonly body: unknown;
}

/** A fetch stand-in that answers by path (query ignored) and records every call. */
export function stubFetch(routes: Readonly<Record<string, Route>>) {
  const calls: { path: string; body: unknown }[] = [];
  const fetchStub = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const [path = url] = url.split('?');
    calls.push({ path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    const route = routes[path];
    if (route === undefined) {
      return Promise.reject(new TypeError('Failed to fetch'));
    }
    return Promise.resolve(
      new Response(JSON.stringify(route.body), {
        status: route.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };
  return Object.assign(fetchStub, { calls });
}

export const DELHI: Place = {
  name: 'New Delhi',
  region: 'Delhi',
  country: 'India',
  latitude: 28.61,
  longitude: 77.21,
};

/** Two days of a winter curve for New Delhi, starting today (IST). */
export function airSnapshot(mean = 150, source: AirSnapshot['source'] = 'open-meteo'): AirSnapshot {
  const today = new Date(Date.now() + 19_800_000).toISOString().slice(0, 10);
  const start = new Date(`${today}T00:00:00Z`).getTime();
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: 19_800,
    source,
    fetchedAt: new Date().toISOString(),
    hours: Array.from({ length: 48 }, (_unused, index) => {
      const pm25 =
        Math.round(mean * (1 + 0.45 * Math.cos((2 * Math.PI * ((index % 24) - 2)) / 24)) * 10) / 10;
      return {
        time: new Date(start + index * 3_600_000).toISOString().slice(0, 16),
        pm25,
        pm10: Math.round(pm25 * 16) / 10,
      };
    }),
  };
}

/** A grandfather with asthma who stays home and walks at dawn. */
export const GRANDFATHER: Member = {
  name: 'Dadaji',
  ageGroup: 'senior',
  conditions: ['asthma'],
  daytime: 'home',
  commuteMode: 'bus',
  commuteKm: 0,
  outdoorExercise: 'light',
  exerciseHour: 6,
};

/** An adult who drives to the office. */
export const COMMUTER: Member = {
  name: 'Asha',
  ageGroup: 'adult',
  conditions: [],
  daytime: 'office',
  commuteMode: 'car-petrol',
  commuteKm: 14,
  outdoorExercise: 'none',
  exerciseHour: 7,
};

export const PROFILE: HouseholdProfile = {
  place: DELHI,
  members: [GRANDFATHER, COMMUTER],
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

export const EXTRACTED: ExtractResponse = {
  members: PROFILE.members,
  home: PROFILE.home,
  lifestyle: PROFILE.lifestyle,
  assumed: ['home.tightness', 'members.1.commuteKm', 'lifestyle.departHour'],
  placeQuery: 'New Delhi, Delhi',
};

export const COACH: CoachResponse = {
  headline: 'AQI 323 today: keep Dadaji indoors this morning',
  summary: 'Your choices cut Dadaji’s dose sharply.',
  priorities: [{ actionId: 'bedroom-purifier', why: 'It cleans the room he sleeps in.' }],
  source: 'ai',
};

/** Routes for a whole happy journey. */
export const HAPPY_ROUTES: Readonly<Record<string, Route>> = {
  '/api/extract': { body: EXTRACTED },
  '/api/places': {
    body: { places: [DELHI, { ...DELHI, name: 'Delhi Cantonment', latitude: 28.59 }] },
  },
  '/api/air': { body: airSnapshot() },
  '/api/coach': { body: COACH },
  '/api/ask': {
    body: { answer: 'Walk after 1 pm, when the air is cleanest.', onTopic: true, verified: true },
  },
};

/** Saves a confirmed plan the way the app does. */
export function storePlan(chosenIds: readonly string[] | null = null): void {
  globalThis.localStorage.setItem(
    'vayu-session-v1',
    JSON.stringify({ profile: PROFILE, chosenIds, language: 'en' }),
  );
}
