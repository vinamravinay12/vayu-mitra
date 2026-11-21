import type { AirSnapshot } from '../schemas/air.js';
import type { HouseholdProfile, Member } from '../schemas/profile.js';

/** A winter day's PM2.5 curve: worst around 02:00, cleanest around 14:00. */
export function winterCurve(mean: number, swing = 0.45): number[] {
  return Array.from(
    { length: 24 },
    (_unused, hour) =>
      Math.round(mean * (1 + swing * Math.cos((2 * Math.PI * (hour - 2)) / 24)) * 10) / 10,
  );
}

/** A two-day snapshot for New Delhi (UTC+05:30) starting on `date`. */
export function makeSnapshot(
  date = '2026-11-21',
  todayMean = 150,
  tomorrowMean = 150,
): AirSnapshot {
  const tomorrow = new Date(`${date}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const days: [string, number][] = [
    [date, todayMean],
    [tomorrow.toISOString().slice(0, 10), tomorrowMean],
  ];
  return {
    timezone: 'Asia/Kolkata',
    utcOffsetSeconds: 19_800,
    source: 'fixture',
    fetchedAt: `${date}T04:30:00.000Z`,
    hours: days.flatMap(([day, mean]) =>
      winterCurve(mean).map((pm25, hour) => ({
        time: `${day}T${String(hour).padStart(2, '0')}:00`,
        pm25,
        pm10: Math.round(pm25 * 1.6),
      })),
    ),
  };
}

/** 10:00 IST on 21 November 2026. */
export const MORNING_IN_DELHI = new Date('2026-11-21T04:30:00Z');

/** A healthy adult who drives to the office. */
export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    name: 'Asha',
    ageGroup: 'adult',
    conditions: [],
    daytime: 'office',
    commuteMode: 'car-petrol',
    commuteKm: 12,
    outdoorExercise: 'none',
    exerciseHour: 7,
    ...overrides,
  };
}

/** A three-generation Delhi household with the classic winter habits. */
export function makeProfile(overrides: Partial<HouseholdProfile> = {}): HouseholdProfile {
  return {
    place: {
      name: 'New Delhi',
      region: 'Delhi',
      country: 'India',
      latitude: 28.61,
      longitude: 77.21,
    },
    members: [
      makeMember(),
      makeMember({
        name: 'Dadaji',
        ageGroup: 'senior',
        conditions: ['asthma'],
        daytime: 'home',
        commuteKm: 0,
        outdoorExercise: 'light',
        exerciseHour: 6,
      }),
      makeMember({
        name: 'Meera',
        ageGroup: 'child',
        daytime: 'school',
        commuteMode: 'bus',
        commuteKm: 4,
        outdoorExercise: 'vigorous',
        exerciseHour: 17,
      }),
    ],
    home: {
      tightness: 'leaky',
      ventilation: 'morning',
      hasPurifier: false,
      cookingFuel: 'lpg',
      hasKitchenExhaust: false,
      heating: 'none',
      indoorSources: ['incense'],
    },
    lifestyle: {
      workDaysPerWeek: 5,
      departHour: 8,
      burnsWaste: false,
      generatorHoursPerWeek: 0,
      transitNearby: true,
      communityHouseholds: 200,
    },
    ...overrides,
  };
}
