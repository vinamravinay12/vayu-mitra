import { describe, expect, it } from 'vitest';
import { makeMember } from '../test-utils/fixtures.js';
import type { MemberScenario } from '../types/scenario.js';
import {
  buildSchedule,
  commuteLegHours,
  freeDaylightHours,
  MAX_CACHED_BASE_DAYS,
  QUARTERS_PER_DAY,
} from './build-schedule.js';

const member = (overrides: Partial<MemberScenario> = {}): MemberScenario => ({
  ...makeMember(),
  exerciseIndoors: false,
  ...overrides,
});

/** Hours spent at each place across the schedule. */
const hoursAt = (schedule: readonly string[], place: string): number =>
  schedule.filter((where) => where === place).length / 4;

describe('commuteLegHours', () => {
  it('rounds trips to quarter-hours and caps long ones', () => {
    expect(commuteLegHours(member({ commuteKm: 11, commuteMode: 'car-petrol' }))).toBe(0.5);
    expect(commuteLegHours(member({ commuteKm: 1, commuteMode: 'metro' }))).toBe(0.25);
    expect(commuteLegHours(member({ commuteKm: 60, commuteMode: 'walk' }))).toBe(2);
    expect(commuteLegHours(member({ commuteKm: 0 }))).toBe(0);
    expect(commuteLegHours(member({ daytime: 'home' }))).toBe(0);
  });
});

describe('buildSchedule', () => {
  it('covers every quarter-hour of the day', () => {
    const schedule = buildSchedule(member(), 8);
    expect(schedule).toHaveLength(QUARTERS_PER_DAY);
    expect(hoursAt(schedule, 'sleep')).toBe(8);
    expect(hoursAt(schedule, 'destination')).toBe(9);
    expect(hoursAt(schedule, 'commute')).toBeCloseTo(1, 5);
  });

  it('keeps stay-at-home members at home and adds exercise', () => {
    const schedule = buildSchedule(
      member({ daytime: 'home', outdoorExercise: 'light', exerciseHour: 6 }),
      8,
    );
    expect(hoursAt(schedule, 'commute')).toBe(0);
    expect(hoursAt(schedule, 'exercise-outdoor')).toBe(1);
    expect(schedule[24]).toBe('exercise-outdoor');
  });

  it('never lets exercise overlap work, and moves it indoors when chosen', () => {
    const atWork = buildSchedule(member({ outdoorExercise: 'vigorous', exerciseHour: 12 }), 8);
    expect(hoursAt(atWork, 'exercise-outdoor')).toBe(0);
    const indoors = buildSchedule(
      member({ outdoorExercise: 'light', exerciseHour: 20, exerciseIndoors: true }),
      8,
    );
    expect(hoursAt(indoors, 'exercise-indoor')).toBe(1);
  });

  it('wraps late evening schedules past midnight', () => {
    const night = buildSchedule(member({ daytime: 'outdoors', commuteKm: 0 }), 12);
    expect(hoursAt(night, 'destination')).toBe(8);
  });
});

describe('freeDaylightHours', () => {
  it('lists daylight hours spent at home awake', () => {
    expect(freeDaylightHours(member(), 8)).toEqual([7, 18, 19, 20]);
    expect(freeDaylightHours(member({ daytime: 'home' }), 8)).toHaveLength(14);
  });
});

describe('base-day memo', () => {
  it('stays correct after it fills up and is cleared', () => {
    const expected = freeDaylightHours(member(), 8);
    const daytimes = ['office', 'school', 'outdoors'] as const;
    // Walking 1.25 km steps gives legs of exactly 0.25 h … 2 h: 8 legs × 3 places × 24 hours.
    const legs = Array.from({ length: 8 }, (_unused, step) => (step + 1) * 1.25);
    let shapes = 0;
    for (const daytime of daytimes) {
      for (const commuteKm of legs) {
        for (let departHour = 0; departHour < 24; departHour += 1) {
          freeDaylightHours(member({ daytime, commuteKm, commuteMode: 'walk' }), departHour);
          shapes += 1;
        }
      }
    }
    expect(shapes).toBeGreaterThan(2 * MAX_CACHED_BASE_DAYS);
    expect(freeDaylightHours(member(), 8)).toEqual(expected);
  });

  it('never lets one schedule change another', () => {
    const exerciser = member({ daytime: 'home', outdoorExercise: 'light', exerciseHour: 9 });
    expect(buildSchedule(exerciser, 8)[36]).toBe('exercise-outdoor');
    expect(buildSchedule(member({ daytime: 'home' }), 8)[36]).toBe('home');
  });
});
